import { describe, expect, it } from 'vitest';

import { readRawBody } from '../../api/_lib/http.js';

describe('webhook raw body', () => {
  it('reads the incoming stream before Vercel\'s parsed body helper', async () => {
    const raw = '{"amount":1700, "currency":"usd"}';
    const request = {
      body: { amount: 1700, currency: 'usd' },
      readableEnded: false,
      async *[Symbol.asyncIterator]() {
        yield Buffer.from(raw);
      },
    };

    await expect(readRawBody(request)).resolves.toEqual(Buffer.from(raw));
  });
});
