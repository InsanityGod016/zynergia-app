import { describe, expect, it } from 'vitest';
import { createOperationId } from '@/lib/operationId';

describe('operation ids', () => {
  it('uses the native UUID implementation when available', () => {
    const value = '123e4567-e89b-42d3-a456-426614174000';
    expect(createOperationId({ randomUUID: () => value })).toBe(value);
  });

  it('still creates an RFC 4122 v4 UUID on older WebViews', () => {
    const cryptoWithoutRandomUuid = {
      getRandomValues(bytes) {
        bytes.forEach((_, index) => { bytes[index] = index; });
        return bytes;
      },
    };
    const value = createOperationId(cryptoWithoutRandomUuid);

    expect(value).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
  });
});
