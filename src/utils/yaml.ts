import fs from 'node:fs';
import path from 'node:path';
import yaml from 'js-yaml';

export function readYaml<T>(filePath: string): T | null {
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    return yaml.load(content) as T;
  } catch {
    return null;
  }
}

export function writeYaml(filePath: string, data: unknown): void {
  const dir = path.dirname(filePath);
  if (!dir) return;
  fs.mkdirSync(dir, { recursive: true });
  const content = yaml.dump(data, { lineWidth: -1, noRefs: true });
  fs.writeFileSync(filePath, content, 'utf-8');
}
