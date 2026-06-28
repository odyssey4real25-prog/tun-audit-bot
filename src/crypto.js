// crypto.js
//
// Encrypts and decrypts sensitive values — right now, just members'
// personal PnW API keys — before they touch disk. This means that even
// if someone got a copy of your settings files, the keys inside would be
// unreadable gibberish without the separate secret in your .env file.

const crypto = require("crypto");

const ALGORITHM = "aes-256-gcm";

function getKey() {
  const secret = process.env.ENCRYPTION_KEY;
  if (!secret) {
    throw new Error(
      "Missing ENCRYPTION_KEY in your .env file. Generate one by running this in your terminal: " +
        `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`
    );
  }
  const key = Buffer.from(secret, "hex");
  if (key.length !== 32) {
    throw new Error("ENCRYPTION_KEY in your .env file must be exactly 64 hex characters (32 bytes).");
  }
  return key;
}

function encrypt(plainText) {
  const key = getKey();
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  const encrypted = Buffer.concat([cipher.update(plainText, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();
  // Stored as iv:authTag:data, all hex — need all three pieces to decrypt later.
  return `${iv.toString("hex")}:${authTag.toString("hex")}:${encrypted.toString("hex")}`;
}

function decrypt(encryptedString) {
  const key = getKey();
  const [ivHex, authTagHex, dataHex] = encryptedString.split(":");
  if (!ivHex || !authTagHex || !dataHex) {
    throw new Error("Stored value isn't in the expected encrypted format.");
  }
  const decipher = crypto.createDecipheriv(ALGORITHM, key, Buffer.from(ivHex, "hex"));
  decipher.setAuthTag(Buffer.from(authTagHex, "hex"));
  const decrypted = Buffer.concat([decipher.update(Buffer.from(dataHex, "hex")), decipher.final()]);
  return decrypted.toString("utf8");
}

module.exports = { encrypt, decrypt };
