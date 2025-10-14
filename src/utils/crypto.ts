// utils/crypto.ts
import crypto from "crypto";
// console.log("DEBUG MASTER_KEY:",);
// const MASTER_KEY = process.env.MASTER_KEY!;
const MASTER_KEY = "ad11671fc2b52b7ba88a2e837304b047b1a9d0d7c2fe65bd31c81f8808e61eeb";
if (!MASTER_KEY || MASTER_KEY.length !== 64) {
    throw new Error("MASTER_KEY must be set in env as 32-byte hex (64 hex chars)");
}

function iv() {
    return crypto.randomBytes(12); // 12 bytes IV for GCM
}

export function encryptText(plain: string) {
    const key = Buffer.from(MASTER_KEY, "hex");
    const ivBuf = iv();
    const cipher = crypto.createCipheriv("aes-256-gcm", key, ivBuf);
    const encrypted = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
    const tag = cipher.getAuthTag();
    // store as base64: iv(12) | tag(16) | ciphertext
    return Buffer.concat([ivBuf, tag, encrypted]).toString("base64");
}

export function decryptText(blobB64: string) {
    const data = Buffer.from(blobB64, "base64");
    const ivBuf = data.slice(0, 12);
    const tag = data.slice(12, 28);
    const encrypted = data.slice(28);
    const key = Buffer.from(MASTER_KEY, "hex");
    const decipher = crypto.createDecipheriv("aes-256-gcm", key, ivBuf);
    decipher.setAuthTag(tag);
    const plain = Buffer.concat([decipher.update(encrypted), decipher.final()]).toString("utf8");
    return plain;
}
