# Project Brief

## Goal

Build a beginner-friendly **Unofficial UTeM GPA/CGPA Calculator** for students. It must calculate results accurately, ignore incomplete rows, work well on laptop and phone screens, and remain clearly separate from official UTeM academic records.

## App versions

### Offline Windows

An Electron desktop app that works without internet after installation. First launch creates a private local student profile; multiple profiles each keep separate semesters and subjects, auto-save below Electron's per-user app-data directory, and restore the last active profile. A bundled, source-documented UTeM programme catalogue supports local search for Diploma, Degree, Master, and PhD, with manual entry always available. Printing uses the Windows print dialog, including Microsoft Print to PDF.

### Offline Android

A Capacitor-packaged Android app that delivers the same offline experience on mobile. It reuses the shared calculations, validation, profile model, programme catalogue, report builder, and responsive design as a local WebView, and keeps the same multi-profile workflow as the Windows app. Profiles auto-save to the app-private device sandbox through the Capacitor Filesystem API and restore the last active profile. Printing uses the native Android print dialog for Print / Save as PDF. It requires no internet connection and no account.

### Online Cloudflare Worker

A static calculator served through a Cloudflare Worker. State exists only in page memory and disappears on refresh or close. Its optional report details use the shared UTeM catalogue for level, faculty, and programme selection without creating a profile or saving the choice. It has no account or permanent storage. See `SECURITY.md` for the full privacy contract.

All versions can build a validated A4 academic-consultation report locally, preview it, and open the device print/PDF dialog. The offline reports use their active profile; optional report details remain optional in the online version.

## Grade scale

| Grade | Point | Grade | Point | Grade | Point |
|---|---:|---|---:|---|---:|
| A | 4.0 | A- | 3.7 | B+ | 3.3 |
| B | 3.0 | B- | 2.7 | C+ | 2.3 |
| C | 2.0 | C- | 1.7 | D+ | 1.3 |
| D | 1.0 | E | 0.0 | | |

## Calculation rules

```text
subject total grade point = credit hour × grade point
semester GPA = semester grade points ÷ semester credit hours
overall CGPA = all grade points ÷ all credit hours
```

CGPA is credit-weighted, not an average of semester GPAs. A row counts only when it has a valid positive credit and approved grade. Empty or incomplete rows contribute nothing, and zero-credit totals display `0.00`.

## Repository structure

```text
utem-gpa-cgpa-calculator/
├── AGENTS.md, README.md, SECURITY.md
├── PROJECT_BRIEF.md, TASK_LOG.md, DECISIONS.md, DEPLOYMENT.md
├── package.json
├── shared/
│   ├── gpaCore.js                 shared calculations
│   ├── dataValidation.js          shared validation and limits
│   ├── offlineProfiles.js         Electron profile/backup validation
│   ├── programmeCatalog.js        shared programme labels and filtering
│   ├── utemPrograms.json          bundled verified programme catalogue
│   ├── ui.css                     shared responsive design
│   └── *.test.js                  calculation/security tests
├── offline-windows/
│   ├── package.json
│   ├── scripts/                   shared-copy and interface smoke tests
│   └── src/                       Electron main, preload, store, and renderer
├── offline-android/
│   ├── package.json, capacitor.config.json
│   ├── scripts/copy-shared.js
│   ├── src/                       WebView HTML, CSS, JS, and bundled shared copies
│   └── android/                   generated Capacitor Android project
└── online-worker/
    ├── package.json, wrangler.toml
    ├── scripts/copy-shared.js
    ├── src/                       Worker and header tests
    └── public/                    deployable HTML, CSS, JS, and logo
```

Generated shared copies under each app are refreshed by their `copy-shared` scripts. Treat files in the root `shared/` directory as the source of truth.
