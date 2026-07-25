import Ajv from "ajv";
import addFormats from "ajv-formats";

const ajv = new Ajv({ allErrors: true });
addFormats(ajv);

const validatorCache = new Map<string, ReturnType<typeof ajv.compile>>();

export function validateInput(
  input: unknown,
  schema: Record<string, unknown>,
): { valid: true } | { valid: false; errors: string[] } {
  const key = JSON.stringify(schema);
  let validate = validatorCache.get(key);
  if (!validate) {
    validate = ajv.compile(schema);
    validatorCache.set(key, validate);
  }
  const valid = validate(input);
  if (valid) return { valid: true };
  return {
    valid: false,
    errors: validate.errors?.map((e) => {
      const path = e.instancePath ? `${e.instancePath}: ` : "";
      return `${path}${e.message ?? "invalid"}`;
    }) ?? ["Input does not match schema"],
  };
}

export function clearSchemaCache(): void {
  validatorCache.clear();
}
