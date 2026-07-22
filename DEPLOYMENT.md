# Deployment and Windows Builds

Use this document for release operations. Everyday setup and architecture are covered by `README.md` and `PROJECT_BRIEF.md`.

## Before releasing either version

From the repository root:

```powershell
pnpm test
pnpm audit
pnpm --dir offline-windows audit
pnpm --dir online-worker audit
pnpm --dir offline-android audit
```

All tests must pass. Review every high-severity advisory rather than using an automatic force upgrade. Commit the generated pnpm lockfiles and ensure `TASK_LOG.md` contains no unresolved release blocker.

## Cloudflare Worker

### Install and test locally

```powershell
cd online-worker
pnpm install
pnpm run dev
```

Open the local URL printed by Wrangler. Confirm calculations work and a refresh clears all entered values.

### Authenticate and deploy

```powershell
pnpm exec wrangler login
pnpm run deploy
```

The `predeploy` script refreshes shared calculations, validation, programme helpers, the generated read-only catalogue asset, and CSS in `public/`. Wrangler uploads `public/` and `src/worker.js`. No storage resource should be created because `wrangler.toml` declares only the static-assets binding.

### Production checks

- Load the deployed URL and confirm the session-only notice is visible.
- Enter data, refresh, and confirm it disappears.
- Confirm `POST` returns HTTP 405.
- Confirm the CSP, frame, content-type, referrer, permissions, and HSTS headers described in `SECURITY.md` are present.
- Confirm `assets.run_worker_first` remains enabled; otherwise static files can bypass Worker-added headers.
- Preview a report, verify optional information and subject tables, then use the browser's Save as PDF option.
- Select a level, faculty, and programme; confirm code, name, faculty, level, and mode appear in the report, then refresh and confirm the selection clears.

## Offline Windows builds

### Install and run from source

```powershell
cd offline-windows
pnpm install
pnpm start
```

Test first-run profile creation, edit/add/switch/delete, profile-specific GPA data, auto-save, restart/restore, import, export, clear, report preview, and Print → Microsoft Print to PDF before packaging.

### Create the recommended NSIS installer

```powershell
pnpm run build:installer
```

`pnpm run build` is an alias for the same installer-first build. The prebuild script refreshes shared calculations, profile validation, the local programme catalogue, report tools, and CSS. Electron Builder writes the installer below `offline-windows/dist/`:

- `Unofficial-UTeM-GPA-CGPA-Calculator-1.0.1-setup.exe`

The per-user NSIS installer has a selectable installation directory, Desktop and Start Menu shortcut support, and normal uninstall support. Electron Builder uses `offline-windows/build/icon.ico` for the installer, installed executable, shortcuts, and Windows taskbar identity. It is the recommended sharing artifact because an installed app usually starts faster than the self-extracting portable build. The explicit packaging list includes the renderer, local logo, copied programme data and shared files, preload, local data store, and main-process code while excluding source tests.

### Optional portable build

To create the portable executable for a user who cannot install applications:

```powershell
pnpm run build:portable
```

The expected portable artifact is `offline-windows/dist/Unofficial-UTeM-GPA-CGPA-Calculator-1.0.1-portable.exe`. It is optional rather than the main sharing method. The existing `offline-windows/build/icon.ico` is also used when this optional artifact is rebuilt.

### Windows release checks

1. Test both artifacts on a clean Windows user account.
2. Confirm the app starts with networking disabled.
3. Confirm the logo and responsive interface render correctly.
4. Create two profiles, save different GPA data in each, close the app, reopen it, and confirm the last active profile and both data sets are restored.
5. Confirm the saved file is under Electron's `userData` location, not the installation folder.
6. Confirm invalid and oversized JSON imports are rejected.
7. Confirm programme search works with networking disabled and manual entry remains available.
8. Confirm print/PDF output uses the active profile and remains local.
9. Confirm uninstall is available from Windows settings and shortcuts behave normally.

Do not publish artifacts that fail tests or require remote services for calculator operation.

## Offline Android builds

The Android app wraps the shared calculator in a Capacitor WebView. Build it on a machine with Android Studio and the Android SDK installed.

### Sync web assets into the native project

From `offline-android`:

```powershell
cd offline-android
pnpm install
pnpm run build
```

`pnpm run build` runs `prebuild` (`node scripts/copy-shared.js`) to refresh the shared calculations, validation, profile model, programme catalogue (as a generated local script asset), report tools, and CSS in `src/shared/`, then runs `pnpm exec cap sync` to copy `src/` into `android/app/src/main/assets/public` and register the bundled plugins (`@capacitor/filesystem` and `@capgo/capacitor-printer`). Run this sync again whenever any shared source changes.

### Build the APK in Android Studio

1. Open the `offline-android/android` folder in Android Studio and let Gradle sync.
2. Choose **Build → Build Bundle(s) / APK(s) → Build APK(s)** for a debug/share build, or **Build → Generate Signed Bundle / APK** for a signed release APK/AAB.
3. The APK is written below `offline-android/android/app/build/outputs/apk/`. Signing keys (`.keystore`/`.jks`) and `local.properties` are machine-specific and are intentionally excluded from version control.

### Android release checks

1. Install the APK on a device or emulator with networking disabled and confirm the calculator works fully offline.
2. Create a profile, add GPA data, close the app, reopen it, and confirm the active profile and data are restored from the app-private sandbox.
3. Confirm a refresh or relaunch of the WebView keeps `connect-src 'none'` and never uploads entered values.
4. Preview a report, then use **Print / Save as PDF** and confirm the native Android print dialog produces the document locally.
5. Confirm programme search works offline and manual entry remains available.

Do not publish artifacts that fail tests or require remote services for calculator operation.
