export class AppError extends Error {
  readonly status: number;
  readonly code?: string;

  constructor(message: string, status: number, code?: string) {
    super(message);
    this.name = "AppError";
    this.status = status;
    this.code = code;
  }
}

export function databaseErrorMessage(error: unknown) {
  const message = error instanceof Error ? error.message : "";
  if (
    message.includes("ECONNREFUSED") ||
    message.includes("DATABASE_URL") ||
    message.includes("does not exist") ||
    message.includes("relation") ||
    message.includes("connect")
  ) {
    return "The database is not ready. Start Postgres, then run npm run db:setup.";
  }
  return null;
}
