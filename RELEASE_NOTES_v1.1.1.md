# Unofficial UTeM GPA/CGPA Calculator v1.1.1

Security hardening, dependency remediation, and cross-platform UI alignment release. This release ports Android's clean semester title layout to Windows and Web, fixes build-tool security advisories, and aligns release versioning.

### ✨ Highlights
* **Cross-Platform Semester UI Alignment.** The Windows offline and live Web apps now match Android's clean read-only positional semester headings, eliminating ugly input boxes and preventing duplicate semester names.
* **Build-Tool Security Hardening.** Applied root dependency overrides for build-time tools (`fast-uri`, `brace-expansion`, `tar`, `sharp`) to resolve dev-dependency advisories.

### 🎨 UI & UX Improvements
* **Auto-Numbered Semesters across all versions.** Semester titles now automatically format as read-only positional headings (`Semester 1`, `Semester 2`, etc.) on Windows, Android, and Web.
* **Deletion Protection.** Added a confirmation warning when deleting a non-last semester to notify users about automatic renumbering.

### 🔒 Security & Repository Hygiene
* **Dependency Overrides.** Patched build-time packaging dependencies without altering runtime calculator assets.
* **Clean Build Tracking.** Tightened `.gitignore` rules across Windows, Android, and Worker packages to keep build output out of version control.

### 📦 Downloads
* **Android:** Download `Unofficial-UTeM-GPA-CGPA-Calculator-1.1.1.apk` below and install it directly on your Android device.
* **Windows:** Download `Unofficial-UTeM-GPA-CGPA-Calculator-1.1.1-setup.exe` to install the desktop application.
