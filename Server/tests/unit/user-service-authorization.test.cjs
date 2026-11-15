require("../helpers/mock-session-boundary.cjs");
const test = require("node:test");
const assert = require("node:assert/strict");
const { User } = require("../../src/models");
const bcrypt = require("bcryptjs");
const service = require("../../src/services/user.service");
const actor = (role, userId = 1) => ({ userId, role, scope: "admin" });

test("forbidden reset cases never hash/save, including self with string target ID", async (t) => {
  const save = t.mock.fn(async () => {});
  const hash = t.mock.method(bcrypt, "hash", async () => "hash");
  for (const [requester, target] of [
    [actor("admin"), { user_id: 2, role: "admin" }],
    [actor("super_admin"), { user_id: 2, role: "super_admin" }],
    [actor("admin"), { user_id: "1", role: "admin" }],
    [actor("super_admin"), { user_id: "1", role: "super_admin" }],
  ]) {
    const lookup = t.mock.method(User, "findByPk", async () => ({ ...target, save }));
    await assert.rejects(service.resetUserPassword(String(target.user_id), "NewPassword123!", requester), { statusCode: 403 });
    lookup.mock.restore();
  }
  assert.equal(save.mock.callCount(), 0);
  assert.equal(hash.mock.callCount(), 0);
});

test("allowed reset paths persist a hash exactly once", async (t) => {
  t.mock.method(bcrypt, "genSalt", async () => "salt");
  t.mock.method(bcrypt, "hash", async () => "new-hash");
  for (const [role, targetRole] of [["admin", "user"], ["super_admin", "user"], ["super_admin", "admin"]]) {
    const target = { user_id: 2, role: targetRole, username: "fixture", password: "old", save: t.mock.fn(async () => {}) };
    const lookup = t.mock.method(User, "findByPk", async () => target);
    await service.resetUserPassword("2", "NewPassword123!", actor(role));
    assert.equal(target.save.mock.callCount(), 1);
    assert.equal(target.password, "new-hash");
    lookup.mock.restore();
  }
});

test("self-service password change requires the old password and never writes on mismatch", async (t) => {
  const target = { password: "old-hash", save: t.mock.fn(async () => {}) };
  t.mock.method(User, "findByPk", async () => target);
  const compare = t.mock.method(bcrypt, "compare", async () => false);
  await assert.rejects(service.changeUserPassword(1, "wrong", "NewPassword123!"), { statusCode: 403 });
  assert.equal(target.save.mock.callCount(), 0);
  compare.mock.mockImplementation(async () => true);
  t.mock.method(bcrypt, "genSalt", async () => "salt");
  t.mock.method(bcrypt, "hash", async () => "new-hash");
  await service.changeUserPassword(1, "current-password", "NewPassword123!");
  assert.equal(target.save.mock.callCount(), 1);
});

test("delete and create-admin reject unauthorized principals without writes", async (t) => {
  const destroy = t.mock.fn(async () => {});
  t.mock.method(User, "findByPk", async () => ({ user_id: 2, role: "super_admin", destroy }));
  await assert.rejects(service.deleteUserById("2", actor("admin")), { statusCode: 403 });
  await assert.rejects(service.deleteUserById("1", actor("super_admin")), { statusCode: 403 });
  const create = t.mock.method(User, "create", async () => ({}));
  await assert.rejects(service.createAdminAccount({}, actor("admin")), { statusCode: 403 });
  assert.equal(create.mock.callCount(), 0);
  assert.equal(destroy.mock.callCount(), 0);
});
