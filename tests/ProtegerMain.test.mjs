// Regression tests for the engineering team's hook that protects `main` (H-024).
import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const hook = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../.claude/hooks/proteger-main.mjs");

function repoOnMain() {
  const dir = mkdtempSync(path.join(tmpdir(), "proteger-main-"));
  const git = (...args) => execFileSync("git", ["-C", dir, ...args], { stdio: "ignore" });
  git("init", "-q", "-b", "main");
  git("-c", "user.name=t", "-c", "user.email=t@example.com", "-c", "commit.gpgsign=false", "commit", "-q", "--allow-empty", "-m", "init");
  return dir;
}

const exitCode = (dir, command) =>
  spawnSync("node", [hook], { input: JSON.stringify({ tool_name: "Bash", tool_input: { command }, cwd: dir }) }).status;

test("blocks commands that change main or rewrite history", () => {
  const dir = repoOnMain();
  try {
    for (const command of [
      "git commit -m x",
      "git -c user.name=x commit -m x",
      "git --no-pager commit -m x",
      "git -c x=y reset --hard",
      "git reset --hard",
      "git push",
      "git push origin HEAD",
      "git push -u origin HEAD",
      "git push origin HEAD:main",
      "git push origin +mejora/x",
      "git push -f origin mejora/x",
      "git branch -D main",
    ]) assert.equal(exitCode(dir, command), 2, command);
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

test("lets work happen in a branch", () => {
  const dir = repoOnMain();
  try {
    for (const command of [
      "git status",
      "git log --oneline",
      "git switch -c mejora/H-1-x && git commit -m x",
      "git switch --create mejora/H-1-x && git commit -m x",
      "git switch -c mejora/H-1-x && git push -u origin mejora/H-1-x",
      "git push -u origin mejora/H-1-x",
    ]) assert.equal(exitCode(dir, command), 0, command);
  } finally { rmSync(dir, { recursive: true, force: true }); }
});
