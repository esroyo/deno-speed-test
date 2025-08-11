import { loadSync as dotenvLoad } from '@std/dotenv';

import type { Config } from './types.ts';

globalThis.addEventListener('unhandledrejection', (event) => {
  console.error(
    new AggregateError([event.reason], 'Unhandled promise rejection'),
  );
  event.preventDefault();
});

// Step: config load
dotenvLoad({ export: true });

export const config = {
  DEFAULT_NUM_BYTES: Number(Deno.env.get('DEFAULT_NUM_BYTES')) || 0,
  MAX_BYTES: Number(Deno.env.get('MAX_BYTES')) || 1e8,
} satisfies Config;
