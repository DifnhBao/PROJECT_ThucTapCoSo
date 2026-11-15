const test = require("node:test");
const assert = require("node:assert/strict");
const { canResetPassword, canDeleteUser, canManageAdmins } = require("../../src/policies/user.policy");
const { principalFromClaims, positiveId } = require("../../src/utils/authorization");

test("reset/delete permission matrix defaults to deny and forbids self actions", () => {
  for (const actorRole of ["user", "admin", "super_admin", "unknown"]) {
    const actor = { userId: 1, role: actorRole, scope: actorRole === "user" ? "user" : "admin" };
    for (const targetRole of ["user", "admin", "super_admin", "unknown"]) {
      const allowed = (actorRole === "admin" && targetRole === "user")
        || (actorRole === "super_admin" && ["user", "admin"].includes(targetRole));
      const target = { user_id: "2", role: targetRole };
      assert.equal(canResetPassword(actor, target), allowed, `${actorRole} -> ${targetRole}`);
      assert.equal(canDeleteUser(actor, target), allowed);
      assert.equal(canResetPassword(actor, { ...target, user_id: "1" }), false);
    }
  }
  assert.equal(canResetPassword({ role: "admin" }, { role: "user" }), false);
  assert.equal(canManageAdmins({ userId: 2, role: "admin", scope: "admin" }), false);
});

test("principal whitelists claims and normalizes identity; invalid IDs and scope/role pairs fail", () => {
  assert.deepEqual(principalFromClaims({ userId: "7", role: "user", scope: "user", password: "ignored", extra: 1 }), {
    userId: 7, role: "user", scope: "user", sessionId: null,
  });
  for (const userId of [undefined, null, 0, -1, 1.5, {}, true, "1oops", " 1", Number.MAX_SAFE_INTEGER + 1]) {
    assert.equal(positiveId(userId), null);
    assert.throws(() => principalFromClaims({ userId, role: "user", scope: "user" }));
  }
  for (const claims of [{ role: "admin", scope: "user" }, { role: "user", scope: "admin" }, { role: "super_admin" }]) {
    assert.throws(() => principalFromClaims({ userId: 1, ...claims }));
  }
});
