// URL-building helpers for the client-side food API calls. Kept in its
// own module so both the persistence middleware (restoreCurrentFood) and
// the back-compat fetchers in `preferences-hooks.ts` stay aligned — in
// particular on the "no trailing `?` when there are no expressionIds"
// rule, which empty query strings sometimes break in CDN/analytics layers.

/** Serializes a list of expressionIds to `expressionId=...&expressionId=...`
 *  query-string form. Returns an empty string for an empty input. */
export const buildExpressionIdQuery = (expressionIds: readonly string[]): string =>
  expressionIds
    .filter((id) => typeof id === "string" && id.trim().length > 0)
    .map((id) => `expressionId=${encodeURIComponent(id)}`)
    .join("&");

/** Appends `?${expressionIdQuery}` to `path` only when there is at least
 *  one expressionId to send. Otherwise returns `path` unchanged. */
export const withExpressionIds = (path: string, expressionIds: readonly string[]): string => {
  const qs = buildExpressionIdQuery(expressionIds);
  return qs.length > 0 ? `${path}?${qs}` : path;
};
