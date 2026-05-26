// Centralized check for "should this server-side path serve mocked data?"
//
// Two ways to opt in:
//   1. Explicit: PN_MOCK_DATA=1 in the environment.
//   2. Implicit: no DATABASE_URL configured. Lets a fresh clone boot
//      without any env setup at all — handy for new collaborators and for
//      our own headless smoke tests.
//
// Anything but "1" (or "true") for PN_MOCK_DATA falls back to whatever
// DATABASE_URL says: present → real DB, absent → mocks.
//
// Read lazily inside each call site rather than cached at module init —
// Next dev mode re-uses the same Node process across env-file edits, so
// caching the answer would surprise the first reload after toggling.

export const isMockMode = (): boolean => {
  const explicit = process.env.PN_MOCK_DATA?.toLowerCase();
  if (explicit === "1" || explicit === "true") return true;
  if (explicit === "0" || explicit === "false") return false;
  return !process.env.DATABASE_URL;
};
