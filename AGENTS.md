# CarbonNode Contributor + Agent Guide

This file defines contribution expectations for humans and AI agents working in this repo.

## Structural Goal

CarbonNode should have one consistent, typeable, JSON-serializable SQL expression grammar across:

- `SELECT`
- `WHERE`
- `HAVING`
- `ORDER`
- expression-capable `UPDATE` / `INSERT` values

Core principle: **one expression serializer, reused everywhere**.

## Canonical Expression Grammar (6.1.0+)

Use these forms only:

1. Known function call: `[C6C.<KNOWN_FN>, ...args]`
2. Custom function: `[C6C.CALL, 'FUNCTION_NAME', ...args]`
3. Alias wrapper: `[C6C.AS, expr, 'alias']`
4. Distinct wrapper: `[C6C.DISTINCT, expr]`
5. Literal wrapper: `[C6C.LIT, value]` (bound param, never raw inline)
6. ORDER term: `[expression, 'ASC' | 'DESC']`

Rules:

- Bare strings are references only (for example `table.column` or valid aliases).
- Non-reference strings must be wrapped with `C6C.LIT`.
- `AS` and `DISTINCT` are wrappers, not positional tokens.
- `PAGINATION.ORDER` must be an array of terms, not an object map.

## Removed Legacy Syntax (Must Throw)

Do not reintroduce compatibility for these removed forms:

- `[fn, ..., C6C.AS, alias]`
- `[column, C6C.AS, alias]`
- object-rooted function calls like `{ [C6C.COUNT]: [...] }`
- implicit string literals in function args
- legacy `ORDER` object form like `{ [States.NAME]: C6C.ASC }`

## Why This Design

- Uniform grammar lowers cognitive load across builders.
- Tuple payloads stay JSON-serializable for transport/debugging.
- Wrapper-based modifiers (`AS`, `DISTINCT`, `LIT`) avoid positional ambiguity.
- Explicit literals improve safety and prevent reference-vs-literal mistakes.
- Array-based `ORDER` supports expression ordering and deterministic multi-term ordering.

## Files You Usually Need to Touch for Grammar Changes

- `src/constants/C6Constants.ts`
- `src/types/mysqlTypes.ts`
- `src/types/ormInterfaces.ts`
- `src/orm/queryHelpers.ts`
- `src/orm/builders/ExpressionSerializer.ts`
- `src/orm/builders/AggregateBuilder.ts`
- `src/orm/builders/ConditionBuilder.ts`
- `src/orm/builders/PaginationBuilder.ts`
- `src/orm/queries/SelectQueryBuilder.ts`
- `src/orm/queries/UpdateQueryBuilder.ts`
- `src/orm/queries/PostQueryBuilder.ts`
- `README.md`
- tests in `src/__tests__/`

If changing generated test behavior, update templates in:

- `scripts/assets/handlebars/`

not only generated outputs under `src/__tests__/sakila-db/`.

## Type Safety Expectations

- Keep `C6Constants` literal-typed (`as const`) so helper APIs infer correctly.
- Prefer strong tuple types over `any` for expression APIs.
- Keep helper builders (`fn`, `call`, `alias`, `distinct`, `lit`, `order`) aligned with canonical grammar.

## SQL/Runtime Safety Expectations

- Literals are parameters (`?` or named params), not string concatenation.
- Unknown/unsafe expression shapes should fail fast with explicit errors.
- Do not add "safe raw SQL string" bypass paths as a grammar alternative.

## Testing + Validation (Required)

- Add tests for behavior changes.
- Expand nearby coverage when practical.
- Run `npm test` before commit. It must pass.
- `npm test` includes build + binding generation; treat that as the release gate.

Recommended focus areas for grammar work:

- `src/__tests__/sqlBuilders.test.ts`
- `src/__tests__/sqlBuilders.complex.test.ts`
- `src/__tests__/sqlBuilders.expressions.test.ts`

## Versioning

- Use [semver.org](https://semver.org/) rules for `package.json`.
- If team explicitly chooses a different bump strategy for a breaking change, document it in PR notes and README migration sections.

## Environment / Boot

In AI environments that allow it (Codex/localhost), this is generally configured on boot already.
No need to re-run setup unless asked.

```bash
#!/usr/bin/env bash
set -euo pipefail
export DEBIAN_FRONTEND=noninteractive

# 1. Install the minimal binaries
apt-get update -qq
apt-get install -yqq --no-install-recommends \
        mysql-server-core-8.0 mysql-client-core-8.0 passwd

# 2. Ensure the mysql system account exists
if ! id -u mysql >/dev/null 2>&1; then
  groupadd --system mysql
  useradd  --system --gid mysql --home /nonexistent \
           --shell /usr/sbin/nologin mysql
fi

# 3. Data directories and secure-file-priv directory
mkdir -p /var/lib/mysql /var/lib/mysql-files /var/run/mysqld
chown -R mysql:mysql /var/lib/mysql /var/lib/mysql-files /var/run/mysqld
chmod 750 /var/lib/mysql-files

# 4. Initialize and start detached
mysqld --initialize-insecure --user=root
mysqld --daemonize --user=root \
       --socket=/var/run/mysqld/mysqld.sock \
       --pid-file=/var/run/mysqld/mysqld.pid

# 5. Wait until server is ready
until mysqladmin --socket=/var/run/mysqld/mysqld.sock ping --silent; do sleep 1; done

# Optional sanity checks
ps -fp "$(cat /var/run/mysqld/mysqld.pid)"
mysqladmin --socket=/var/run/mysqld/mysqld.sock ping
mysqladmin --socket=/var/run/mysqld/mysqld.sock version

# Install sakila test DB
wget https://downloads.mysql.com/docs/sakila-db.zip
unzip sakila-db.zip
mysql -u root < sakila-db/sakila-schema.sql
mysql -u root < sakila-db/sakila-data.sql

# Node
wget -qO- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.3/install.sh | bash
export NVM_DIR="$([ -z "${XDG_CONFIG_HOME-}" ] && printf %s "${HOME}/.nvm" || printf %s "${XDG_CONFIG_HOME}/nvm")"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh" || true
nvm install
nvm use
npm install
npm run c6
```
