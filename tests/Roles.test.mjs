// H-061: the administrator and the users see different applications.
import { test } from "node:test";
import assert from "node:assert/strict";
import { allowed, homeOf } from "../js/core/Roles.js";

const admin = { role: "ADMIN" };
const user = { role: "USER", plan: "FREE" };

test("the administrator does not open the screens of measuring and of a person's water", () => {
  for (const r of ["dashboard", "history", "places", "care", "devices", "intelligence/diagnosis", "billing", "profiles"]) {
    assert.equal(allowed(r, admin), false, r);
  }
  for (const r of ["admin", "ai-usage", "official", "sessions", "settings"]) assert.equal(allowed(r, admin), true, r);
  assert.equal(homeOf(admin), "admin");
});

test("a user does not open the company's screens", () => {
  for (const r of ["admin", "ai-usage"]) assert.equal(allowed(r, user), false, r);
  for (const r of ["dashboard", "history", "intelligence/usage", "places", "official", "settings"]) assert.equal(allowed(r, user), true, r);
  assert.equal(homeOf(user), "dashboard");
});
