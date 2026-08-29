import assert from "node:assert/strict";
import { test } from "node:test";

import { validatePlugin } from "../scripts/validate-plugin.mjs";

test("the repository is a valid single Cursor plugin", async () => {
  const result = await validatePlugin();

  assert.deepEqual(result.errors, []);
  assert.equal(result.manifest.name, "mermail");
  assert.equal(result.manifest.displayName, "Mermail");
  assert.equal(result.manifest.license, "MIT");
  assert.equal(result.mcpServer.url, "https://console.mermail.app/mcp");
  assert.equal(result.mcpServer.type, "http");
});

test("the plugin publishes the complete focused Mermail skill set", async () => {
  const result = await validatePlugin();
  const expectedSkills = [
    "mermail",
    "mermail-administer-workspace",
    "mermail-agent-inbox",
    "mermail-agent-wallet",
    "mermail-automate-triage",
    "mermail-cli",
    "mermail-compose-email",
    "mermail-composio",
    "mermail-gtm-agent",
    "mermail-mail-agent",
    "mermail-manage-inbox",
    "mermail-mcp",
    "mermail-scheduling-agent",
    "mermail-support-agent",
    "mermail-x402-agent"
  ];

  assert.deepEqual(result.skills, expectedSkills);
});

test("marketplace-facing documentation exposes support and legal disclosures", async () => {
  const result = await validatePlugin();

  assert.match(result.readme, /https:\/\/mermail\.app\/privacy/);
  assert.match(result.readme, /https:\/\/mermail\.app\/terms/);
  assert.match(result.readme, /contact@mermail\.app/);
  assert.match(result.readme, /Authenticate/);
  assert.match(result.readme, /Developer: Reload Window/);
});

test("tracked plugin content contains no embedded credentials or starter placeholders", async () => {
  const result = await validatePlugin();

  assert.deepEqual(result.securityFindings, []);
  assert.deepEqual(result.placeholderFindings, []);
});
