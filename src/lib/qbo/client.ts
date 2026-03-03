import { getValidToken, refreshAccessToken } from "./token-manager";
import { QBOApiError, QBOAuthError, QBORateLimitError } from "./errors";
import { withRetry } from "./retry";
import type {
  QboTokenResponse,
  QboInvoice,
  QboCustomer,
  QboQueryResponse,
  QboError,
} from "./types";

const QBO_API_BASE =
  process.env.QBO_ENVIRONMENT === "production"
    ? "https://quickbooks.api.intuit.com"
    : "https://sandbox-quickbooks.api.intuit.com";

const QBO_AUTH_URL = "https://appcenter.intuit.com/connect/oauth2";
const QBO_TOKEN_URL =
  "https://oauth.platform.intuit.com/oauth2/v1/tokens/bearer";
const MAX_RESULTS_PER_PAGE = 1000;

export function getAuthorizationUrl(state: string): string {
  const clientId = process.env.QBO_CLIENT_ID;
  const redirectUri = process.env.QBO_REDIRECT_URI;
  if (!clientId || !redirectUri) {
    throw new Error("QBO_CLIENT_ID and QBO_REDIRECT_URI environment variables are required.");
  }
  const params = new URLSearchParams({
    client_id: clientId, redirect_uri: redirectUri,
    response_type: "code", scope: "com.intuit.quickbooks.accounting", state,
  });
  return QBO_AUTH_URL + "?" + params.toString();
}

export async function exchangeCodeForTokens(code: string, _realmId: string): Promise<QboTokenResponse> {
  const clientId = process.env.QBO_CLIENT_ID;
  const clientSecret = process.env.QBO_CLIENT_SECRET;
  const redirectUri = process.env.QBO_REDIRECT_URI;
  if (!clientId || !clientSecret || !redirectUri) {
    throw new QBOAuthError("QBO_CLIENT_ID, QBO_CLIENT_SECRET, and QBO_REDIRECT_URI are required.");
  }
  const credentials = Buffer.from(clientId + ":" + clientSecret).toString("base64");
  const response = await fetch(QBO_TOKEN_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: "Basic " + credentials,
      Accept: "application/json",
    },
    body: new URLSearchParams({ grant_type: "authorization_code", code, redirect_uri: redirectUri }),
  });
  if (!response.ok) {
    const error = await response.text();
    throw new QBOAuthError("Failed to exchange code for tokens: " + error);
  }
  return response.json();
}

export class QBOClient {
  private orgId: string;
  private accessToken: string | null = null;
  private realmId: string | null = null;
  private connectionId: string | null = null;

  constructor(orgId: string) { this.orgId = orgId; }

  private async ensureAuth(): Promise<{ accessToken: string; realmId: string }> {
    if (this.accessToken && this.realmId) {
      return { accessToken: this.accessToken, realmId: this.realmId };
    }
    const token = await getValidToken(this.orgId);
    this.accessToken = token.accessToken;
    this.realmId = token.realmId;
    this.connectionId = token.connectionId;
    return { accessToken: this.accessToken, realmId: this.realmId };
  }

  private async forceRefresh(): Promise<void> {
    if (!this.connectionId) {
      const token = await getValidToken(this.orgId);
      this.connectionId = token.connectionId;
    }
    const refreshed = await refreshAccessToken(this.connectionId);
    this.accessToken = refreshed.accessToken;
  }

  private async request<T>(path: string, retryOn401 = true): Promise<T> {
    const { accessToken, realmId } = await this.ensureAuth();
    const url = QBO_API_BASE + "/v3/company/" + realmId + "/" + path;
    console.log("[QBO Request] GET " + url);
    let response: Response;
    try {
      response = await fetch(url, {
        headers: {
          Authorization: "Bearer " + accessToken,
          Accept: "application/json",
          "Content-Type": "application/json",
        },
      });
    } catch (error) {
      throw new QBOApiError("Network error calling QBO API", {
        statusCode: 0, retryable: true, originalError: error,
      });
    }
    if (response.status === 401 && retryOn401) {
      console.log("[QBO] Token expired, refreshing and retrying...");
      await this.forceRefresh();
      return this.request<T>(path, false);
    }
    if (response.status === 429) {
      const retryAfter = response.headers.get("Retry-After");
      const retryAfterMs = retryAfter ? parseInt(retryAfter, 10) * 1000 : 60_000;
      throw new QBORateLimitError("QBO API rate limit exceeded", { retryAfterMs });
    }
    if (response.status >= 500) {
      const errorText = await response.text();
      throw new QBOApiError("QBO server error: " + errorText, {
        statusCode: response.status, retryable: true,
      });
    }
    if (!response.ok) {
      let errorDetail: string;
      try {
        const errorBody: QboError = await response.json();
        const messages = errorBody.Fault?.Error?.map((e) => e.Message + ": " + e.Detail) ?? [];
        errorDetail = messages.join("; ") || response.statusText;
      } catch {
        errorDetail = await response.text();
      }
      throw new QBOApiError("QBO API error (" + response.status + "): " + errorDetail, {
        statusCode: response.status, retryable: false,
      });
    }
    return response.json() as Promise<T>;
  }

  private async query<T>(
    _entityName: string, queryString: string, entityKey: "Invoice" | "Customer"
  ): Promise<T[]> {
    const results: T[] = [];
    let startPosition = 1;
    let hasMore = true;
    while (hasMore) {
      const paginatedQuery = queryString + " STARTPOSITION " + startPosition + " MAXRESULTS " + MAX_RESULTS_PER_PAGE;
      const encodedQuery = encodeURIComponent(paginatedQuery);
      const data = await withRetry(() => this.request<QboQueryResponse<T>>("query?query=" + encodedQuery));
      const entities = data.QueryResponse[entityKey] as T[] | undefined;
      if (entities && entities.length > 0) {
        results.push(...entities);
        startPosition += entities.length;
        hasMore = entities.length === MAX_RESULTS_PER_PAGE;
      } else {
        hasMore = false;
      }
    }
    return results;
  }

  async fetchInvoices(params?: {
    lastUpdatedAfter?: string; startPosition?: number; maxResults?: number; openOnly?: boolean;
  }): Promise<QboInvoice[]> {
    const conditions: string[] = [];
    if (params?.openOnly !== false) conditions.push("Balance > '0'");
    if (params?.lastUpdatedAfter) {
      conditions.push("MetaData.LastUpdatedTime > '" + params.lastUpdatedAfter + "'");
    }
    const whereClause = conditions.length > 0 ? " WHERE " + conditions.join(" AND ") : "";
    const queryString = "SELECT * FROM Invoice" + whereClause;
    if (params?.startPosition !== undefined || params?.maxResults !== undefined) {
      const pos = params?.startPosition ?? 1;
      const max = params?.maxResults ?? MAX_RESULTS_PER_PAGE;
      const paginatedQuery = queryString + " STARTPOSITION " + pos + " MAXRESULTS " + max;
      const encodedQuery = encodeURIComponent(paginatedQuery);
      const data = await withRetry(() => this.request<QboQueryResponse<QboInvoice>>("query?query=" + encodedQuery));
      return (data.QueryResponse.Invoice as QboInvoice[] | undefined) ?? [];
    }
    return this.query<QboInvoice>("Invoice", queryString, "Invoice");
  }

  async fetchCustomers(params?: { startPosition?: number; maxResults?: number }): Promise<QboCustomer[]> {
    const queryString = "SELECT * FROM Customer WHERE Active = true";
    if (params?.startPosition !== undefined || params?.maxResults !== undefined) {
      const pos = params?.startPosition ?? 1;
      const max = params?.maxResults ?? MAX_RESULTS_PER_PAGE;
      const paginatedQuery = queryString + " STARTPOSITION " + pos + " MAXRESULTS " + max;
      const encodedQuery = encodeURIComponent(paginatedQuery);
      const data = await withRetry(() => this.request<QboQueryResponse<QboCustomer>>("query?query=" + encodedQuery));
      return (data.QueryResponse.Customer as QboCustomer[] | undefined) ?? [];
    }
    return this.query<QboCustomer>("Customer", queryString, "Customer");
  }

  async fetchSingleInvoice(invoiceId: string): Promise<QboInvoice> {
    const data = await withRetry(() => this.request<{ Invoice: QboInvoice }>("invoice/" + invoiceId));
    return data.Invoice;
  }

  async fetchInvoicesUpdatedSince(lastSyncAt: Date): Promise<QboInvoice[]> {
    const timestamp = lastSyncAt.toISOString();
    const queryString = "SELECT * FROM Invoice WHERE MetaData.LastUpdatedTime > '" + timestamp + "'";
    return this.query<QboInvoice>("Invoice", queryString, "Invoice");
  }
}
