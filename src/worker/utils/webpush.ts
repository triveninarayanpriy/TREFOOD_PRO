import { eq } from 'drizzle-orm';
import type { Database } from '../db';
import { pushSubscriptions } from '../db/schema';
import type { Env } from '../types';

function toBase64Url(bytes: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

function fromBase64Url(str: string): Uint8Array {
  const padded = str.replace(/-/g, '+').replace(/_/g, '/') + '==='.slice((str.length + 3) % 4);
  const bin = atob(padded);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) {
    out[i] = bin.charCodeAt(i);
  }
  return out;
}

/**
 * Imports a P-256 VAPID private key from base64url raw (32 bytes) using the uncompressed
 * public key (65 bytes: 0x04 || x || y) to construct a WebCrypto ECDSA JWK.
 */
async function importVapidPrivateKey(publicKeyB64: string, privateKeyB64: string): Promise<CryptoKey | null> {
  try {
    const pub = fromBase64Url(publicKeyB64);
    const priv = fromBase64Url(privateKeyB64);
    if (pub.length !== 65 || pub[0] !== 4 || priv.length !== 32) {
      return null;
    }
    const jwk: JsonWebKey = {
      kty: 'EC',
      crv: 'P-256',
      x: toBase64Url(pub.slice(1, 33)),
      y: toBase64Url(pub.slice(33, 65)),
      d: toBase64Url(priv),
      ext: true,
    };
    return await crypto.subtle.importKey(
      'jwk',
      jwk,
      { name: 'ECDSA', namedCurve: 'P-256' },
      false,
      ['sign']
    );
  } catch {
    return null;
  }
}

async function buildVapidJwt(
  audience: string,
  subject: string,
  publicKeyB64: string,
  privateKeyB64: string
): Promise<string | null> {
  const key = await importVapidPrivateKey(publicKeyB64, privateKeyB64);
  if (!key) return null;

  const header = toBase64Url(new TextEncoder().encode(JSON.stringify({ typ: 'JWT', alg: 'ES256' })));
  const exp = Math.floor(Date.now() / 1000) + 12 * 3600;
  const payload = toBase64Url(
    new TextEncoder().encode(JSON.stringify({ aud: audience, exp, sub: subject }))
  );
  const signingInput = `${header}.${payload}`;
  const signature = await crypto.subtle.sign(
    { name: 'ECDSA', hash: 'SHA-256' },
    key,
    new TextEncoder().encode(signingInput)
  );
  return `${signingInput}.${toBase64Url(new Uint8Array(signature))}`;
}

/**
 * Dispatches lightweight VAPID Web Push wake-up pings to a user's registered endpoints.
 * Removes stale 404/410 push subscriptions automatically. Never throws on delivery failures.
 */
export async function dispatchWebPushForUser(params: {
  db: Database;
  env: Env;
  userId: string;
}): Promise<{ attempted: number; delivered: number }> {
  const { db, env, userId } = params;
  const pubKey = env.VAPID_PUBLIC_KEY?.trim();
  const privKey = env.VAPID_PRIVATE_KEY?.trim();

  if (!pubKey || !privKey) {
    return { attempted: 0, delivered: 0 };
  }

  const subs = await db
    .select()
    .from(pushSubscriptions)
    .where(eq(pushSubscriptions.userId, userId))
    .all();

  if (subs.length === 0) {
    return { attempted: 0, delivered: 0 };
  }

  const subject = env.VAPID_SUBJECT?.trim() || 'mailto:support@trefood.in';
  let delivered = 0;

  await Promise.all(
    subs.map(async (sub) => {
      try {
        const origin = new URL(sub.endpoint).origin;
        const jwt = await buildVapidJwt(origin, subject, pubKey, privKey);
        if (!jwt) return;

        const res = await fetch(sub.endpoint, {
          method: 'POST',
          headers: {
            Authorization: `vapid t=${jwt}, k=${pubKey}`,
            TTL: '300',
            Urgency: 'high',
          },
        });

        if (res.status === 200 || res.status === 201 || res.status === 202) {
          delivered += 1;
        } else if (res.status === 404 || res.status === 410) {
          await db.delete(pushSubscriptions).where(eq(pushSubscriptions.id, sub.id));
        }
      } catch {
        // Best-effort push notification; in-app notification centre remains authoritative
      }
    })
  );

  return { attempted: subs.length, delivered };
}
