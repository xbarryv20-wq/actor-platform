process.on("SIGTERM", () => process.exit(0));

interface WorkerInput {
  runId: string;
  input: unknown;
  actorId: string;
  workspaceId: string;
}

interface WorkerOutput {
  succeeded: boolean;
  errorMessage: string | null;
  outputItems: unknown[];
  logs: { level: string; message: string }[];
  runId: string;
}

function execute(input: WorkerInput): WorkerOutput {
  const logs: { level: string; message: string }[] = [];
  logs.push({ level: "INFO", message: "Worker started" });

  const inputData = input.input as Record<string, unknown> | null;
  const outputItems = Array.isArray(inputData?.items)
    ? (inputData.items as unknown[])
    : [{ result: "ok", processed: true, timestamp: new Date().toISOString() }];

  logs.push({
    level: "INFO",
    message: `Generated ${String(outputItems.length)} output item(s)`,
  });

  return {
    succeeded: true,
    errorMessage: null,
    outputItems,
    logs,
    runId: input.runId,
  };
}

process.on("message", (msg: unknown) => {
  const input = msg as WorkerInput;
  try {
    const result = execute(input);
    if (process.send) process.send(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown worker error";
    if (process.send) {
      process.send({
        succeeded: false,
        errorMessage: message,
        outputItems: [],
        logs: [{ level: "ERROR", message }],
        runId: input.runId,
      });
    }
  } finally {
    process.exit(0);
  }
});
