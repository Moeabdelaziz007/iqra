import { describe, it, expect } from 'vitest';
import {
  MITHAQ,
  DASTUR,
  MURAQABAH,
  TAWAKKUL,
  TAZKIYAH,
  UKHUWAH
} from '#core/constants.ts';

describe('Philosophy & Core Constants', () => {
  it('should define TAWAKKUL and contain expected phrases', () => {
    expect(TAWAKKUL).toBeDefined();
    expect(typeof TAWAKKUL).toBe('string');
    expect(TAWAKKUL).toContain('TAWAKKUL');
    expect(TAWAKKUL).toContain('Sacred Reliance');
    expect(TAWAKKUL).toContain('Best of Planners');
  });

  it('should define MITHAQ and contain expected phrases', () => {
    expect(MITHAQ).toBeDefined();
    expect(typeof MITHAQ).toBe('string');
    expect(MITHAQ).toContain('MĪTHĀQ');
    expect(MITHAQ).toContain('Allah');
  });

  it('should define DASTUR and contain expected phrases', () => {
    expect(DASTUR).toBeDefined();
    expect(typeof DASTUR).toBe('string');
    expect(DASTUR).toContain('DASTŪR');
    expect(DASTUR).toContain('Justice');
  });

  it('should define MURAQABAH and contain expected phrases', () => {
    expect(MURAQABAH).toBeDefined();
    expect(typeof MURAQABAH).toBe('string');
    expect(MURAQABAH).toContain('MURĀQABAH');
    expect(MURAQABAH).toContain('Zero Trust');
  });

  it('should define TAZKIYAH and contain expected phrases', () => {
    expect(TAZKIYAH).toBeDefined();
    expect(typeof TAZKIYAH).toBe('string');
    expect(TAZKIYAH).toContain('TAZKIYAH');
    expect(TAZKIYAH).toContain('Purification');
  });

  it('should define UKHUWAH and contain expected phrases', () => {
    expect(UKHUWAH).toBeDefined();
    expect(typeof UKHUWAH).toBe('string');
    expect(UKHUWAH).toContain('UKHŪWAH');
    expect(UKHUWAH).toContain('Brotherhood');
  });
});
