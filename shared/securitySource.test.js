const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.join(__dirname, "..");
const read = relative => fs.readFileSync(path.join(root, relative), "utf8");

// Strip comments so security-boundary documentation that names forbidden APIs
// does not create false positives; executable source is what matters.
function withoutComments(source) {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, "\n")
    .replace(/(^|[^:])\/\/.*$/gm, "$1");
}

const INJECTION_PATTERN = /innerHTML|outerHTML|insertAdjacentHTML|\beval\s*\(|new Function/;
const PERSISTENCE_PATTERN = /localStorage|sessionStorage|document\.cookie|indexedDB/;
const NETWORK_PATTERN = /\bfetch\s*\(|XMLHttpRequest|WebSocket|sendBeacon/;

test("production renderers avoid injection and persistence APIs", () => {
  const renderers = withoutComments([
    read("offline-windows/src/renderer/app.js"),
    read("online-worker/public/app.js"),
    read("shared/identityText.js"),
    read("shared/report.js")
  ].join("\n"));
  assert.doesNotMatch(renderers, INJECTION_PATTERN);
  assert.doesNotMatch(renderers, PERSISTENCE_PATTERN);
  assert.doesNotMatch(renderers, NETWORK_PATTERN);
});

test("Android app sources avoid injection and network APIs", () => {
  // Only first-party Android app code. Vendor Capacitor UMD bundles are excluded
  // because they contain framework fallbacks (fetch/indexedDB) the app does not call.
  const androidApp = withoutComments([
    read("offline-android/src/renderer.js"),
    read("offline-android/src/androidStore.js"),
    read("offline-android/src/shared/report.js"),
    read("offline-android/src/shared/identityText.js")
  ].join("\n"));
  assert.doesNotMatch(androidApp, INJECTION_PATTERN);
  assert.doesNotMatch(androidApp, PERSISTENCE_PATTERN);
  assert.doesNotMatch(androidApp, NETWORK_PATTERN);

  const androidHtml = read("offline-android/src/index.html");
  assert.doesNotMatch(androidHtml, /<script[^>]+src=["']https?:/i);
  assert.match(androidHtml, /connect-src 'none'/);
});

test("Android manifest keeps offline profile data out of backups", () => {
  const manifest = read("offline-android/android/app/src/main/AndroidManifest.xml");
  assert.match(manifest, /android:allowBackup="false"/);
  assert.match(manifest, /android:dataExtractionRules="@xml\/data_extraction_rules"/);
  assert.match(manifest, /android:fullBackupContent="@xml\/backup_rules"/);

  const filePaths = read("offline-android/android/app/src/main/res/xml/file_paths.xml");
  assert.doesNotMatch(filePaths, /external-path/);
  assert.match(filePaths, /cache-path/);
});

test("HTML uses only local scripts and Electron stays isolated", () => {
  const html = [
    read("offline-windows/src/renderer/index.html"),
    read("online-worker/public/index.html"),
    read("offline-android/src/index.html")
  ].join("\n");
  assert.doesNotMatch(html, /<script[^>]+src=["']https?:/i);

  const main = read("offline-windows/src/main.js");
  assert.match(main, /contextIsolation:\s*true/);
  assert.match(main, /nodeIntegration:\s*false/);
  assert.match(main, /sandbox:\s*true/);
  assert.match(main, /setWindowOpenHandler/);
  assert.match(main, /will-navigate/);
});

test("Worker configuration declares no persistent storage binding", () => {
  const config = read("online-worker/wrangler.toml");
  assert.doesNotMatch(config, /\b(?:d1_databases|kv_namespaces|r2_buckets|durable_objects)\b/i);
  assert.match(config, /run_worker_first\s*=\s*true/);

  const worker = read("online-worker/src/worker.js");
  assert.match(worker, /connect-src 'none'/);
  assert.doesNotMatch(worker, /style-src 'self' 'unsafe-inline'/);
  assert.doesNotMatch(worker, /connect-src 'self'/);
});

test("release metadata and ignore rules protect local and generated files", () => {
  const ignore = read(".gitignore");
  for (const required of [
    "node_modules/", "dist/", "out/", "release/", ".wrangler/",
    "*.exe", "*.msi", "*.dmg", "*.zip", "*.log", ".env", ".env.*", "package-lock.json"
  ]) {
    assert.ok(ignore.includes(required), `.gitignore must include ${required}`);
  }
  assert.equal(fs.existsSync(path.join(root, "package-lock.json")), false);
  assert.equal(fs.existsSync(path.join(root, "offline-windows", "package-lock.json")), false);
  assert.equal(fs.existsSync(path.join(root, "online-worker", "package-lock.json")), false);

  for (const relative of ["package.json", "offline-windows/package.json", "online-worker/package.json"]) {
    const metadata = JSON.parse(read(relative));
    for (const field of ["name", "version", "description", "author", "license"]) {
      assert.equal(typeof metadata[field], "string", `${relative} needs ${field}`);
      assert.ok(metadata[field].trim(), `${relative} needs a non-empty ${field}`);
    }
  }
});
