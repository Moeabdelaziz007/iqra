import { iqraThink } from './src/lib/iqra/01-core/brain';

async function test() {
  console.log('--- START TEST ---');
  const result = await iqraThink({
    input: 'test',
    options: { mock: true }
  });
  console.log('RESULT:', JSON.stringify(result, null, 2));
  console.log('--- END TEST ---');
}

test().catch(console.error);
