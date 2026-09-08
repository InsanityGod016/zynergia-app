export function createOperationId(cryptoSource = globalThis.crypto, randomSource = Math.random) {
  if (typeof cryptoSource?.randomUUID === 'function') return cryptoSource.randomUUID();

  const bytes = new Uint8Array(16);
  if (typeof cryptoSource?.getRandomValues === 'function') cryptoSource.getRandomValues(bytes);
  else for (let index = 0; index < bytes.length; index += 1) bytes[index] = Math.floor(randomSource() * 256);
  bytes[6] = (bytes[6] & 15) | 64;
  bytes[8] = (bytes[8] & 63) | 128;
  const hex = [...bytes].map(byte => byte.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}
