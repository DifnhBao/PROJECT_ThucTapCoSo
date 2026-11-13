const { positiveId } = require("../utils/authorization");

const isAdmin = (actor) => positiveId(actor?.userId) !== null && actor.scope === "admin"
  && ["admin", "super_admin"].includes(actor.role);
const canManageAdmins = (actor) => isAdmin(actor) && actor.role === "super_admin";

function canResetPassword(actor, target) {
  if (!isAdmin(actor) || positiveId(target?.user_id) === null
    || positiveId(actor.userId) === positiveId(target.user_id)) return false;
  return target.role === "user" || (canManageAdmins(actor) && target.role === "admin");
}

const canDeleteUser = canResetPassword;
const canUpdateUserProfile = (actor, target) => isAdmin(actor) && target?.role === "user";

module.exports = { isAdmin, canManageAdmins, canResetPassword, canDeleteUser, canUpdateUserProfile };
