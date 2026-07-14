# Security — Unofficial UTeM GPA/CGPA Calculator

This is a small, unofficial student calculator. It has no accounts and does not need academic-record access. Never enter passwords, identity documents, payment data, or other sensitive information.

## Data handling

### Offline Windows version

The offline app stores only data that the student enters: local profile name, matric number, study level, programme, optional academic advisor, semester names, subject codes or names, credit hours, and grades. Each profile has separate GPA/CGPA data, and the last active profile ID is stored so the same profile reopens. Changes auto-save to a validated `calculator-data.json` file inside Electron's per-user `userData` directory. On Windows this is normally below `%APPDATA%` in an application-specific folder—not inside the source-code or installation folder.

Exported JSON and printed/PDF reports are saved only where the user chooses. The app does not send calculator data to a server. Anyone with access to the Windows account may be able to read these local files; the files are not encrypted.

Report previews are built locally from the active profile and its validated calculator state. Electron opens the native Windows print dialog; choosing Microsoft Print to PDF writes directly to the user-selected local path.

The searchable programme catalogue is bundled at build time from `shared/utemPrograms.json`. It is never fetched at runtime. Search queries, selected catalogue entries, and manually entered programmes stay on the user's computer and are not sent to a server. Manual programme values are stored only inside the same validated local profile file. Because programme and accreditation information can change after a release, users should verify important details against current official UTeM sources.

### Online Cloudflare Worker version

The online version stores nothing permanently. It has no login, database, D1, KV, R2, Durable Objects, external storage, cookies, `localStorage`, `sessionStorage`, or IndexedDB. Entries exist only in the page's JavaScript memory. Closing or refreshing the page destroys that state.

The Worker accepts only `GET` and `HEAD` requests for static files. Requests such as `POST` are rejected, so the calculator page has no endpoint for uploading entered data.

The online report is also created entirely in page memory. Its optional study level, faculty, catalogue programme, and manual fallback fields are never used to create a profile. The selected programme metadata is passed directly to the in-memory report model, uses the browser print dialog, and is never posted to the Worker, saved in browser storage, or retained after refresh.

The online catalogue is a read-only local script asset generated at build time from the single maintained `shared/utemPrograms.json` source. Loading that static asset contains no student data and requires no database or storage binding. The page keeps `connect-src 'none'` in its own CSP, so calculator JavaScript cannot upload entered values or fetch runtime data.

## Input validation

Shared validation rules enforce:

- credit hours must be numeric, greater than zero, and no greater than 12;
- grades must be one of `A`, `A-`, `B+`, `B`, `B-`, `C+`, `C`, `C-`, `D+`, `D`, or `E`;
- subject codes/names are limited to 100 characters;
- semester names are limited to 60 characters;
- a plan is limited to 30 semesters and 50 subjects per semester;
- imported JSON files are limited to 1 MB and must match either the current profile-backup schema or the legacy calculator schema;
- profile identity fields, study level, programme fields, profile count, unique IDs, and active-profile references are validated before saving or importing.

Incomplete or empty rows remain visible for editing but are ignored by GPA calculations. Calculation functions return numeric zero for empty totals, so the interface does not display `NaN`, `undefined`, `null`, `#DIV/0!`, or `#VALUE!`.

## Script-injection prevention

User-entered values are assigned through DOM properties and `textContent`. The renderers do not pass user input through `innerHTML`, HTML templates, `eval()`, or `new Function()`. Grade choices are created from the fixed approved list. JavaScript, CSS, and images are bundled locally; no runtime CDN or third-party script is loaded.

Imported JSON is parsed only as data, checked for its expected shape and limits, and rebuilt into new plain profile/calculator objects. Legacy version 1 calculator backups may be attached to the current profile. Nothing from an imported file is executed.

## Online security headers

Every Worker response includes:

- `Content-Security-Policy` restricting scripts, styles, images, fonts, connections, frames, base URLs, and form actions;
- `X-Frame-Options: DENY` to prevent framing;
- `X-Content-Type-Options: nosniff`;
- `Referrer-Policy: no-referrer`;
- `Permissions-Policy` disabling camera, microphone, geolocation, payment, and USB;
- `Strict-Transport-Security` for HTTPS enforcement.

## Electron protections

The desktop renderer uses `contextIsolation: true`, `nodeIntegration: false`, `sandbox: true`, and `webSecurity: true`. A narrow, frozen preload API exposes only save, load, clear, import, export, bundled-programme listing, and print requests. The main process accepts IPC only from the local packaged calculator page.

External navigation, new windows, popups, and webviews are blocked. All browser permission requests are denied. The HTML Content Security Policy also blocks network connections, and the app loads no remote content.

## Dependency status

The offline Windows app was upgraded from Electron 37.10.3 to **Electron 39.8.5** on **14 July 2026**. After the upgrade, `pnpm --dir offline-windows audit` reports no known vulnerabilities. The root and online Worker scopes also report no known pnpm advisories.

Electron 39 compatibility was verified with the full automated suite, live application startup, profile creation and restore, the complete local programme selector, GPA/CGPA calculations, filesystem persistence, report preview, the Print IPC path, responsive renderer checks, and NSIS installer packaging. The existing isolation, navigation, permission, CSP, and narrow-preload controls remain enabled.

## Unofficial status

This calculator is an unofficial student-made tool and is not affiliated with Universiti Teknikal Malaysia Melaka (UTeM). Calculated values are planning aids only. Official academic records and university policies remain the final authority.

## Reporting a problem

If this project is published in a repository, report security issues privately to its maintainer when possible. Do not include real student data in a report.
