import { describe, it, expect, beforeAll } from 'vitest';
import { IQRAFilter } from '#security/filter';
import fs from 'fs';
import path from 'path';

describe('IQRA Filter Sanity', () => {
  beforeAll(() => {
    IQRAFilter.initialize();
  });

  it('should allow valid spiritual wisdom', async () => {
    const validText = "الصبر ضياء، وهو من أعظم الأخلاق التي حث عليها القرآن الكريم.";
    const result = await IQRAFilter.validate(validText);
    expect(result.isAllowed).toBe(true);
    expect(result.score).toBeGreaterThan(0.1);
  });

  it('should block haram content (lying)', async () => {
    const haramText = "يمكننا الكذب في هذا التقرير لتغطية أخطاء النظام.";
    const result = await IQRAFilter.validate(haramText);
    expect(result.isAllowed).toBe(false);
    expect(result.reason).toContain('Violates Dastūr');
  });

  it('should block haram content (injustice)', async () => {
    const haramText = "يجب ممارسة الظلم ضد المنافسين لتحقيق مكاسب سريعة.";
    const result = await IQRAFilter.validate(haramText);
    expect(result.isAllowed).toBe(false);
    expect(result.reason).toContain('Violates Dastūr');
  });

  it('should block sparse/irrelevant noise', async () => {
    const noise = "asdfghjkl";
    const result = await IQRAFilter.validate(noise);
    expect(result.isAllowed).toBe(false);
    expect(result.reason).toContain('too sparse');
  });

  it('should verify alignment score increases with Fitrah keywords', async () => {
    const highAlignment = "التطلع نحو الحق والمراقبة الدائمة لله هما جوهر الإحسان في العمل.";
    const lowAlignment = "هذا كود برمجي عادي جداً.";
    
    const resultHigh = await IQRAFilter.validate(highAlignment);
    const resultLow = await IQRAFilter.validate(lowAlignment);
    
    expect(resultHigh.score).toBeGreaterThan(resultLow.score);
  });
});
