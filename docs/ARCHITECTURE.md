# Architecture

Mathify runs as one Next.js application. A screen calls a browser client, the matching route handler parses the HTTP request, and a service coordinates storage and AI. For example, a probe answer travels from `WorkspaceScreen` through `client/workspace.ts` and `app/api/probes/answer/route.ts` to `server/workspace/probes.ts`. The service updates the workspace under the store lock and returns the public probe projection.

| Change | Start here |
| --- | --- |
| Student intake, draft recovery, drawing, probe UX | `src/components/workspace/`, `intake/` and `whiteboard/` under `src/components/` |
| Tutor handoff and feedback UI | `src/components/brief/` |
| Session tracking and learner profile UI | `src/components/sessions/` and `src/components/profile/` |
| A reusable visual component | `src/components/shared/` |
| URLs, redirects, layout and HTTP handlers | `src/app/` |
| Browser requests and pilot events | `src/client/` |
| Payloads shared by browser and server | `src/contracts/` by subject |
| Request and model-output validation | `src/schemas/` |
| Workflow decisions and calculations | `src/server/workspace/`, `brief/`, `sessions/` or `profile/` |
| Provider calls, prompts, model selection | `src/server/ai/` |
| Store interfaces, construction and local persistence | `src/server/storage/` |

## Boundaries that matter

- A route owns HTTP parsing, status codes and response headers. A service owns state transitions. Keep probe advancement and brief scoring callable without React, Next.js or a live model.
- Workspace owns probing, analysis and the report snapshot used to identify tutor feedback. Brief generation builds on workspace. Storage and AI adapters can import the persisted workspace schema. ESLint blocks them from importing feature workflows and blocks HTTP handlers from importing the persisted schema.
- The workspace response selects the public analysis fields and the current probe. Answer keys, unserved probes and generation claims stay on the server during probing. The response passes through the demo profile, asset metadata, probe options, breakdown steps and completed brief. Type checking verifies that each of those shapes matches its public contract, including nested fields. The completed brief includes scored answers.
- Services accept the `Stores` interfaces. The storage factory owns the filesystem adapters. Keep AI requests outside the serialized workspace update and recheck the workspace and operation identities before applying a result. This protects a new question from a late answer for its predecessor.
- IndexedDB belongs to the student workspace. Its autosave hook serializes draft writes and waits for a pending save before deleting a completed draft. Make changes to the local draft format alongside the recovery tests.
- ESLint resolves aliases, relative imports, re-exports and literal dynamic imports. Screens depend on browser clients and contracts. HTTP handlers call services. Filesystem access belongs to storage adapters, and Anthropic SDK calls belong to the AI adapter. Next.js also rejects a client build that reaches either server factory.
- The architecture tests lint permitted imports and check the specific ESLint rule for each forbidden import. Pull requests run lint, type checking, unit tests and Chromium journeys against a fresh production build.

## Verification

Run `npm test` for service, schema, persistence and component changes. Run `npm run test:e2e` for changes that span a page, its API or recovery flow. The browser suite uses its own mock server and temporary data.
