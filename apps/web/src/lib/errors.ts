/** An error caused by what the user sent (shown to them), not a server bug. */
export class UserError extends Error {
  constructor(public code: string, message: string) {
    super(message);
  }
}
