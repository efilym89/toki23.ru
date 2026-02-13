import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, extname } from "node:path";
import { spawnSync } from "node:child_process";

const ROOT = process.cwd();
const JS_EXT = new Set([".js", ".mjs"]);
const TEXT_EXT = new Set([".js", ".mjs", ".css", ".html", ".json", ".md", ".sql", ".py"]);
const SKIP = new Set([".git", ".tools", "node_modules"]);

const files = walk(ROOT);
let hasError = false;

for (const file of files) {
  const extension = extname(file);
  if (JS_EXT.has(extension)) {
    const check = spawnSync(process.execPath, ["--check", file], { stdio: "pipe", encoding: "utf-8" });
    if (check.status !== 0) {
      hasError = true;
      process.stderr.write(`Syntax error in ${file}\n${check.stderr}\n`);
    }
  }

  if (TEXT_EXT.has(extension)) {
    const content = readFileSync(file, "utf-8");
    if (content.includes("\t")) {
      hasError = true;
      process.stderr.write(`Tab character found in ${file}\n`);
    }
    if (!content.endsWith("\n")) {
      hasError = true;
      process.stderr.write(`Missing trailing newline in ${file}\n`);
    }
  }
}

if (hasError) {
  process.exit(1);
}

console.log(`lint ok: ${files.length} files checked`);

function walk(dir) {
  const result = [];
  for (const entry of readdirSync(dir)) {
    if (SKIP.has(entry)) {
      continue;
    }

    const full = join(dir, entry);
    const stat = statSync(full);
    if (stat.isDirectory()) {
      result.push(...walk(full));
      continue;
    }

    result.push(full);
  }
  return result;
}
