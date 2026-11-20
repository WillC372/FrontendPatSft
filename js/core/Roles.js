// The two kinds of account see different applications on the same platform, like students and teachers:
// a user measures and looks after their water; the administrator works for the company that runs the platform
// (accounts, plans, payments, AI usage, official data, sessions) and does not measure water in any way.
// Pure, for the tests.

/** Screens of a person's water: measuring, history, places, care, analyses and their plan. */
export const USER_ONLY = new Set(["dashboard", "history", "intelligence", "devices", "profiles", "places", "care", "billing"]);
/** Screens of the company's work. */
export const ADMIN_ONLY = new Set(["admin", "ai-usage"]);

export const isAdmin = (user) => user?.role === "ADMIN";

/** Whether this account can open the screen (a route like "intelligence/library" counts by its first part). */
export function allowed(route, user) {
  const name = String(route || "").split(/[/?]/)[0];
  return isAdmin(user) ? !USER_ONLY.has(name) : !ADMIN_ONLY.has(name);
}

/** Where this account starts. */
export const homeOf = (user) => (isAdmin(user) ? "admin" : "dashboard");
