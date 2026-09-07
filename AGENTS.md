<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.

<!-- END:nextjs-agent-rules -->

# Database / Drizzle ORM Rules

- Forbid using `migrate` or generating migration files (`db:generate`, `db:migrate`, `drizzle-kit generate`, `drizzle-kit migrate`).
- Always prefer `npm run db:push` (`drizzle-kit push`) to synchronize the schema directly with the database, because this project is in active development and there is no need for backwards compatibility or migration history.
