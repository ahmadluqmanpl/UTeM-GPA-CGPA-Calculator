# Project Instructions for Codex

These instructions apply to the entire repository. Read this file before making changes, then use the linked documents for detail instead of restating all project context.

## Permanent product rules

- Preserve the title **Unofficial UTeM GPA/CGPA Calculator** and the unofficial-tool disclaimer.
- Keep the online version temporary only. Do not add accounts, `localStorage`, `sessionStorage`, cookies, a database, KV, D1, R2, Durable Objects, external storage, or any other permanent storage.
- Keep the offline version local only. It may save validated calculator data below Electron's per-user app-data directory, but must not use a remote server or send student data over a network.
- Reuse `shared/gpaCore.js`, `shared/dataValidation.js`, and `shared/ui.css` where practical. Run the copy scripts rather than editing generated copies independently.
- Never use `innerHTML`, `outerHTML`, or HTML parsing with user input. Create DOM nodes and assign user values through properties or `textContent`.
- Never use `eval()`, `new Function()`, unknown external scripts, or runtime CDNs.
- Keep Electron security settings safe: preserve `contextIsolation: true`, `nodeIntegration: false`, `sandbox: true`, narrow preload IPC, trusted IPC senders, denied permissions, and blocked navigation/popups/webviews.
- Keep Worker security headers and `assets.run_worker_first = true` so headers apply to static assets.

## Working rules

1. Read `PROJECT_BRIEF.md`, `TASK_LOG.md`, and relevant source files before changing behavior.
2. Keep code beginner-friendly. Comment security boundaries, shared calculations, validation, persistence, and deployment-specific behavior—not obvious syntax.
3. Use pnpm for this project. Do not provide npm commands or convert the project to npm unless the user explicitly requests it.
4. Run tests after calculation, validation, persistence, security, Worker, or Electron changes. Use `pnpm test` from the repository root.
5. Run the interface smoke test when renderer behavior or responsive layout changes; follow `README.md` for prerequisites.
6. Update README.md whenever commands, prerequisites, user-visible features, or workflows change.
7. Update `TASK_LOG.md` at the end of meaningful work. Update `DECISIONS.md` only when an architectural decision changes.
8. Do not weaken rules in `SECURITY.md` without explicit user approval and a documented rationale.

## Context map

- `PROJECT_BRIEF.md`: stable product scope, calculations, and structure.
- `TASK_LOG.md`: completed, current, pending, and known issues.
- `DECISIONS.md`: architectural choices and their reasons.
- `SECURITY.md`: security, privacy, validation, and data handling.
- `DEPLOYMENT.md`: Cloudflare and Windows build procedures.
- `README.md`: beginner setup and day-to-day usage.
