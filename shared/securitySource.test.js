const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.join(__dirname, "..");
const read = relative => fs.readFileSync(path.join(root, relative), "utf8");

test("production renderers avoid injection and persistence APIs", () => {
  const renderers = [
    read("offline-windows/src/renderer/app.js"),
    read("online-worker/public/app.js"),
    read("shared/report.js")
  ].join("\n");
  assert.doesNotMatch(renderers, /innerHTML|outerHTML|insertAdjacentHTML|\beval\s*\(|new Function/);
  assert.doesNotMatch(renderers, /localStorage|sessionStorage|document\.cookie|indexedDB/);
  assert.doesNotMatch(renderers, /\bfetch\s*\(|XMLHttpRequest|WebSocket|sendBeacon/);
});

test("HTML uses only local scripts and Electron stays isolated", () => {
  const html = [
    read("offline-windows/src/renderer/index.html"),
    read("online-worker/public/index.html")
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
