#!/bin/sh
set -eu
for name in "$MYSQL_USER" "$MYSQL_DATABASE" "$MIGRATION_DB_USER"; do
  case "$name" in ''|*[!a-zA-Z0-9_]*) echo 'Invalid database identifier' >&2; exit 1;; esac
done
[ "$MYSQL_USER" != root ] && [ "$MIGRATION_DB_USER" != root ] && [ "$MYSQL_USER" != "$MIGRATION_DB_USER" ]
[ -n "$MIGRATION_DB_PASS" ]
# NO_BACKSLASH_ESCAPES + doubled quotes safely preserve literal passwords.
migration_password=$(printf '%s' "$MIGRATION_DB_PASS" | sed "s/'/''/g")
MYSQL_PWD="$MYSQL_ROOT_PASSWORD" mysql --protocol=socket -uroot <<SQL
SET SESSION sql_mode='NO_BACKSLASH_ESCAPES';
REVOKE ALL PRIVILEGES, GRANT OPTION FROM '${MYSQL_USER}'@'%';
GRANT SELECT, INSERT, UPDATE, DELETE ON \`${MYSQL_DATABASE}\`.* TO '${MYSQL_USER}'@'%';
CREATE USER '${MIGRATION_DB_USER}'@'%' IDENTIFIED BY '${migration_password}';
GRANT ALL PRIVILEGES ON \`${MYSQL_DATABASE}\`.* TO '${MIGRATION_DB_USER}'@'%';
SQL
