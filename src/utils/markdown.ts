import fs from 'node:fs';
import path from 'node:path';
import type { Section } from '../types.js';

export function parseSections(content: string): Section[] {
  const lines = content.split('\n');
  const sections: Section[] = [];
  let current: Section | null = null;
  const contentLines: string[] = [];

  for (const line of lines) {
    const match = line.match(/^(#{1,6})\s+(.+)/);
    if (match) {
      if (current) {
        current.content = contentLines.join('\n').trim();
        sections.push(current);
        contentLines.length = 0;
      }
      current = { level: match[1].length, title: match[2], content: '' };
    } else if (current) {
      contentLines.push(line);
    }
  }

  if (current) {
    current.content = contentLines.join('\n').trim();
    sections.push(current);
  }

  return sections;
}

export function readMarkdown(filePath: string): string {
  try {
    return fs.readFileSync(filePath, 'utf-8');
  } catch {
    return '';
  }
}

export function appendSection(filePath: string, heading: string, content: string): void {
  const dir = path.dirname(filePath);
  fs.mkdirSync(dir, { recursive: true });

  let existing = '';
  try {
    existing = fs.readFileSync(filePath, 'utf-8');
  } catch {
    // File doesn't exist yet
  }

  const newContent = existing
    ? `${existing.trimEnd()}\n\n${heading}\n${content}\n`
    : `${heading}\n${content}\n`;

  fs.writeFileSync(filePath, newContent, 'utf-8');
}

export function appendToFile(filePath: string, content: string): void {
  const dir = path.dirname(filePath);
  fs.mkdirSync(dir, { recursive: true });

  let existing = '';
  try {
    existing = fs.readFileSync(filePath, 'utf-8');
  } catch {
    // File doesn't exist yet
  }

  const newContent = existing
    ? `${existing.trimEnd()}\n${content}\n`
    : `${content}\n`;

  fs.writeFileSync(filePath, newContent, 'utf-8');
}
