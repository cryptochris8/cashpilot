/** QuickBooks Online API response types */

// ---- Shared sub-types ----

export interface QboAddress {
  Id?: string;
  Line1?: string;
  City?: string;
  CountrySubDivisionCode?: string;
  PostalCode?: string;
}

export interface QboEmailAddress {
  Address?: string;
}

export interface QboPhoneNumber {
  FreeFormNumber?: string;
}

export interface QboRef {
  value: string;
  name?: string;
}

export interface QboMetaData {
  CreateTime: string;
  LastUpdatedTime: string;
}

// ---- Line Items ----

export interface QboSalesItemLineDetail {
  ItemRef?: QboRef;
  Qty?: number;
  UnitPrice?: number;
  TaxCodeRef?: QboRef;
}

export interface QboLine {
  Id?: string;
  LineNum?: number;
  Amount: number;
  Description?: string;
  DetailType: string;
  SalesItemLineDetail?: QboSalesItemLineDetail;
}

// ---- Invoice ----

export interface QboInvoice {
  Id: string;
  DocNumber?: string;
  TxnDate: string;
  DueDate: string;
  TotalAmt: number;
  Balance: number;
  CustomerRef: QboRef;
  BillEmail?: QboEmailAddress;
  EmailStatus?: string;
  Line?: QboLine[];
  MetaData?: QboMetaData;
  /** Present when invoice is voided/deleted */
  status?: string;
}

// ---- Customer ----

export interface QboCustomer {
  Id: string;
  DisplayName: string;
  PrimaryEmailAddr?: QboEmailAddress;
  PrimaryPhone?: QboPhoneNumber;
  BillAddr?: QboAddress;
  Balance?: number;
  Active?: boolean;
  MetaData?: QboMetaData;
}

// ---- Query Response ----

export interface QboQueryResponseBody<T = unknown> {
  startPosition?: number;
  maxResults?: number;
  totalCount?: number;
  Invoice?: T[];
  Customer?: T[];
}

export interface QboQueryResponse<T = unknown> {
  QueryResponse: QboQueryResponseBody<T>;
}

// ---- Token Response ----

export interface QboTokenResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
  expires_in: number;
  x_refresh_token_expires_in: number;
}

// ---- Error Response ----

export interface QboFaultError {
  Message: string;
  Detail: string;
  code: string;
}

export interface QboError {
  Fault?: {
    Error?: QboFaultError[];
    type: string;
  };
}

// ---- Sync Results ----

export interface SyncResult {
  customersUpserted: number;
  invoicesUpserted: number;
  invoicesPaid: number;
  errors: string[];
}
