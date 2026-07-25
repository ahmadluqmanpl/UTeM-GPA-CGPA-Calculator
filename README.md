# Unofficial UTeM GPA/CGPA Calculator

A beginner-friendly GPA and CGPA calculator for UTeM students, available as an offline Windows app, a fully offline Android app, and a session-only web app.

> This calculator is an unofficial student-made tool and is not affiliated with Universiti Teknikal Malaysia Melaka (UTeM). Always verify results against official academic records and current university policies.

## Download

<div align="center">

[![Download Windows Installer](https://img.shields.io/badge/Download-Windows%20Installer-0078D4?style=for-the-badge&logo=windows&logoColor=white)](https://github.com/ahmadluqmanpl/UTeM-GPA-CGPA-Calculator/releases/latest/download/Unofficial-UTeM-GPA-CGPA-Calculator-1.1.1-setup.exe)

[![Download Android APK](https://img.shields.io/badge/Download-Android%20APK-3DDC84?style=for-the-badge&logo=android&logoColor=white)](https://github.com/ahmadluqmanpl/UTeM-GPA-CGPA-Calculator/releases/latest/download/Unofficial-UTeM-GPA-CGPA-Calculator-1.1.1.apk)

[![Open Live Web App](https://img.shields.io/badge/Open-Live%20Web%20App-F38020?style=for-the-badge&logo=cloudflare&logoColor=white)](https://unofficial-utem-gpa-calculator.kitalemon.workers.dev/)

[![View Latest Release](https://img.shields.io/badge/View-Latest%20Release-181717?style=for-the-badge&logo=github&logoColor=white)](https://github.com/ahmadluqmanpl/UTeM-GPA-CGPA-Calculator/releases/latest)

</div>

> Windows may show an Unknown Publisher warning because the installer is not code-signed yet.


## Features

- Credit-weighted semester GPA and overall CGPA calculations
- Approved UTeM grade scale with safe handling of empty or incomplete subjects
- Responsive, lightweight interface for laptops and phones
- Searchable bundled UTeM programme catalogue with manual-entry fallback
- Multiple local profiles in the offline Windows and Android apps
- Fully offline Android version with local profiles, offline programme search, and native Print / Save as PDF
- Uppercase student names, matric numbers, and academic advisor names in profiles and reports
- Local report preview and Print / Save as PDF workflow
- Automated calculation, validation, persistence, security, and Worker tests

## App versions

| Version | Purpose | Data handling |
|---|---|---|
| Offline Windows | Electron desktop app that works without internet | Saves validated profiles and calculator data locally on the user's computer |
| Offline Android | Capacitor Android app that works fully offline | Saves validated profiles and calculator data locally in the app-private device sandbox |
| [Online Worker](https://unofficial-utem-gpa-calculator.kitalemon.workers.dev/) | Cloudflare-hosted calculator for temporary use | Keeps entered data only in page memory and clears it on refresh or close |

## Privacy summary

The **online version is session-only**. It has no accounts, database, cookies, `localStorage`, `sessionStorage`, or student-data upload endpoint. Entered details are used only for calculations and local browser report printing.

The **offline version saves locally** below Electron's per-user app-data directory. It does not send student data to a server. JSON backups and printed reports are created only where the user chooses.

See [SECURITY.md](SECURITY.md) for the complete privacy, validation, and security model.

## Quick start

Install [Node.js](https://nodejs.org/) and [pnpm](https://pnpm.io/), then run the test suite from the repository root:

```powershell
pnpm install
pnpm test
```

## Run offline Windows app

```powershell
cd offline-windows
pnpm install
pnpm start
```

The first launch creates a local profile. Programme choices are bundled with the app, and profile changes are restored from the user's local app-data folder.

Identity fields are uppercased while typing. Saved profiles and generated reports also trim surrounding spaces and collapse repeated spaces in student names, matric numbers, and optional academic advisor names.

## Build Windows installer

From `offline-windows`:

```powershell
pnpm run build:installer
```

The recommended shareable artifact is written to:

```text
offline-windows/dist/Unofficial-UTeM-GPA-CGPA-Calculator-1.1.1-setup.exe
```

The Windows build is currently unsigned, so Windows may display an **Unknown publisher** warning. The NSIS installer is the sole supported Windows artifact; the optional portable build has been retired. See [DEPLOYMENT.md](DEPLOYMENT.md) for release checks and packaging details.

## Run online Worker locally

```powershell
cd online-worker
pnpm install
pnpm run dev
```

Open the local address printed by Wrangler. Refreshing the page should remove all entered calculator and optional report data.

## Deploy online Worker

From `online-worker`:

```powershell
pnpm exec wrangler login
pnpm run deploy
```

The Worker serves the calculator and security headers only. It has no D1, KV, R2, Durable Objects, or other storage binding. Follow the production checklist in [DEPLOYMENT.md](DEPLOYMENT.md).

## Project structure

```text
shared/          Shared calculations, validation, report tools, UI, and programme data
offline-windows/ Secure local Electron application and Windows packaging
online-worker/   Session-only website and Cloudflare Worker
```

`shared/utemPrograms.json` is the single maintained programme-data source. Generated copies are refreshed by each app's `copy-shared` script.

## Documentation

- [PROJECT_BRIEF.md](PROJECT_BRIEF.md) — product scope, grade scale, calculation rules, and repository structure
- [SECURITY.md](SECURITY.md) — privacy guarantees, validation, Electron protections, and Worker headers
- [DEPLOYMENT.md](DEPLOYMENT.md) — Cloudflare deployment, Windows builds, and release checks
- [DECISIONS.md](DECISIONS.md) — stable architectural decisions and rationale
- [TASK_LOG.md](TASK_LOG.md) — completed work, pending tasks, and known limitations

## Disclaimer

This project is an unofficial student-made planning tool and is not affiliated with, endorsed by, or an official service of Universiti Teknikal Malaysia Melaka (UTeM). Calculated GPA/CGPA results and bundled programme information may not reflect later policy or catalogue changes. Official academic records and current university publications remain the final authority.

## License

The project source code is licensed under the [MIT License](LICENSE).

The UTeM name, logo, trademarks, and official programme or accreditation information remain the property of their respective owners. This project is unofficial and is not affiliated with Universiti Teknikal Malaysia Melaka (UTeM).
