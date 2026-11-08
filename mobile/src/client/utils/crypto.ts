import bcrypt from 'bcryptjs';
import * as Crypto from 'expo-crypto';

/**
 * Configure secure pseudo-random number generator for bcryptjs in React Native.
 * React Native Hermes does not expose Node's crypto or WebCrypto window.crypto by default,
 * so bcrypt.setRandomFallback is required.
 */
bcrypt.setRandomFallback((len: number) => {
  const buf = new Uint8Array(len);
  try {
    return Array.from(Crypto.getRandomValues(buf));
  } catch {
    const arr: number[] = [];
    for (let i = 0; i < len; i++) {
      arr.push(Math.floor(Math.random() * 256));
    }
    return arr;
  }
});

/**
 * Generates salted bcrypt hash on device for offline credential caching. (FR3)
 */
export async function hashPasswordLocally(password: string): Promise<string> {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(password, salt);
}

/**
 * Compares plaintext password against locally cached bcrypt hash during offline login. (FR3)
 */
export async function comparePasswordLocally(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}
