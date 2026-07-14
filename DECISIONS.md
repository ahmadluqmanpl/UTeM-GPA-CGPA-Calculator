# Project Decisions

This file records stable architectural choices. Detailed implementation rules belong in `AGENTS.md` and `SECURITY.md`.

| Decision | Rationale |
|---|---|
| Use Electron for the offline Windows version | Provides an installable/portable beginner-friendly desktop app using the same HTML, CSS, and JavaScript skills as the online version. |
| Save offline data locally only | Students can restore work without an account or server. Data lives in Electron's per-user app-data directory. |
| Keep multiple offline profiles in one validated local file | Each student profile has isolated semesters and subjects, while one active-profile ID restores the last selection. |
| Bundle programme choices locally and keep manual entry | Search works without internet; source and verification metadata support later updates without adding a runtime service. |
| Keep the online version session-only | Avoids collecting student data and eliminates account, database, retention, and breach-management complexity. |
| Use a Cloudflare Worker only to serve the calculator | The Worker serves static assets, adds security headers, and rejects upload methods; it is not an application backend. |
| Generate PDF reports locally | The Electron app uses the Windows print dialog and Microsoft Print to PDF, so report contents are not uploaded. |
| Share calculations, validation, and core design | Reduces drift between versions and gives tests one source of truth. |
| Use DOM APIs instead of HTML strings for user data | Prevents subject or semester text from becoming executable markup. |
| Use JSON for offline backup/import | It is transparent and beginner-friendly, provided files are size-limited and schema-validated before use. |
| Bundle logo, CSS, and JavaScript locally | Keeps Electron offline, avoids third-party runtime dependencies, and supports a strict Content Security Policy. |
| Recommend the NSIS installer for Windows sharing | An installed Electron app behaves like a normal Windows application and usually starts faster than the self-extracting portable build. |

If a decision changes, record the replacement and update the affected brief, security, deployment, and README sections.
