import { expect, test } from 'vitest';

test('Terminal API structure exists', async () => {
  const { POST } = await import('../src/app/api/iqra/terminal/route');
  expect(POST).toBeDefined();
});
