# find-your-next-home backend

Express 5 + Prisma 7 (PostgreSQL) + Zod 4, in TypeScript. Feature modules live in `src/app/modules/<name>/` as 7 files (constant, controller, interface, route, service, utils, validation). Build new modules with the `create-module` skill.

## Auto-push when a module is complete

Whenever a backend module is finished (new or changed), commit and push it to `main` without asking. This applies whether or not the `create-module` skill was used. A module counts as finished when its files are written, its routes are in `src/app.ts`, and `npx tsc --noEmit -p .` passes. Never push code that fails the type check.

1. Stage only that module's folder, `src/app.ts`, and `src/generated/prisma` if you regenerated it. Leave other uncommitted changes alone and mention them to the user.
2. **This repo is public.** Never stage `.env` or `.env.*` with real values; `.env.example` holds placeholders only. Before pushing, scan `git diff origin/main HEAD` for keys, passwords or connection strings, and stop if you find any.
3. Commit message: `<name> module done`.
4. Run `git push origin main`. If the push is rejected, run `git pull --rebase` and push again. Never force-push.
5. Tell the user the commit hash and what was pushed.

## Commands

- Dev server: `npm run dev`
- Type check: `npx tsc --noEmit -p .`
- Lint: `npx @biomejs/biome lint ./src` (the `query.sortBy!` warnings are the house style)
- Don't run migrations unless the user asks.
