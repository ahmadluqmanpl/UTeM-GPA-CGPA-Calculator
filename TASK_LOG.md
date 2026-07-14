# Task Log

Last updated: 2026-07-14

## Current task

The GitHub landing-page README and MIT licensing are complete. Electron 39.8.5 verification is also complete.
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

## Pending

- Deploy the online version to the owner's Cloudflare account when requested.
- Manually test the NSIS installer on a clean Windows user account before wider distribution, including uninstall, restart persistence, print-to-PDF, and comparative startup timing.
- Rebuild the optional portable executable before sharing it again; the installer is the current verified release artifact.
- Perform a final human accessibility/usability pass with student testers if the project moves beyond the beginner release.
- Rebuild and inspect the optional portable executable with Electron 39.8.5 when workspace command approvals are available again.

## Known issues and limitations

- No known calculation, profile-flow, responsive-layout, privacy, or source-code security defect is currently open.
- No known pnpm audit advisory remains after upgrading the offline app to Electron 39.8.5.
- The bundled programme catalogue reflects the official pages as verified on 2026-07-13 and may become outdated; manual entry remains available.
- Local offline JSON and exported reports are not encrypted; Windows-account access controls protect them.
- The project is unofficial and cannot verify university policy changes or replace official records.
- Cloudflare deployment and production-domain verification require the project owner's account credentials.
