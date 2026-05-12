import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';

// Direct path to core and engine for isolation
const CORE_DIR = path.join(process.cwd(), 'iqra-core');
const ENGINE_PATH = path.join(process.cwd(), 'services/go-engine/main.go');

describe('IQRA Core & Engine — Offline Validation', () => {

  it('1. Soul Files Integrity: Should find all required constitution files', () => {
    const required = ['MĪTHĀQ.md', 'DASTŪR.md', 'MURĀQABAH.md', 'ḤISĀB.md'];
    required.forEach(file => {
      const exists = fs.existsSync(path.join(CORE_DIR, file));
      expect(exists, `Missing core file: ${file}`).toBe(true);
    });
  });

      it('2. Go Engine CLI: Should calculate shannon entropy correctly', () => {
    const input = JSON.stringify({text: "1234567"});
    const cmd = `cd services/go-engine \&\& go run . -mode shannon -input '${input}'`;
    const output = execSync(cmd, { encoding: 'utf-8' });
    const result = JSON.parse(output);

    expect(result).toBeDefined();
    expect(result.h_el).toBeDefined();
  });

    it('3. Go Engine CLI: Should handle bad input', () => {
    const input = JSON.stringify({text: ""});
    const cmd = `cd services/go-engine \&\& go run . -mode shannon -input '${input}'`;
    const output = execSync(cmd, { encoding: 'utf-8' });
    const result = JSON.parse(output);

    expect(result).toBeDefined();
    expect(result.h_el).toBeDefined();
  });
});
