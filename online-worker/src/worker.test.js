import test from "node:test";
import assert from "node:assert/strict";
import worker, { SECURITY_HEADERS } from "./worker.js";

const env = {
  ASSETS: { fetch: async () => new Response("calculator", { headers: { "Content-Type": "text/html" } }) }
};

test("adds every required security header", async () => {
  const response = await worker.fetch(new Request("https://example.test/"), env);
  for (const [name, value] of Object.entries(SECURITY_HEADERS)) {
    assert.equal(response.headers.get(name), value);
  }
  assert.equal(await response.text(), "calculator");
});

test("rejects requests that could upload data", async () => {
  const response = await worker.fetch(new Request("https://example.test/", { method: "POST" }), env);
  assert.equal(response.status, 405);
  assert.equal(response.headers.get("Allow"), "GET, HEAD");
});
