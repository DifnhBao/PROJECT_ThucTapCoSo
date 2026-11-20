const test = require("node:test");
const assert = require("node:assert/strict");
const { User } = require("../../src/models");
const bcrypt = require("bcryptjs");
const { resetUserPassword } = require("../../src/services/user.service");

test("admin cannot reset super_admin password; neither hashing nor save is called", async (t) => {
  const save = t.mock.fn(async () => {});
  const target = { user_id: 99, role: "super_admin", username: "root-test", password: "original-hash", save };
  t.mock.method(User, "findByPk", async () => target);
  const hash = t.mock.method(bcrypt, "hash", async () => "replacement-hash");
  await assert.rejects(
    resetUserPassword(99, "NewPassword123!", { userId: 2, role: "admin", scope: "admin" }),
    (error) => error.statusCode === 403,
  );
  assert.equal(save.mock.callCount(), 0);
  assert.equal(hash.mock.callCount(), 0);
  assert.equal(target.password, "original-hash");
});
