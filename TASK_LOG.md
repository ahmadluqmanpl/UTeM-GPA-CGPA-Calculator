# Task Log

Last updated: 2026-07-25

## Current task

v1.1.1 release finalized and documented. Windows installer built, Android assets synced, Worker assets refreshed, all 36 tests and all pnpm audits passing. Remaining manual steps for the maintainer: sign the Android APK in Android Studio, create and push the Git tag, publish the GitHub Release, and deploy the Cloudflare Worker.

## Completed

- Created shared GPA/CGPA calculation logic and automated tests.
- Built responsive offline Electron and online Cloudflare Worker interfaces.
- Added the official local UTeM logo with a text-only failure fallback.
- Added local Electron save/load/clear, JSON import/export, and print/PDF workflow.
- Added schema validation, input limits, injection-safe DOM rendering, and empty-row handling.
- Hardened Electron IPC, sandboxing, navigation, permissions, and local-only behavior.
- Added Worker security headers, method rejection, and worker-first static-asset routing.
- Verified calculations, local persistence, security headers, source-security rules, online refresh clearing, responsive layout, and injection resistance.
- Consolidated permanent instructions, project brief, decisions, security, and deployment documentation.
- Added a shared validated A4 consultation-report preview and local print/PDF workflow to both versions.
- Configured electron-builder and produced the x64 portable Windows executable with all runtime assets packaged locally.
- Redesigned the offline app around a first-run profile flow, compact profile summary, bottom action area, and automatic local saving.
- Added validated multiple-profile support with isolated GPA data, active-profile restoration, edit/switch/add/delete actions, full-profile JSON backup, and legacy calculator import.
- Added a bundled starter programme catalogue with code/name/faculty search and manual-entry fallback.
- Connected offline reports to the active profile and added study level to report information.
- Made the NSIS installer the recommended/default Windows build with desktop and Start Menu shortcuts.
- Built and inspected `Unofficial-UTeM-GPA-CGPA-Calculator-1.0.0-setup.exe`; all required local assets are present in the packaged ASAR.
- Expanded profile tests and the Electron smoke test; all automated tests and laptop/phone renderer checks pass.
- Replaced programme samples with 109 source-documented UTeM accreditation rows: 6 Diploma, 50 Degree, 41 Master, and 12 PhD.
- Expanded local programme search to Master/PhD, accreditation code, mode, and BM-name fallback; verified all requested search examples.
- Rebuilt and inspected the recommended NSIS installer; its packaged catalogue contains all 109 rows and no placeholder data.
- Configured the existing multi-size `build/icon.ico` for electron-builder, the per-user NSIS installer, both shortcuts, the packaged executable, and the live Electron window/taskbar identity.
- Rebuilt and installed the NSIS package with the cleaned icon; verified matching installer/app resources, Desktop and Start Menu shortcut icon targets, live taskbar artwork, application launch, tests, persistence, and report smoke checks.
- Removed the programme picker's hidden 12-result cap, added an explicit default **All faculties** filter, collision-safe option keys, complete sorted results, blank-safe searching, repeated-code details, and level-change resets.
- Verified the Electron picker exposes exactly 6 Diploma, 50 Degree, 41 Master, and 12 Doctorate/PhD rows without typing; the full automated suite and laptop/phone renderer smoke checks pass.
- Standardized permanent instructions, documentation, and root helper scripts on pnpm; npm commands are not used unless explicitly requested.
- Added a session-only online report programme selector for study level, faculty, and programme, with shared BI/BM labels, manual fallback, and code/name/faculty/level/mode report output.
- Extracted shared programme catalogue helpers, kept `shared/utemPrograms.json` as the single maintained source, and verified both selectors plus refresh clearing through the pnpm test and interface-smoke workflows.
- Completed the final secret, privacy, Electron-boundary, metadata, ignore-rule, dependency, test, Worker dry-run, and Windows packaging audit without pushing to GitHub.
- Added release-safe `.gitignore` rules, complete package metadata, and regression coverage that prevents package-lock files and missing release metadata.
- Upgraded the offline app from Electron 37.10.3 to 39.8.5; the offline pnpm audit now reports no known vulnerabilities.
- Verified Electron 39 with 30 automated tests, live startup, first-run profiles, programme selection, GPA/CGPA, renderer reload/restore, filesystem persistence, report preview, the Print IPC path, responsive smoke checks, and a successful NSIS installer build.
- Added the standard MIT License for the project source, updated all package metadata to `MIT`, and documented that UTeM names, logos, trademarks, and official programme/accreditation information remain with their respective owners.
- Condensed `README.md` into a first-time visitor landing page while preserving pnpm setup, the online/offline privacy distinction, release commands, disclaimer, MIT terms, and links to detailed project documentation.
- Added shared uppercase identity normalization for student names, matric numbers, and optional academic advisor names while preserving typing cursors and mixed-case programme/subject names.
- Fixed the offline last-profile deletion delay by resetting profile state and showing the enabled, focused new-profile form before local disk clearing, with ordered persistence and `try/finally` UI cleanup.
- Verified one-profile and multi-profile deletion, immediate Add/Edit/profile typing, uppercase saved/reloaded data, report/print-preview output, responsive layouts, and the live Electron startup.
- Prepared the v1.0.1 patch release: normalized student name, matric number, and academic advisor fields to uppercase; fixed offline profile deletion state so the new-profile form is usable immediately after deleting the last profile; and built the v1.0.1 Windows installer.
- Deployed the online version to the owner's Cloudflare account.
- Manually tested the NSIS installer on a clean Windows user account, including uninstall, restart persistence, print-to-PDF, and comparative startup timing; all checks passed.
- Retired the optional portable executable due to slow self-extraction startup times; the NSIS installer is now the sole official release artifact.
- Created the `offline-android` pnpm project with Capacitor 8.4.2 (`@capacitor/core`, `@capacitor/cli`, `@capacitor/android`), initialized it as "Unofficial UTeM Calculator" (`com.utemcalculator.offline`), and added the native Android platform.
- Added `offline-android/scripts/copy-shared.js` (exposed as `pnpm copy-shared`) to copy `gpaCore.js`, `dataValidation.js`, `utemPrograms.json`, and `ui.css` from root `shared/` into `offline-android/src/shared/`, and pointed Capacitor `webDir` at `src`.
- Installed `@capacitor/filesystem` 8.1.2 and added `offline-android/src/androidStore.js`, a local-only JSON profile store that saves/loads/clears `calculator-data.json` in the app-private `Directory.Data` sandbox (no network, no innerHTML/eval; validation left to `shared/dataValidation.js`). Added a temporary placeholder `src/index.html` and synced web assets plus the filesystem plugin into the Android project.
- Replaced the placeholder with a responsive `offline-android/src/index.html` mirroring the offline Windows layout (brand header, hero, summary dashboard, semester container, grade scale, disclaimer), loading only local shared assets (`shared/ui.css`, `shared/gpaCore.js`, `shared/dataValidation.js`) and enforcing the same strict CSP meta policy as the online Worker (`default-src 'self'; connect-src 'none'; img-src 'self' data:; style-src 'self'; script-src 'self'`). Synced into the native Android project.
- Added `offline-android/src/renderer.js` to manage semester/subject DOM events, shared GPA/CGPA recalculation, and auto-save/load through the Android store using only DOM properties (`textContent`, `value`, `dataset`) and `createElement`—no innerHTML/outerHTML/HTML parsing. Bundled the local Capacitor bridge as `src/capacitor.js` and reworked `androidStore.js` into a classic script exposing `window.AndroidStore` (native Filesystem plugin with a browser fallback) so everything runs under `script-src 'self'`; wired the scripts in dependency order in `index.html` and synced. All 34 root tests pass.
- Added `prebuild` (`node scripts/copy-shared.js`) and `build` (`pnpm exec cap sync`) scripts to `offline-android/package.json` so the native Android project always receives the latest shared calculations and UI assets before compilation.
- Aligned the Android app with the offline Windows version: `index.html` now mirrors the full profile UI (create/edit/switch/delete profiles, programme picker, report panel, actions) under the same strict CSP, and `renderer.js` ports the complete multi-profile workflow with shared `offlineProfiles`/`report` logic, auto-save/restore via the Capacitor Filesystem plugin (app-private sandbox) instead of Electron IPC. `copy-shared.js` now copies all shared modules (identity, programme catalogue, offline profiles, report, styles).
- Bundled the Capacitor bridge plus the filesystem and printer UMDs as local `'self'` scripts; `androidStore.js` registers the native Filesystem plugin and exposes a local `readPublicText` (no `fetch`, preserving `connect-src 'none'`). Installed `@capgo/capacitor-printer` and bound **Print / Save as PDF** to `Printer.printHtml`, building a self-contained report document via XMLSerializer (embedded CSSOM styles + logo data URL) so the Android print dialog opens natively without `window.print()`.
- Kept the no-`innerHTML`/`outerHTML`/`eval` rule throughout (DOM properties + XMLSerializer only). Added subtle, lightweight CSS transitions to `shared/ui.css` (button hover/active/tap, input focus ring, and gentle fade-ins for panels/dropdowns/lists) plus a `prefers-reduced-motion` guard—no JavaScript animation libraries. All 34 root tests pass and the native Android project syncs with both plugins.
- Removed the `localStorage` fallback from `offline-android/src/androidStore.js` and replaced it with a volatile in-memory `Map` adapter, so the offline Android store never touches `localStorage`/`sessionStorage`/IndexedDB and stays strictly compliant with the privacy model while still allowing basic browser smoke testing.
- Fixed the programme-catalogue load error under `connect-src 'none'`: `copy-shared.js` now converts `shared/utemPrograms.json` into a local `shared/utemProgramsData.js` classic script (assigning `globalThis.UTEM_PROGRAMMES_DATA`), which `index.html` loads and `renderer.js` parses/validates instead of reading the file via Filesystem. Removed the now-unused `readPublicText`/`PUBLIC_DIRECTORY` from `androidStore.js`.
- Fixed the Android layout by loading the renderer stylesheet (`shared/style.css`, copied from the offline Windows renderer) that defines the profile-form grid, programme picker, profile card, and action layout that `shared/ui.css` lacks—restoring block-level form groups and the correct `main` offset under the header.
- Added collapsible semester cards: each card now has a `.semester-toggle` button plus a clickable header that toggles a `.collapsed` class; `shared/ui.css` animates `.semester-body` (max-height/opacity) so subject rows hide smoothly while the Semester GPA header stays visible. Kept DOM-property-only rendering (no innerHTML/outerHTML). All 34 root tests pass.
- Refined semester UX in `offline-android/src/renderer.js`: made semester titles read-only positional headings (`Semester N` from the array index, no editable input) to prevent duplicate names; added a `window.confirm` renumber warning when removing a non-last semester; and preserved each card's `.collapsed` state across re-renders by snapshotting collapsed IDs before render and reapplying them (plus toggle aria/glyph) after. Updated `shared/ui.css` `.semester-title` for the read-only `<h3>`. All 34 root tests pass.
- Prepared the v1.1.0 release for the new Android platform: bumped the version to 1.1.0 in the root, offline-windows, online-worker, and offline-android packages; added a matching Android APK download badge to the README Download section; and confirmed the Capacitor Android app syncs cleanly with the automated suite passing.
- Hardened Android privacy defaults: `allowBackup="false"` with `dataExtractionRules` and `fullBackupContent` excluding app data; narrowed FileProvider to app `cache-path` only (removed broad `external-path`); documented why `INTERNET` must remain for Capacitor's local HTTPS WebView origin.
- Aligned the Cloudflare Worker CSP with the page meta policy (`connect-src 'none'`, no `style-src 'unsafe-inline'`).
- Extended `shared/securitySource.test.js` to cover Android first-party renderer/store sources, Android HTML CSP, backup/FileProvider manifest rules, and Worker CSP alignment.
- Prepared v1.1.1: version `1.1.1` across root/Windows/Worker/Android packages; Android `versionCode 2` / `versionName 1.1.1`; README download links; CHANGELOG and release notes; DEPLOYMENT installer path examples.
- Ported Android's read-only positional `<h3>` semester titles and non-last-semester deletion confirmation to `offline-windows/src/renderer/app.js` and `online-worker/public/app.js`, removing the editable semester-name inputs while keeping DOM-property-only rendering (no innerHTML).
- Remediated build-time dev-dependency advisories via pnpm `overrides` in each package's `pnpm-workspace.yaml` (`fast-uri` 4.1.1, `brace-expansion` 5.0.8, `tar` 7.5.21, `sharp` 0.35.x); all four `pnpm audit` scopes now report no known vulnerabilities and all builds (Windows installer, Android `cap sync`, Worker assets) still succeed.
- Tightened root `.gitignore` to globally exclude stray Android `*.apk`/`*.aab` packages, confirming generated Windows, Android, Worker, and OS-cache artifacts stay out of version control while source folders (e.g. `offline-windows/build/` icons) remain tracked.
- Rebuilt the v1.1.1 NSIS installer, synced Android web assets, refreshed Worker assets, and verified the full 36-test suite passes after the dependency overrides.
- Finalized the v1.1.1 documentation set: rewrote `RELEASE_NOTES_v1.1.1.md`, enriched the `CHANGELOG.md` [1.1.1] entry, and documented the dependency-override resolution in `SECURITY.md`.

## Pending

- Perform a final human accessibility/usability pass with student testers if the project moves beyond the beginner release.

## Known issues and limitations

- No known calculation, profile-flow, responsive-layout, privacy, or source-code security defect is currently open.
- No known pnpm audit advisory remains after upgrading the offline app to Electron 39.8.5.
- The bundled programme catalogue reflects the official pages as verified on 2026-07-13 and may become outdated; manual entry remains available.
- Local offline JSON and exported reports are not encrypted; Windows-account access controls protect them.
- The project is unofficial and cannot verify university policy changes or replace official records.
- Cloudflare deployment and production-domain verification require the project owner's account credentials.
