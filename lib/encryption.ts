import nacl from 'tweetnacl';
import { encodeBase64, decodeBase64, encodeUTF8, decodeUTF8 } from 'tweetnacl-util';
import { Storage } from './storage';
import firestore from '@react-native-firebase/firestore';

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
  await firestore().collection('users').doc(uid).set({ publicKey }, { merge: true });
}

export async function getRecipientPublicKey(uid: string): Promise<Uint8Array | null> {
  const doc = await firestore().collection('users').doc(uid).get();
  const key = doc.data()?.publicKey as string | undefined;
  if (!key) return null;
  return decodeBase64(key);
}

export function encryptMessage(text: string): {
  ciphertext: string;
  nonce: string;
  senderPublicKey: string;
} {
  const keypair = getOrCreateKeypair();
  const nonce = nacl.randomBytes(nacl.box.nonceLength);
  // Symmetric encryption using secretbox for simplicity without recipient key lookup
  const messageUint8 = encodeUTF8(text);
  const box = nacl.secretbox(messageUint8, nonce, keypair.secretKey.slice(0, 32));
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
    const box = decodeBase64(ciphertext);
    const nonceUint8 = decodeBase64(nonce);
    const opened = nacl.secretbox.open(box, nonceUint8, keypair.secretKey.slice(0, 32));
    if (!opened) return null;
    return decodeUTF8(opened);
  } catch {
    return null;
  }
}
