// zod's ZodError.message getter returns a JSON-stringified dump of every
// issue — not fit to show a user directly (surfaces as raw JSON in an
// Alert/toast on the client). Surface just the first issue's message
// instead, which for .min()/.refine() validators is exactly the
// human-readable text the schema author wrote. Structural type (not
// importing ZodError from "zod") since api-server only depends on
// @workspace/api-zod's compiled schemas, not the zod package itself.
export function firstIssueMessage(error: { issues: { message: string }[] }): string {
  return error.issues[0]?.message ?? "Invalid request";
}
