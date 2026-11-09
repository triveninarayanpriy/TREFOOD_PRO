// WebCrypto based cryptographic utilities

export async function sha256(data: string): Promise<string> {
  const msgUint8 = new TextEncoder().encode(data);
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgUint8);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

export function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) {
    return false;
  }
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return result === 0;
}

export function generate4DigitCode(): string {
  const buffer = new Uint32Array(1);
  crypto.getRandomValues(buffer);
  const num = buffer[0] % 10000;
  return num.toString().padStart(4, '0');
}

export function generate6DigitOtp(): string {
  const buffer = new Uint32Array(1);
  crypto.getRandomValues(buffer);
  const num = buffer[0] % 1000000;
  return num.toString().padStart(6, '0');
}

export function generateRandomToken(bytes = 32): string {
  const buffer = new Uint8Array(bytes);
  crypto.getRandomValues(buffer);
  return Array.from(buffer)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}
