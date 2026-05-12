import type { WorkerReport as P } from '#workers/protocol';
import type { WorkerReport as C } from '#agents/contracts';

const p: P = {} as any;
const c: C = {} as any;

// This will fail at compile time if they are not compatible
const testP: P = c;
const testC: C = p;

console.log('Unification verified: P and C are compatible.');
