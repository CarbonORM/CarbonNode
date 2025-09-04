# Project Guidelines

This repository uses generated sources for parts of the ORM API and follows strict coding/testing practices.
Please review these rules before contributing.

## 1. Generated files (do not hand-edit)

- `C6.ts` and `C6.test.ts` are generated from Handlebars templates located at:
    - `scripts/assets/handlebars/C6.ts.handlebars`
    - `scripts/assets/handlebars/C6.test.ts.handlebars`
- These files are produced by our generation script and may appear in generated output folders (for example, `src/__tests__/sakila-db/` for test fixtures).
  Do not modify the generated outputs directly. Instead, update the templates or generation logic.
- To regenerate:
  ```bash
  npm run c6   # alias of: npm run generateRestBindings
  ```
  The script reads templates in `scripts/assets/handlebars/` and writes the generated bindings.

## 2. Testing and coverage

- We are working toward 100% code test coverage. All changes should include tests that fully cover the new or modified code paths.
- Run the test suite with:
  ```bash
  npm test
  ```
- If adding features or fixing bugs, include unit tests (and integration tests when appropriate) to keep coverage at or trending to 100%.

## 3. Development workflow

- Branches
    - Protected: `www`, `stage`, `preprod`, `richard`.
    - Create feature branches as `feature/<topic>` or fixes as `fix/<issue>`.
- Commits
    - Follow Conventional Commits (e.g., `feat:`, `fix:`, `refactor:`, `test:`).
    - Keep messages concise and descriptive.
- Pull Requests
    - Target the correct environment branch.
    - Keep PRs small and focused.
    - Include or update tests.

## 4. Coding standards

- Language: TypeScript with `strict` enabled.
- Linting/Formatting: ESLint + Prettier.
  ```bash
  npm run lint
  npm run format
  ```
- Testing: Vitest.
- Imports: prefer absolute imports from `src/` where practical.
- Types: avoid `any` unless unavoidable and justified; prefer explicit `interface`/`type` aliases.

## 5. API and ORM rules

- All database access should use CarbonORM (C6) through the builder or REST JSON.
- Avoid raw SQL except for diagnostics or one-off investigations.
- Route handlers are expected to return `void` (send responses via `res.json`, `res.send`, etc.).
- Use `RequestQueryBody<Method, Model>` for request typing.
- Add new routes under `server/routes/` with one file per resource.

## 6. CI/CD

- Every PR runs the TypeScript build, lint, and full test suite.

## 7. Documentation

- Document new ORM operators or query patterns with examples.
- Update this guidelines document when practices change.

