/**
 * Wrap an async route handler so a rejected promise (including a thrown
 * HttpError) reaches errorHandler instead of crashing the process /
 * hanging the request. Express 4 doesn't do this automatically.
 */
export function asyncHandler(fn) {
  return (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
}
