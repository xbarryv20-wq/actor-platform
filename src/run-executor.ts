import { fork, type ChildProcess } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { getPrisma } from "./config.js";
import { createLogEntry } from "./run-logs.js";
import { triggerWebhooks } from "./webhook-trigger.js";
import { emitEvent } from "./events.js";

export const EXECUTOR_BATCH_SIZE = 5;
export const EXECUTOR_TIMEOUT_MS = 300_000;

const runningChildren = new Map<string, ChildProcess>();

export function cancelRun(runId: string): boolean {
  const child = runningChildren.get(runId);
  if (child) {
    child.kill();
    runningChildren.delete(runId);
    return true;
  }
  return false;
}

const __dirname = path.dirname(fileURLToPath(import.meta.url));

interface WorkerResult {
  succeeded: boolean;
  errorMessage: string | null;
  outputItems: unknown[];
  logs: { level: string; message: string }[];
  runId: string;
}

export async function claimAndExecuteRun(
  runId: string,
  options?: { timeoutMs?: number },
): Promise<{ succeeded: boolean; errorMessage: string | null }> {
  const prisma = getPrisma();
  const timeoutMs = options?.timeoutMs ?? EXECUTOR_TIMEOUT_MS;

  const { count } = await prisma.actorRun.updateMany({
    where: { id: runId, status: "PENDING" },
    data: { status: "RUNNING", startedAt: new Date() },
  });

  if (count === 0) {
    return { succeeded: false, errorMessage: "Run not found or already claimed" };
  }

  await createLogEntry(prisma, runId, {
    level: "INFO",
    message: "Run claimed, spawning isolated worker",
  });

  const run = await prisma.actorRun.findUniqueOrThrow({
    where: { id: runId },
    select: { id: true, actorId: true, workspaceId: true, input: true },
  });

  try {
    const result = await spawnWorker(run, timeoutMs);

    if (result.succeeded) {
      const { count } = await prisma.actorRun.updateMany({
        where: { id: runId, status: "RUNNING" },
        data: { status: "SUCCEEDED", finishedAt: new Date() },
      });

      if (count === 0) {
        await createLogEntry(prisma, runId, {
          level: "WARN",
          message: "Worker completed but run status had already changed; results discarded",
        });
        return { succeeded: false, errorMessage: "Run no longer in RUNNING state" };
      }

      const dataset = await prisma.dataset.create({
        data: {
          workspaceId: run.workspaceId,
          actorRunId: run.id,
          name: `run-${run.id}-output`,
          slug: `run-${run.id}-output`,
        },
      });

      for (let i = 0; i < result.outputItems.length; i++) {
        await prisma.datasetItem.create({
          data: {
            datasetId: dataset.id,
            sequence: i,
            payload: result.outputItems[i] as object,
          },
        });
      }

      await prisma.actorRun.updateMany({
        where: { id: runId, status: "SUCCEEDED" },
        data: { output: { datasetId: dataset.id, itemsCount: result.outputItems.length } },
      });

      for (const log of result.logs) {
        await createLogEntry(prisma, runId, {
          level: log.level as "INFO" | "WARN" | "ERROR" | "DEBUG",
          message: log.message,
        });
      }

      await createLogEntry(prisma, runId, {
        level: "INFO",
        message: "Run completed successfully",
      });

      void triggerWebhooks({
        eventType: "run.succeeded",
        workspaceId: run.workspaceId,
        actorId: run.actorId,
        payload: { id: runId, status: "SUCCEEDED" },
      });

      void emitEvent(prisma, {
        workspaceId: run.workspaceId,
        actorId: run.actorId,
        runId,
        type: "RUN_SUCCEEDED",
        message: `Run ${runId.substring(0, 12)} succeeded`,
      });

      return { succeeded: true, errorMessage: null };
    }

    for (const log of result.logs) {
      await createLogEntry(prisma, runId, {
        level: log.level as "INFO" | "WARN" | "ERROR" | "DEBUG",
        message: log.message,
      });
    }

    await prisma.actorRun.updateMany({
      where: { id: runId, status: { in: ["RUNNING", "PENDING"] } },
      data: {
        status: "FAILED",
        errorMessage: result.errorMessage ?? "Worker reported failure",
        finishedAt: new Date(),
      },
    });

    await createLogEntry(prisma, runId, {
      level: "ERROR",
      message: `Run failed: ${String(result.errorMessage)}`,
      metadata: { error: result.errorMessage },
    });

    void triggerWebhooks({
      eventType: "run.failed",
      workspaceId: run.workspaceId,
      actorId: run.actorId,
      payload: { id: runId, status: "FAILED", errorMessage: result.errorMessage },
    });

    void emitEvent(prisma, {
      workspaceId: run.workspaceId,
      actorId: run.actorId,
      runId,
      type: "RUN_FAILED",
      message: `Run ${runId.substring(0, 12)} failed`,
      payload: { errorMessage: result.errorMessage },
    });

    return { succeeded: false, errorMessage: result.errorMessage };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown execution error";
    await finalizeFailure(prisma, runId, message, run.workspaceId, run.actorId);
    return { succeeded: false, errorMessage: message };
  }
}

function spawnWorker(
  run: { id: string; input: unknown; actorId: string; workspaceId: string },
  timeoutMs: number,
): Promise<WorkerResult> {
  return new Promise((resolve, reject) => {
    const workerPath = path.resolve(__dirname, "run-executor-worker.ts");
    const child = fork(workerPath, [], {
      execArgv: ["--import", "tsx"],
      stdio: ["pipe", "pipe", "pipe", "ipc"],
    });

    runningChildren.set(run.id, child);

    let settled = false;

    const timer = setTimeout(() => {
      if (settled) return;
      settled = true;
      runningChildren.delete(run.id);
      child.kill();
      reject(new Error(`Execution timed out after ${String(timeoutMs)}ms`));
    }, timeoutMs);

    child.on("message", (msg: unknown) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      runningChildren.delete(run.id);
      resolve(msg as WorkerResult);
    });

    child.on("error", (err: Error) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      runningChildren.delete(run.id);
      reject(err);
    });

    child.on("exit", (code: number | null) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      runningChildren.delete(run.id);
      reject(new Error(`Worker process exited with code ${String(code)}`));
    });

    child.send({
      runId: run.id,
      input: run.input,
      actorId: run.actorId,
      workspaceId: run.workspaceId,
    });
  });
}

async function finalizeFailure(
  prisma: ReturnType<typeof getPrisma>,
  runId: string,
  message: string,
  workspaceId: string,
  actorId: string,
): Promise<void> {
  try {
    await prisma.actorRun.updateMany({
      where: { id: runId, status: { in: ["RUNNING", "PENDING"] } },
      data: { status: "FAILED", errorMessage: message, finishedAt: new Date() },
    });

    await createLogEntry(prisma, runId, {
      level: "ERROR",
      message: `Run failed: ${message}`,
      metadata: { error: message },
    });

    void triggerWebhooks({
      eventType: "run.failed",
      workspaceId,
      actorId,
      payload: { id: runId, status: "FAILED", errorMessage: message },
    });

    void emitEvent(prisma, {
      workspaceId,
      actorId,
      runId,
      type: "RUN_FAILED",
      message: `Run ${runId.substring(0, 12)} failed`,
      payload: { errorMessage: message },
    });
  } catch {
    console.error(`[run-executor] Failed to finalize run ${runId}:`, message);
  }
}
