import { Request, Response, NextFunction } from "express";
import { ZodError } from "zod";

export const errorHandler = (
  err: Error,
  req: Request,
  res: Response,
  _next: NextFunction
) => {
  console.error(err.stack);

  if (err instanceof ZodError) {
    return res.status(400).json({
      message: "Validation error",
      errors: err.errors.map((e) => ({ path: e.path.join("."), message: e.message })),
    });
  }

  const status = (err as any).status || 500;
  res.status(status).json({
    message: err.message || "Internal server error",
  });
};

export class AppError extends Error {
  constructor(public message: string, public status: number = 400) {
    super(message);
  }
}
