// SERVER-ONLY — nunca importar em componentes client.
// Criptografa/decripta credenciais de integração com AES-256-GCM.
// Chave: env ENCRYPTION_KEY (64 hex chars = 32 bytes).

import { createCipheriv, createDecipheriv, randomBytes } from 'crypto';

const ALGORITHM = 'aes-256-gcm';

function getKey(): Buffer {
  const hex = process.env.ENCRYPTION_KEY;
  if (!hex || hex.length !== 64) {
    throw new Error(
      'ENCRYPTION_KEY deve ter 64 chars hex (32 bytes). ' +
      'Gere com: openssl rand -hex 32'
    );
  }
  return Buffer.from(hex, 'hex');
}

// Formato: <iv_hex>:<authTag_hex>:<ciphertext_hex>
export function encryptCredentials(plaintext: string): string {
  const key = getKey();
  const iv = randomBytes(12);
  const cipher = createCipheriv(ALGORITHM, key, iv);
  const encrypted = Buffer.concat([
    cipher.update(plaintext, 'utf8'),
    cipher.final(),
  ]);
  const authTag = cipher.getAuthTag();
  return [
    iv.toString('hex'),
    authTag.toString('hex'),
    encrypted.toString('hex'),
  ].join(':');
}

export function decryptCredentials(ciphertext: string): string {
  const key = getKey();
  const parts = ciphertext.split(':');
  if (parts.length !== 3) throw new Error('Formato de credencial inválido.');
  const [ivHex, authTagHex, encryptedHex] = parts;
  const iv = Buffer.from(ivHex, 'hex');
  const authTag = Buffer.from(authTagHex, 'hex');
  const encrypted = Buffer.from(encryptedHex, 'hex');
  const decipher = createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);
  return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString('utf8');
}
