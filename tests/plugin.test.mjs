import assert from "node:assert/strict";
import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";
import { test } from "node:test";

import { validatePlugin } from "../scripts/validate-plugin.mjs";

const repositoryRoot = path.resolve(import.meta.dirname, "..");

async function createFixture() {
  const fixture = await fs.mkdtemp(path.join(os.tmpdir(), "mermail-cursor-plugin-"));
  await fs.cp(repositoryRoot, fixture, {
    recursive: true,
    filter: (source) => !source.includes(`${path.sep}.git`) && !source.includes(`${path.sep}node_modules`)
  });
  return fixture;
}

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

test("local install instructions stay inside Cursor's plugin security boundary", async () => {
  const result = await validatePlugin();

  assert.match(result.readme, /git archive HEAD \| tar -x -C ~\/\.cursor\/plugins\/local\/mermail/);
  assert.doesNotMatch(result.readme, /ln -s/);
});

test("tracked plugin content contains no embedded credentials or starter placeholders", async () => {
  const result = await validatePlugin();

  assert.deepEqual(result.securityFindings, []);
  assert.deepEqual(result.placeholderFindings, []);
});

test("validation reports malformed manifests, components, docs, and credentials", async (context) => {
  const fixture = await createFixture();
  context.after(() => fs.rm(fixture, { recursive: true, force: true }));

  const manifestPath = path.join(fixture, ".cursor-plugin", "plugin.json");
  const manifest = JSON.parse(await fs.readFile(manifestPath, "utf8"));
  await fs.writeFile(
    manifestPath,
    JSON.stringify(
      {
        ...manifest,
        name: "Wrong Name",
        displayName: "Wrong",
        version: "0",
        description: "",
        license: "GPL",
        logo: "/absolute/logo.svg",
        skills: "./missing-skills/",
        mcpServers: "../mcp.json",
        author: { name: "Unknown", email: "unknown.invalid" },
        repository: "https://example.invalid/plugin"
      },
      null,
      2
    )
  );

  await fs.writeFile(
    path.join(fixture, "mcp.json"),
    JSON.stringify({
      mcpServers: {
        mermail: {
          type: "stdio",
          url: "http://localhost/mcp",
          headers: { Authorization: "configured-elsewhere" }
        }
      }
    })
  );
  await fs.writeFile(path.join(fixture, ".cursor-plugin", "marketplace.json"), "{}");
  await fs.rm(path.join(fixture, "LICENSE"));
  await fs.rm(path.join(fixture, "SECURITY.md"));
  await fs.rm(path.join(fixture, "skills", "mermail", "SKILL.md"));
  await fs.writeFile(
    path.join(fixture, "skills", "mermail-mcp", "SKILL.md"),
    "---\nname: wrong-name\ndescription:\n---\n[Broken](../../outside.md)\n"
  );
  await fs.writeFile(path.join(fixture, "README.md"), "Incomplete docs\n");
  await fs.writeFile(
    path.join(fixture, "credential-sample.md"),
    [
      ["Your", "Org"].join(" "),
      ["mermail", "live", "abcdefghijklmnop"].join("_"),
      ["-----BEGIN", "PRIVATE KEY-----"].join(" "),
      ["Authorization:", "Bearer", "abcdefghijklmnop"].join(" ")
    ].join("\n")
  );

  const result = await validatePlugin(fixture);

  assert.ok(result.errors.length >= 20);
  assert.ok(result.errors.some((error) => error.includes("name must be")));
  assert.ok(result.errors.some((error) => error.includes("missing YAML frontmatter") || error.includes("frontmatter name")));
  assert.ok(result.errors.some((error) => error.includes("broken or unsafe link")));
  assert.ok(result.errors.some((error) => error.includes("production HTTPS endpoint")));
  assert.equal(result.securityFindings.length, 3);
  assert.equal(result.placeholderFindings.length, 1);
});
