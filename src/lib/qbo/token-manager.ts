import crypto from "crypto";
import prisma from "@/lib/db";
import { QBOAuthError } from "./errors";
import type { QboTokenResponse } from "./types";

const QBO_TOKEN_URL = "https://oauth.platform.intuit.com/oauth2/v1/tokens/bearer";

// ---- Encryption helpers ----

const ALGORITHM = "aes-256-cbc";
const IV_LENGTH = 16;

function getEncryptionKey(): Buffer {
  const key = process.env.QBO_TOKEN_ENCRYPTION_KEY;
  if (!key) {
    throw new Error(
      "QBO_TOKEN_ENCRYPTION_KEY environment variable is required. " +
        "Generate one with: openssl rand -hex 32"
    );
  }
  return Buffer.from(key, "hex");
}

/**
 * Encrypt a token string using AES-256-CBC.
 */
export function encryptToken(token: string): string {
  const key = getEncryptionKey();
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  let encrypted = cipher.update(token, "utf8", "hex");
  encrypted += cipher.final("hex");
  // Prefix with IV so we can decrypt later
  return iv.toString("hex") + ":" + encrypted;
}

/**
 * Decrypt an encrypted token string.
 */
export function decryptToken(encrypted: string): string {
  const key = getEncryptionKey();
  const [ivHex, encryptedData] = encrypted.split(":");
  if (!ivHex || !encryptedData) {
    throw new Error("Invalid encrypted token format");
  }
  const iv = Buffer.from(ivHex, "hex");
  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  let decrypted = decipher.update(encryptedData, "hex", "utf8");
  decrypted += decipher.final("utf8");
  return decrypted;
}

// ---- Token Management ----

interface ValidToken {
  accessToken: string;
  realmId: string;
  connectionId: string;
}

/**
 * Get a valid access token for the given organization.
 * Automatically refreshes if the current token is expired.
 */
export async function getValidToken(orgId: string): Promise<ValidToken> {
  const connection = await prisma.quickBooksConnection.findUnique({
    where: { organizationId: orgId },
  });

  if (!connection) {
    throw new QBOAuthError("QuickBooks is not connected for this organization.");
  }

  // Check if token is expired (with 5-minute buffer)
  const bufferMs = 5 * 60 * 1000;
  const isExpired = new Date(Date.now() + bufferMs) >= connection.tokenExpiresAt;

  if (isExpired) {
    const refreshed = await refreshAccessToken(connection.id);
    return {
      accessToken: refreshed.accessToken,
      realmId: connection.realmId,
      connectionId: connection.id,
    };
  }

  return {
    accessToken: decryptToken(connection.accessToken),
    realmId: connection.realmId,
    connectionId: connection.id,
  };
}

interface RefreshedToken {
  accessToken: string;
  refreshToken: string;
}

/**
 * Refresh the access token using the stored refresh token.
 * Updates the database with new tokens.
 */
export async function refreshAccessToken(connectionId: string): Promise<RefreshedToken> {
  const connection = await prisma.quickBooksConnection.findUnique({
    where: { id: connectionId },
  });

  if (!connection) {
    throw new QBOAuthError("QuickBooks connection not found.");
  }

  const clientId = process.env.QBO_CLIENT_ID;
  const clientSecret = process.env.QBO_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new QBOAuthError(
      "QBO_CLIENT_ID and QBO_CLIENT_SECRET environment variables are required."
    );
  }

  const decryptedRefreshToken = decryptToken(connection.refreshToken);

  const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");

  let response: Response;
  try {
    response = await fetch(QBO_TOKEN_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Authorization: `Basic ${credentials}`,
        Accept: "application/json",
      },
      body: new URLSearchParams({
        grant_type: "refresh_token",
        refresh_token: decryptedRefreshToken,
      }),
    });
  } catch (error) {
    throw new QBOAuthError("Network error while refreshing QBO token", {
      retryable: true,
      originalError: error,
    });
  }

  if (!response.ok) {
    const errorText = await response.text();

    // If refresh token is invalid/expired, mark connection as disconnected
    if (response.status === 400 && errorText.includes("invalid_grant")) {
      await prisma.quickBooksConnection.update({
        where: { id: connectionId },
        data: {
          syncStatus: "disconnected",
          syncError: "Refresh token expired. Please reconnect to QuickBooks.",
        },
      });

      throw new QBOAuthError(
        "QuickBooks refresh token has expired. Please reconnect your QuickBooks account.",
        { retryable: false }
      );
    }

    throw new QBOAuthError(`Failed to refresh QBO access token: ${errorText}`, {
      retryable: response.status >= 500,
    });
  }

  const tokens: QboTokenResponse = await response.json();

  // Encrypt and store new tokens
  const encryptedAccessToken = encryptToken(tokens.access_token);
  const encryptedRefreshToken = encryptToken(tokens.refresh_token);

  await prisma.quickBooksConnection.update({
    where: { id: connectionId },
    data: {
      accessToken: encryptedAccessToken,
      refreshToken: encryptedRefreshToken,
      tokenExpiresAt: new Date(Date.now() + tokens.expires_in * 1000),
    },
  });

  return {
    accessToken: tokens.access_token,
    refreshToken: tokens.refresh_token,
  };
}
