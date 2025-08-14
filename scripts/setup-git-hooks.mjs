#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';
import chalk from 'chalk';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function logInfo(msg) { console.log(chalk.cyan(`[hooks-setup] ${msg}`)); }
function logSuccess(msg) { console.log(chalk.green(`[hooks-setup] ${msg}`)); }
function logWarn(msg) { console.warn(chalk.yellow(`[hooks-setup] ${msg}`)); }
function logError(msg) { console.error(chalk.red(`[hooks-setup] ${msg}`)); }

function isGitRepo() {
  try {
    execSync('git rev-parse --git-dir', { stdio: 'ignore' });
    return true;
  } catch (e) {
    return false;
  }
}

function setHooksPath(hooksPath) {
  try {
    execSync(`git config core.hooksPath ${hooksPath}`, { stdio: 'ignore' });
    logSuccess(`Configured git core.hooksPath to '${hooksPath}'.`);
    return true;
  } catch (e) {
    logWarn(`Unable to set core.hooksPath. ${e?.message || e}`);
    return false;
  }
}

function chmodExecutables(hooksDir) {
  if (!fs.existsSync(hooksDir)) {
    logWarn(`Hooks directory '${hooksDir}' not found. Skipping chmod.`);
    return;
  }
  const files = fs.readdirSync(hooksDir);
  let count = 0;
  for (const f of files) {
    const fp = path.join(hooksDir, f);
    const stat = fs.statSync(fp);
    if (stat.isFile()) {
      try {
        fs.chmodSync(fp, 0o755);
        count++;
      } catch (e) {
        logWarn(`Failed to chmod +x ${fp}: ${e?.message || e}`);
      }
    }
  }
  logSuccess(`Applied executable permissions to ${count} file(s) in ${hooksDir}.`);
}

(function main() {
  try {
    const repoRoot = path.resolve(__dirname, '..');
    const hooksDir = path.resolve(repoRoot, '.githooks');

    logInfo('Starting git hooks setup...');

    if (!isGitRepo()) {
      logWarn('Not a git repository (or no .git directory found). Skipping git hooks setup.');
      return;
    }

    setHooksPath('.githooks');
    chmodExecutables(hooksDir);
    logSuccess('Git hooks setup complete.');
  } catch (e) {
    logError(`Unexpected error during hooks setup: ${e?.message || e}`);
    // Do not fail installation entirely; exit gracefully with success to avoid breaking npm install
  }
})();
