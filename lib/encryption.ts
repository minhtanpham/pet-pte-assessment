import nacl from 'tweetnacl';
import { decodeBase64, decodeUTF8, encodeBase64, encodeUTF8 } from 'tweetnacl-util';
import { Storage } from './storage';
import { supabase } from './supabase';

// Hook Web Crypto API (available in Hermes / New Architecture) into NaCl's PRNG.
// This fixes the "no PRNG" error and covers all internal nacl.randomBytes() calls.
nacl.setPRNG((x: Uint8Array, n: number) => {
  crypto.getRandomValues(x.subarray(0, n));
});

const KEYPAIR_KEY = 'nacl_keypair';

interface StoredKeypair {
  publicKey: string;
  secretKey: string;
}

function getOrCreateKeypair(): nacl.BoxKeyPair {
  const stored = Storage.getObject<StoredKeypair>(KEYPAIR_KEY);
  if (stored) {
    return {
      publicKey: decodeBase64(stored.publicKey),
      secretKey: decodeBase64(stored.secretKey),
    };
  }
  // nacl.box.keyPair() now safely uses Web Crypto via the PRNG we set above
  const keypair = nacl.box.keyPair();
  Storage.setObject(KEYPAIR_KEY, {
    publicKey: encodeBase64(keypair.publicKey),
    secretKey: encodeBase64(keypair.secretKey),
  });
  return keypair;
}

export function getPublicKey(): string {
  return encodeBase64(getOrCreateKeypair().publicKey);
}

export async function publishPublicKey(uid: string): Promise<void> {
  const publicKey = getPublicKey();
  await supabase.from('users').update({ public_key: publicKey }).eq('id', uid);
}

export async function getRecipientPublicKey(uid: string): Promise<Uint8Array | null> {
  const { data } = await supabase.from('users').select('public_key').eq('id', uid).single();
  if (!data?.public_key) return null;
  return decodeBase64(data.public_key);
}

export function encryptMessage(
  text: string,
  recipientPublicKey: Uint8Array,
): { ciphertext: string; nonce: string; senderPublicKey: string } {
  const keypair = getOrCreateKeypair();
  const nonce = nacl.randomBytes(nacl.box.nonceLength);
  // decodeUTF8: string → Uint8Array (tweetnacl-util naming)
  const box = nacl.box(decodeUTF8(text), nonce, recipientPublicKey, keypair.secretKey);
  return {
    ciphertext: encodeBase64(box),
    nonce: encodeBase64(nonce),
    senderPublicKey: encodeBase64(keypair.publicKey),
  };
}

export function decryptMessage(
  ciphertext: string,
  nonce: string,
  senderPublicKeyB64: string,
): string | null {
  try {
    const keypair = getOrCreateKeypair();
    const opened = nacl.box.open(
      decodeBase64(ciphertext),
      decodeBase64(nonce),
      decodeBase64(senderPublicKeyB64),
      keypair.secretKey,
    );
    if (!opened) return null;
    // encodeUTF8: Uint8Array → string (tweetnacl-util naming)
    return encodeUTF8(opened);
  } catch {
    return null;
  }
}
