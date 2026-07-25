# Changelog

All notable changes to this project are documented in this file.

## [1.1.1] — 2026-07-25

### Highlights

- Security hardening, dependency remediation, and cross-platform UI alignment release.
- Same calculator features as v1.1.0 with stronger privacy defaults, patched build tooling, and consistent semester titles across all versions.

### UI & UX

- Ported Android's read-only positional `<h3>` semester titles (`Semester 1`, `Semester 2`, …) to the offline Windows app and the online Cloudflare Worker, replacing editable title inputs so semester names can never duplicate.
- Added a confirmation warning when deleting a non-last semester on Windows and Web, noting that the following semesters are renumbered automatically.

### Security

- Android: disable Auto Backup (`allowBackup="false"`) and exclude app data from cloud backup and device-to-device transfer.
- Android: narrow FileProvider to app cache only (remove broad external storage paths).
- Android: document why the `INTERNET` permission remains (Capacitor local `https://localhost` WebView origin only; no remote calculator traffic).
- Cloudflare Worker: align CSP with the page meta policy (`connect-src 'none'`, no style `unsafe-inline`).
- Automated security tests now cover first-party Android sources, Android backup/FileProvider rules, and Worker CSP alignment.
- Added pnpm `overrides` to remediate build-time dev-dependency advisories (`fast-uri` → 4.1.1, `brace-expansion` → 5.0.8, `tar` → 7.5.21, `sharp` → 0.35.x); all `pnpm audit` scopes now report no known vulnerabilities. Runtime calculator assets are unchanged.

### Repository & Packaging

- Tightened `.gitignore` rules to exclude generated Windows (`dist/`, `*.exe`, `*.msi`), Android (`app/build/`, `*.apk`, `*.aab`, `.gradle/`, signing material), Worker (`.wrangler/`), and OS cache artifacts (`.DS_Store`, `Thumbs.db`).

### Documentation

- Updated `SECURITY.md` for Android backup, FileProvider, INTERNET rationale, and the dependency-override remediation.
- README download links and installer paths point to v1.1.1 artifacts.

### Platform versions

- Windows Electron package: **1.1.1**
- Online Worker package: **1.1.1**
- Android: **versionName 1.1.1**, **versionCode 2**

## [1.1.0] — 2026-07-22

### Highlights

- First offline Android (Capacitor) release with multi-profile local storage and native Print / Save as PDF.
- Windows installer and live web app remain available alongside the new APK.

### Added

- Capacitor Android app (`com.utemcalculator.offline`) reusing shared calculations, validation, profiles, catalogue, and reports.
- Local profile store via Capacitor Filesystem (`Directory.Data`).
- Native print path via `@capgo/capacitor-printer`.

## [1.0.1] — earlier

- Uppercase identity fields (name, matric, advisor).
- Offline last-profile deletion UX fix.
- Windows NSIS installer for v1.0.1.

## [1.0.0] — initial public release

- Offline Windows Electron calculator.
- Session-only Cloudflare Worker calculator.
- Shared GPA/CGPA core, validation, reports, and programme catalogue.
