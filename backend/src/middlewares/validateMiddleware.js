import { AppError } from "./errorHandler.js";

/**
 * Validates req.body against a Zod schema and attaches parsed data to req.validatedBody.
 */
export function validateBody(schema) {
  return (req, _res, next) => {
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
      const formatted = parsed.error.issues.map((issue) => ({
        field: issue.path.join("."),
        message: issue.message,
      }));
      return next(new AppError("Validation failed", 400, formatted));
    }
    req.validatedBody = parsed.data;
    next();
  };
}
