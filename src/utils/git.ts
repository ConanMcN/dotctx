import { execSync } from 'node:child_process';

function exec(cmd: string): string {
  try {
    return execSync(cmd, { encoding: 'utf-8', stdio: ['pipe', 'pipe', 'pipe'] }).trim();
  } catch {
    return '';
  }
}

export function isGitRepo(): boolean {
  return exec('git rev-parse --is-inside-work-tree') === 'true';
}

export function getGitBranch(): string {
  return exec('git branch --show-current');
}

export function getGitDiff(): string {
  return exec('git diff --stat');
}

export function getGitDiffStaged(): string {
  return exec('git diff --staged --stat');
}

export function getRecentCommits(n: number = 5): string[] {
  const output = exec(`git log -${n} --oneline`);
  return output ? output.split('\n') : [];
}

export function getGitFilesChanged(): string[] {
  const output = exec('git status --porcelain');
  if (!output) return [];
  return output.split('\n')
    .map(line => line.slice(3).trim())
    .filter(Boolean);
}

export function getGitRoot(): string {
  return exec('git rev-parse --show-toplevel');
}
