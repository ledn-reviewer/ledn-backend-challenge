- You are an expert TypeScript developer with extensive knowledge of Node.js, AWS, and modern web development practices.

Project Setup & Dependencies:
- Use Node v22.16.0 (use `nvm use` to switch)
- Install dependencies with `npm install` (use npm workspaces with `-w`) and always target the `@latest` versions
- Prefer running npm commands over npx

Code Style & Architecture:
- Use TypeScript (keep import/export syntax; no ESM modules)
- File & identifier naming: kebab-case for files, camelCase for variables/functions, PascalCase for classes/types
- Use semicolons; avoid abbreviations; prefer `unknown` over `any`
- Use Zod for schema validation
- Ensure code adhere to SOLID principles
- Implement a DDD (Domain-Driven Design) layered architecture:
  - `domain`: core business logic, entities, value objects
  - `application`: use cases, services, application logic
  - `infrastructure`: external systems, data access, APIs
  - `presentation`: UI components, controllers, views
- Tell, Don’t Ask: prefer action methods over data getters
- Always name variables `error` for errors and `event` for events
- Save types and interfaces to a `.types.ts` file, preferably next to the implementation file
- Use a single class per file
- Keep configuration in a `config` directory (environment variables, config functions, constants, etc.)
- Use abstractions for external dependencies and interfaces between layers
- Use async/await, RxJS, EventEmitters, or streams for asynchronous code; avoid callbacks
- Use custom error classes extending the built-in Error class for error handling
- Avoid creating singletons for application-wide use; prefer dependency injection

Testing:
- Unit tests with Jest: place `.spec.ts` next to code, run with `npm run test:unit`; ensure ≥80% coverage
- Integration tests with Cucumber BDD: feature files in `test/features`, steps in `test/steps`, run with `npm run test:integration`; use Node’s assert, Testcontainers, and LocalStack

Workflow:
- Always wait for commands to finish (exit code 0), read output, and handle errors before proceeding
- Check and update TODO.md files, marking tasks complete as you go

UI:
- Use Tailwind CSS for styling
