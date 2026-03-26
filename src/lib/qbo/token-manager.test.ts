import { describe, it, expect, vi, beforeEach } from "vitest";
import { encryptToken, decryptToken } from "./token-manager";

// 32-byte key expressed as 64 hex characters
const TEST_KEY = "a".repeat(64);

beforeEach(() => {
  vi.stubEnv("QBO_TOKEN_ENCRYPTION_KEY", TEST_KEY);
});

describe("encryptToken / decryptToken", () => {
  it("round-trip: encrypt then decrypt returns the original value", () => {
    const original = "my-secret-access-token";
    const encrypted = encryptToken(original);
    const decrypted = decryptToken(encrypted);
    expect(decrypted).toBe(original);
  });

  it("different inputs produce different ciphertexts", () => {
    const a = encryptToken("token-one");
    const b = encryptToken("token-two");
    expect(a).not.toBe(b);
  });

  it("same input encrypted twice produces different ciphertexts (random IV)", () => {
    const token = "same-token";
    const first = encryptToken(token);
    const second = encryptToken(token);
    // The ciphertexts differ because a fresh random IV is used each time
    expect(first).not.toBe(second);
    // But both decrypt to the same plaintext
    expect(decryptToken(first)).toBe(token);
    expect(decryptToken(second)).toBe(token);
  });

  it('encrypted output format is "iv:ciphertext" (contains exactly one colon)', () => {
    const encrypted = encryptToken("some-token");
    const parts = encrypted.split(":");
    expect(parts).toHaveLength(2);
    const [iv, ciphertext] = parts;
    // IV is 16 bytes = 32 hex chars
    expect(iv).toHaveLength(32);
    // Ciphertext must be non-empty hex
    expect(ciphertext.length).toBeGreaterThan(0);
    expect(ciphertext).toMatch(/^[0-9a-f]+$/);
  });

  it("decryptToken throws on input with no colon separator", () => {
    expect(() => decryptToken("notvalidatall")).toThrow("Invalid encrypted token format");
  });

  it("decryptToken throws on empty string", () => {
    expect(() => decryptToken("")).toThrow("Invalid encrypted token format");
  });

  it("decryptToken throws on corrupted ciphertext", () => {
    const encrypted = encryptToken("valid-token");
    // Corrupt the ciphertext portion (after the colon)
    const [iv] = encrypted.split(":");
    const corrupted = `${iv}:deadbeefdeadbeefdeadbeefdeadbeef`;
    expect(() => decryptToken(corrupted)).toThrow();
  });

  it("decryptToken throws when the IV portion is missing", () => {
    expect(() => decryptToken(":someciphertext")).toThrow("Invalid encrypted token format");
  });

  it("round-trip works with a long token (1000+ characters)", () => {
    const longToken = "x".repeat(1200);
    const encrypted = encryptToken(longToken);
    expect(decryptToken(encrypted)).toBe(longToken);
  });

  it("round-trip works with special characters and unicode", () => {
    const special = "héllo wörld 🎉 <>&\"'/\\n\t\0 中文 日本語";
    const encrypted = encryptToken(special);
    expect(decryptToken(encrypted)).toBe(special);
  });
});
