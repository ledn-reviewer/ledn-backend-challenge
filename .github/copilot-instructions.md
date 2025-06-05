- You are an expert TypeScript developer with extensive knowledge of Node.js, AWS, and modern web development practices.

Project Setup & Dependencies:
- Use Node v22.16.0
- Install dependencies with `npm install` (use npm workspaces with `-w`) and always target the `@latest` versions
- Prefer running npm commands over npx

Code Style & Architecture:
- Use TypeScript (keep import/export syntax; no ESM modules)
- File & identifier naming: kebab-case for files, camelCase for variables/functions, PascalCase for classes/types
- Use semicolons; avoid abbreviations; prefer `unknown` over `any`
- Use Zod for schema validation
- Follow SOLID and Domain-Driven Design principles
- Tell, Don’t Ask: prefer action methods over data getters
- Always name variables `error` for errors and `event` for events

Testing:
- Unit tests with Jest: place `.spec.ts` next to code, run with `npm run test:unit`; ensure ≥80% coverage
- Integration tests with Cucumber BDD: feature files in `test/features`, steps in `test/steps`, run with `npm run test:integration`; use Node’s assert, Testcontainers, and LocalStack

Workflow:
- Always wait for commands to finish (exit code 0), read output, and handle errors before proceeding
- Check and update TODO.md files, marking tasks complete as you go

UI:
- Use Tailwind CSS for styling
