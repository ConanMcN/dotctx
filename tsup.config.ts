import { defineConfig } from 'tsup';

export default defineConfig([
  {
    entry: ['src/bin.ts'],
    format: ['esm'],
    dts: true,
    clean: true,
    sourcemap: true,
    shims: true,
  },
  {
    entry: ['src/index.ts'],
    format: ['esm'],
    dts: true,
    sourcemap: true,
    shims: true,
  },
]);
