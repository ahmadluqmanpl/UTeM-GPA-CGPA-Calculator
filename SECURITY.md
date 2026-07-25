# Security — Unofficial UTeM GPA/CGPA Calculator

This is a small, unofficial student calculator. It has no accounts and does not need academic-record access. Never enter passwords, identity documents, payment data, or other sensitive information.

## Data handling

### Offline Windows version

The offline app stores only data that the student enters: local profile name, matric number, study level, programme, optional academic advisor, semester names, subject codes or names, credit hours, and grades. Each profile has separate GPA/CGPA data, and the last active profile ID is stored so the same profile reopens. Changes auto-save to a validated `calculator-data.json` file inside Electron's per-user `userData` directory. On Windows this is normally below `%APPDATA%` in an application-specific folder—not inside the source-code or installation folder.

Exported JSON and printed/PDF reports are saved only where the user chooses. The app does not send calculator data to a server. Anyone with access to the Windows account may be able to read these local files; the files are not encrypted.

Report previews are built locally from the active profile and its validated calculator state. Electron opens the native Windows print dialog; choosing Microsoft Print to PDF writes directly to the user-selected local path.

The searchable programme catalogue is bundled at build time from `shared/utemPrograms.json`. It is never fetched at runtime. Search queries, selected catalogue entries, and manually entered programmes stay on the user's computer and are not sent to a server. Manual programme values are stored only inside the same validated local profile file. Because programme and accreditation information can change after a release, users should verify important details against current official UTeM sources.

### Offline Android version

The Android app stores the same student-entered profile and calculator data as the Windows version, using the same shared validation and multi-profile model. Profiles are saved as a validated `calculator-data.json` file inside the app's private, sandboxed data directory on the device through the Capacitor Filesystem API (`Directory.Data`). This location is not world-readable and is removed when the app is uninstalled.

Android Auto Backup and related cloud/device-transfer backup extraction are disabled (`allowBackup="false"`, with exclude rules in `data_extraction_rules` / `fullBackupContent`) so profile JSON is not copied off-device by the platform backup system. The FileProvider configuration exposes only the app cache directory—not external storage—and the report print path uses an in-memory WebView with the system print dialog.

The app has no external server, account, database, cloud sync, or analytics. It does not use `localStorage`, `sessionStorage`, cookies, or IndexedDB for profile data, and its Content Security Policy keeps `connect-src 'none'` so the WebView cannot upload entered values. Capacitor still declares the `INTERNET` permission because it loads the local UI origin as `https://localhost` through an in-process WebView server; that is not used for remote calculator traffic. Report previews are built locally from the active profile, and printing uses the native Android print dialog to produce a PDF on the device. The bundled programme catalogue is packaged as a local script asset and is never fetched at runtime. Anyone with access to the unlocked device and its app data may be able to read these local files; they are not encrypted.

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

- `Content-Security-Policy` aligned with the page meta policy (`script-src 'self'`, `style-src 'self'`, `connect-src 'none'`, `img-src 'self' data:`) plus `frame-ancestors 'none'`, `base-uri 'self'`, and `form-action 'self'`;
- `X-Frame-Options: DENY` to prevent framing;
- `X-Content-Type-Options: nosniff`;
- `Referrer-Policy: no-referrer`;
- `Permissions-Policy` disabling camera, microphone, geolocation, payment, and USB;
- `Strict-Transport-Security` for HTTPS enforcement.

## Electron protections

The desktop renderer uses `contextIsolation: true`, `nodeIntegration: false`, `sandbox: true`, and `webSecurity: true`. A narrow, frozen preload API exposes only save, load, clear, import, export, bundled-programme listing, and print requests. The main process accepts IPC only from the local packaged calculator page.

External navigation, new windows, popups, and webviews are blocked. A strict `will-navigate` event listener on the `webContents` prevents the app from routing to any external URLs, ensuring it remains strictly localized. All browser permission requests are denied. The HTML Content Security Policy also blocks network connections, and the app loads no remote content.

## Dependency status

The offline Windows app was upgraded from Electron 37.10.3 to **Electron 39.8.5** on **14 July 2026**. After the upgrade, `pnpm --dir offline-windows audit` reports no known vulnerabilities. The root and online Worker scopes also report no known pnpm advisories.

Electron 39 compatibility was verified with the full automated suite, live application startup, profile creation and restore, the complete local programme selector, GPA/CGPA calculations, filesystem persistence, report preview, the Print IPC path, responsive renderer checks, and NSIS installer packaging. The existing isolation, navigation, permission, CSP, and narrow-preload controls remain enabled.

For v1.1.1, pnpm `overrides` were added to each package's `pnpm-workspace.yaml` to remediate advisories in **build-time-only** dev tooling (`electron-builder`, `wrangler`/`miniflare`, and `@capacitor/cli`). The overrides raise `fast-uri` to 4.1.1, `brace-expansion` to 5.0.8, `tar` to 7.5.21, and `sharp` to 0.35.x. These packages are used only while packaging and are **not** bundled into the Windows installer, the Android APK web assets, or the deployed Worker, so runtime calculator assets are unchanged. After the overrides, every scope (`pnpm audit`, `pnpm --dir offline-windows audit`, `pnpm --dir online-worker audit`, and `pnpm --dir offline-android audit`) reports no known vulnerabilities.

For v1.1.2, a pre-release security audit re-ran `pnpm audit` across the root, `offline-windows`, `online-worker`, and `offline-android` scopes and confirmed that the v1.1.1 `pnpm.overrides` remediation continues to hold—no new Critical or High advisories were present and no additional dependency patches were required. The application remains fully clear of known vulnerabilities.

## Unofficial status

This calculator is an unofficial student-made tool and is not affiliated with Universiti Teknikal Malaysia Melaka (UTeM). Calculated values are planning aids only. Official academic records and university policies remain the final authority.

## Reporting a problem

If this project is published in a repository, report security issues privately to its maintainer when possible. Do not include real student data in a report.
