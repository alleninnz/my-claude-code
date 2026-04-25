#!/usr/bin/env node

const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");

const ROOT = path.resolve(__dirname, "..");
const SOURCE_DIR = path.join(ROOT, "rules");
const TARGET_DIR = path.join(os.homedir(), ".claude", "rules");

fs.mkdirSync(TARGET_DIR, { recursive: true });

const ruleFiles = fs
  .readdirSync(SOURCE_DIR)
  .filter((name) => name.endsWith(".md"))
  .sort();

for (const fileName of ruleFiles) {
  const source = path.join(SOURCE_DIR, fileName);
  const target = path.join(TARGET_DIR, fileName);
  fs.copyFileSync(source, target);
  console.log(`installed ${fileName}`);
}

console.log(`Installed ${ruleFiles.length} rules to ${TARGET_DIR}`);
