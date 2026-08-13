/**
 * `router.post('/x', validate(schema), handler)` — parses+validates req.body
 * against a zod schema, replacing req.body with the parsed (typed) result.
 */
export function validate(schema) {
  return validateSource(schema, 'body');
}

/**
 * Same idea, but for query-string params: `validateQuery(schema)` replaces
 * req.query with the parsed result (e.g. coercing "2026" -> 2026).
 */
export function validateQuery(schema) {
  return validateSource(schema, 'query');
}

function validateSource(schema, source) {
  return (req, res, next) => {
    const result = schema.safeParse(req[source]);
    if (!result.success) {
      return res.status(400).json({
        error: 'Validation failed',
        details: result.error.flatten(),
      });
    }
    req[source] = result.data;
    next();
  };
}
