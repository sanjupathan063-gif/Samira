/**
 * Web Crypto API standard AES-GCM (256-bit) and PBKDF2 key derivation.
 * Provides client-side zero-knowledge encryption for user profiles,
 * secret notes, and exported backup packages.
 */

// Helper: Convert ArrayBuffer to Base64
function bufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

// Helper: Convert Base64 to ArrayBuffer
function base64ToBuffer(base64: string): ArrayBuffer {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}

// Derive a 256-bit AES-GCM key from password/PIN using PBKDF2
async function deriveKey(password: string, salt: Uint8Array): Promise<CryptoKey> {
  const enc = new TextEncoder();
  const passwordKey = await crypto.subtle.importKey(
    'raw',
    enc.encode(password),
    { name: 'PBKDF2' },
    false,
    ['deriveKey']
  );

  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: salt as BufferSource,
      iterations: 100000,
      hash: 'SHA-256',
    },
    passwordKey,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

export interface EncryptedPayload {
  version: number;
  salt: string; // base64
  iv: string;   // base64
  ciphertext: string; // base64
  algorithm: string;
  createdAt: string;
}

/**
 * Encrypt arbitrary string with user's PIN/Password
 */
export async function encryptData(plainText: string, masterKey: string): Promise<string> {
  if (!window.crypto || !window.crypto.subtle) {
    throw new Error('Web Crypto API is not supported in this environment');
  }

  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await deriveKey(masterKey, salt);

  const enc = new TextEncoder();
  const encodedData = enc.encode(plainText);

  const encryptedBuffer = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    encodedData
  );

  const payload: EncryptedPayload = {
    version: 1,
    salt: bufferToBase64(salt.buffer),
    iv: bufferToBase64(iv.buffer),
    ciphertext: bufferToBase64(encryptedBuffer),
    algorithm: 'AES-256-GCM',
    createdAt: new Date().toISOString(),
  };

  return JSON.stringify(payload);
}

/**
 * Decrypt payload with user's PIN/Password
 */
export async function decryptData(encryptedPayloadJson: string, masterKey: string): Promise<string> {
  if (!window.crypto || !window.crypto.subtle) {
    throw new Error('Web Crypto API is not supported in this environment');
  }

  let payload: EncryptedPayload;
  try {
    payload = JSON.parse(encryptedPayloadJson);
  } catch {
    throw new Error('Invalid encrypted payload format');
  }

  const salt = new Uint8Array(base64ToBuffer(payload.salt));
  const iv = new Uint8Array(base64ToBuffer(payload.iv));
  const ciphertextBuffer = base64ToBuffer(payload.ciphertext);

  const key = await deriveKey(masterKey, salt);

  try {
    const decryptedBuffer = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv },
      key,
      ciphertextBuffer
    );
    const dec = new TextDecoder();
    return dec.decode(decryptedBuffer);
  } catch (err) {
    throw new Error('ভুল পিন বা পাসওয়ার্ড! ডেটা ডিক্রিপ্ট করা যায়নি।');
  }
}

/**
 * Generates an encrypted backup file package and triggers download
 */
export async function exportEncryptedBackup(fullData: any, masterKey: string, filename = 'sanju_backup_encrypted.json') {
  const jsonString = JSON.stringify(fullData, null, 2);
  const encryptedPayload = await encryptData(jsonString, masterKey);

  const backupEnvelope = {
    app: 'Sanju AI Voice & Secure Assistant',
    exportDate: new Date().toISOString(),
    security: 'AES-256-GCM Zero-Knowledge',
    payload: encryptedPayload,
  };

  const blob = new Blob([JSON.stringify(backupEnvelope, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Reads and restores an uploaded encrypted backup file
 */
export async function importEncryptedBackup(file: File, masterKey: string): Promise<any> {
  const text = await file.text();
  const envelope = JSON.parse(text);

  const payloadString = typeof envelope.payload === 'string' ? envelope.payload : JSON.stringify(envelope.payload);
  const decryptedJson = await decryptData(payloadString, masterKey);
  return JSON.parse(decryptedJson);
}
