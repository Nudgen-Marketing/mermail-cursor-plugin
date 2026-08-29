#!/usr/bin/env node

import { promises as fs } from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const EXPECTED_SKILLS = [
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

const REQUIRED_MANIFEST_VALUES = {
  name: "mermail",
  displayName: "Mermail",
  version: "1.5.5",
  license: "MIT",
  logo: "assets/logo.svg",
  skills: "./skills/",
  mcpServers: "./mcp.json"
};

const REQUIRED_README_TEXT = [
  "https://mermail.app/privacy",
  "https://mermail.app/terms",
  "contact@mermail.app",
  "Authenticate",
  "Developer: Reload Window"
];

const PLACEHOLDERS = [
  ["Your", "Org"].join(" "),
  ["plugins", "example.com"].join("@"),
  ["starter", "simple"].join("-"),
  ["starter", "advanced"].join("-")
];
const SECRET_PATTERNS = [
  { label: "Mermail API key", pattern: /mermail_(?:live|test)_[A-Za-z0-9_-]{16,}/g },
  { label: "Mermail project API key", pattern: /\bsk-proj-[A-Za-z0-9_-]{12,}/g },
  { label: "private key", pattern: /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/g },
  { label: "literal bearer token", pattern: /Authorization["']?\s*[:=]\s*["']?Bearer\s+(?!\$\{|<|\[)[A-Za-z0-9._-]{16,}/gi }
];

async function exists(targetPath) {
  try {
    await fs.access(targetPath);
    return true;
  } catch {
    return false;
  }
}

async function readJson(filePath) {
  return JSON.parse(await fs.readFile(filePath, "utf8"));
}

function parseFrontmatter(content) {
  const match = content.replaceAll("\r\n", "\n").match(/^---\n([\s\S]*?)\n---\n/);
  if (!match) return null;

  return Object.fromEntries(
    match[1]
      .split("\n")
      .map((line) => line.match(/^([A-Za-z][A-Za-z0-9_-]*):\s*(.*)$/))
      .filter(Boolean)
      .map((entry) => [entry[1], entry[2].trim()])
  );
}

async function walkFiles(directory, ignoredNames = new Set()) {
  const entries = await fs.readdir(directory, { withFileTypes: true });
  const nested = await Promise.all(
    entries
      .filter((entry) => !ignoredNames.has(entry.name))
      .map(async (entry) => {
        const entryPath = path.join(directory, entry.name);
        return entry.isDirectory() ? walkFiles(entryPath, ignoredNames) : [entryPath];
      })
  );
  return nested.flat();
}

function localMarkdownTargets(content) {
  return [...content.matchAll(/\[[^\]]*\]\(([^)]+)\)/g)]
    .map((match) => match[1].trim().split("#", 1)[0])
    .filter((target) => target && !/^(?:https?:|mailto:|#)/i.test(target));
}

async function validateSkill(skillDirectory, rootDirectory) {
  const skillName = path.basename(skillDirectory);
  const skillFile = path.join(skillDirectory, "SKILL.md");
  if (!(await exists(skillFile))) return [`${skillName}: missing SKILL.md`];

  const content = await fs.readFile(skillFile, "utf8");
  const frontmatter = parseFrontmatter(content);
  const frontmatterErrors = [
    ...(!frontmatter ? [`${skillName}: missing YAML frontmatter`] : []),
    ...(frontmatter && frontmatter.name !== skillName
      ? [`${skillName}: frontmatter name must match its directory`]
      : []),
    ...(frontmatter && !frontmatter.description
      ? [`${skillName}: frontmatter description is required`]
      : [])
  ];

  const targetChecks = await Promise.all(
    localMarkdownTargets(content).map(async (target) => {
      const resolved = path.resolve(skillDirectory, target);
      const insideSkill = resolved === skillDirectory || resolved.startsWith(`${skillDirectory}${path.sep}`);
      return insideSkill && (await exists(resolved))
        ? []
        : [`${path.relative(rootDirectory, skillFile)}: broken or unsafe link ${target}`];
    })
  );

  return [...frontmatterErrors, ...targetChecks.flat()];
}

function findPatternMatches(filesWithContent, definitions) {
  return filesWithContent.flatMap(({ relativePath, content }) =>
    definitions.flatMap(({ label, pattern }) => {
      pattern.lastIndex = 0;
      return pattern.test(content) ? [`${relativePath}: ${label}`] : [];
    })
  );
}

export async function validatePlugin(rootDirectory = process.cwd()) {
  const manifestPath = path.join(rootDirectory, ".cursor-plugin", "plugin.json");
  const mcpPath = path.join(rootDirectory, "mcp.json");
  const readmePath = path.join(rootDirectory, "README.md");
  const skillsDirectory = path.join(rootDirectory, "skills");

  const manifest = await readJson(manifestPath);
  const mcp = await readJson(mcpPath);
  const readme = await fs.readFile(readmePath, "utf8");
  const skillEntries = await fs.readdir(skillsDirectory, { withFileTypes: true });
  const skills = skillEntries
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort();

  const manifestErrors = Object.entries(REQUIRED_MANIFEST_VALUES).flatMap(([field, expected]) =>
    manifest[field] === expected ? [] : [`plugin.json: ${field} must be ${JSON.stringify(expected)}`]
  );
  const metadataErrors = [
    ...(!manifest.description ? ["plugin.json: description is required"] : []),
    ...(manifest.author?.name !== "Mermail" ? ["plugin.json: author.name must be Mermail"] : []),
    ...(manifest.author?.email !== "contact@mermail.app"
      ? ["plugin.json: author.email must be contact@mermail.app"]
      : []),
    ...(manifest.repository !== "https://github.com/Nudgen-Marketing/mermail-cursor-plugin"
      ? ["plugin.json: repository URL is incorrect"]
      : [])
  ];

  const declaredPaths = [manifest.logo, manifest.skills, manifest.mcpServers];
  const pathErrors = (
    await Promise.all(
      declaredPaths.map(async (declaredPath) => {
        const safe =
          typeof declaredPath === "string" &&
          !path.isAbsolute(declaredPath) &&
          !path.posix.normalize(declaredPath.replaceAll("\\", "/")).startsWith("../");
        return safe && (await exists(path.resolve(rootDirectory, declaredPath)))
          ? []
          : [`plugin.json: invalid or missing relative path ${JSON.stringify(declaredPath)}`];
      })
    )
  ).flat();

  const layoutErrors = [
    ...((await exists(path.join(rootDirectory, ".cursor-plugin", "marketplace.json")))
      ? ["single-plugin repositories must not include marketplace.json"]
      : []),
    ...(skills.join("\n") === EXPECTED_SKILLS.join("\n")
      ? []
      : ["skills/: focused skill set does not match the expected release"]),
    ...((await exists(path.join(rootDirectory, "LICENSE"))) ? [] : ["LICENSE is required"]),
    ...((await exists(path.join(rootDirectory, "SECURITY.md"))) ? [] : ["SECURITY.md is required"])
  ];

  const skillErrors = (
    await Promise.all(skills.map((skill) => validateSkill(path.join(skillsDirectory, skill), rootDirectory)))
  ).flat();

  const readmeErrors = REQUIRED_README_TEXT.flatMap((requiredText) =>
    readme.includes(requiredText) ? [] : [`README.md: missing ${requiredText}`]
  );

  const mcpServer = mcp.mcpServers?.mermail ?? {};
  const mcpErrors = [
    ...(mcpServer.type === "http" ? [] : ["mcp.json: Mermail server type must be http"]),
    ...(mcpServer.url === "https://console.mermail.app/mcp"
      ? []
      : ["mcp.json: Mermail server URL must use the production HTTPS endpoint"]),
    ...(Object.hasOwn(mcpServer, "headers") || Object.hasOwn(mcpServer, "env")
      ? ["mcp.json: interactive Cursor installs must use OAuth without embedded credential configuration"]
      : [])
  ];

  const textFiles = (await walkFiles(rootDirectory, new Set([".git", "node_modules"]))).filter((filePath) =>
    /(?:\.json|\.md|\.mdc|\.mjs|\.yaml|\.yml|\.svg|LICENSE)$/i.test(filePath)
  );
  const filesWithContent = await Promise.all(
    textFiles.map(async (filePath) => ({
      relativePath: path.relative(rootDirectory, filePath),
      content: await fs.readFile(filePath, "utf8")
    }))
  );
  const securityFindings = findPatternMatches(filesWithContent, SECRET_PATTERNS);
  const placeholderFindings = filesWithContent.flatMap(({ relativePath, content }) =>
    PLACEHOLDERS.flatMap((placeholder) =>
      content.includes(placeholder) ? [`${relativePath}: ${placeholder}`] : []
    )
  );

  return {
    errors: [
      ...manifestErrors,
      ...metadataErrors,
      ...pathErrors,
      ...layoutErrors,
      ...skillErrors,
      ...readmeErrors,
      ...mcpErrors,
      ...securityFindings,
      ...placeholderFindings
    ],
    manifest,
    mcpServer,
    readme,
    skills,
    securityFindings,
    placeholderFindings
  };
}

async function main() {
  try {
    const result = await validatePlugin();
    if (result.errors.length > 0) {
      console.error("Validation failed:");
      result.errors.forEach((error) => console.error(`- ${error}`));
      process.exitCode = 1;
      return;
    }

    console.log(`Validation passed: ${result.skills.length} skills, OAuth MCP, no findings.`);
  } catch (error) {
    console.error(`Validation failed: ${error.message}`);
    process.exitCode = 1;
  }
}

if (fileURLToPath(import.meta.url) === path.resolve(process.argv[1] ?? "")) {
  await main();
}
