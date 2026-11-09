// Lightweight ULID generator using WebCrypto
// 26 characters Crockford's Base32 (10 chars timestamp, 16 chars randomness)

const ENCODING = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';
const ENCODING_LEN = ENCODING.length;

export function ulid(timestamp: number = Date.now()): string {
  // 48-bit timestamp
  let timeStr = '';
  let time = timestamp;
  for (let i = 9; i >= 0; i--) {
    const mod = time % ENCODING_LEN;
    timeStr = ENCODING.charAt(mod) + timeStr;
    time = Math.floor(time / ENCODING_LEN);
  }

  // 80 bits randomness (10 bytes -> 16 characters)
  const randomBytes = new Uint8Array(10);
  crypto.getRandomValues(randomBytes);

  let randStr = '';
  for (let i = 0; i < 16; i++) {
    // Distribute random bytes across 32-value alphabet (5 bits each)
    const byteIndex = Math.floor((i * 5) / 8);
    const bitOffset = (i * 5) % 8;
    let val = (randomBytes[byteIndex] >> (8 - (bitOffset + 5))) & 31;
    if (bitOffset > 3 && byteIndex + 1 < randomBytes.length) {
      val = ((randomBytes[byteIndex] << (bitOffset + 5 - 8)) | (randomBytes[byteIndex + 1] >> (16 - (bitOffset + 5)))) & 31;
    }
    randStr += ENCODING.charAt(val % ENCODING_LEN);
  }

  return timeStr + randStr;
}
