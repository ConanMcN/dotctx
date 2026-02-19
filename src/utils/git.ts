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

export function getFileLastModified(filePath: string): Date | null {
  const output = exec(`git log -1 --format=%ci -- "${filePath}"`);
  if (!output) return null;
  const date = new Date(output);
  return isNaN(date.getTime()) ? null : date;
}

export function getFileModifiedAfter(filePath: string, afterDate: string): boolean {
  const output = exec(`git log --after="${afterDate}" --oneline -- "${filePath}"`);
  return output.length > 0;
}

export function getCommitCountAfter(filePath: string, afterDate: string): number {
  const output = exec(`git log --after="${afterDate}" --oneline -- "${filePath}"`);
  if (!output) return 0;
  return output.split('\n').filter(Boolean).length;
}
