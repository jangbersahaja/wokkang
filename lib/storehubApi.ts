/**
 * StoreHub API Integration
 * Simplified version for transaction monitoring
 */

const STOREHUB_API_BASE =
  process.env.NEXT_PUBLIC_STOREHUB_API_BASE || "https://api.storehubhq.com";
const STOREHUB_USERNAME = process.env.STOREHUB_USERNAME;
const STOREHUB_PASSWORD = process.env.STOREHUB_PASSWORD;

/**
 * Validate API credentials are configured
 */
function validateCredentials(): void {
  if (!STOREHUB_USERNAME || !STOREHUB_PASSWORD) {
    throw new Error(
      "StoreHub credentials not configured. Please set STOREHUB_USERNAME and STOREHUB_PASSWORD in your .env.local file.",
    );
  }
}

/**
 * Generate Basic Auth header from username and password
 */
function getBasicAuthHeader(): string {
  validateCredentials();
  const credentials = `${STOREHUB_USERNAME}:${STOREHUB_PASSWORD}`;
  const encodedCredentials = Buffer.from(credentials).toString("base64");
  return `Basic ${encodedCredentials}`;
}

interface ApiRequestConfig {
  method?: "GET" | "POST" | "PUT" | "DELETE";
  headers?: Record<string, string>;
  body?: Record<string, unknown>;
  retries?: number;
}

// Request queue to enforce rate limiting (3 calls per second)
let lastRequestTime = 0;
const MIN_REQUEST_INTERVAL = 1000 / 3; // ~333ms between requests

/**
 * Wait until it's safe to make the next request (respects rate limit)
 */
async function waitForRateLimit(): Promise<void> {
  const now = Date.now();
  const timeSinceLastRequest = now - lastRequestTime;

  if (timeSinceLastRequest < MIN_REQUEST_INTERVAL) {
    const waitTime = MIN_REQUEST_INTERVAL - timeSinceLastRequest;
    await new Promise((resolve) => setTimeout(resolve, waitTime));
  }

  lastRequestTime = Date.now();
}

/**
 * Helper function to make API requests to StoreHub
 */
async function makeApiRequest<T>(
  endpoint: string,
  config: ApiRequestConfig = {},
): Promise<T> {
  const { method = "GET", headers = {}, body, retries = 3 } = config;

  const defaultHeaders: Record<string, string> = {
    "Content-Type": "application/json",
    Authorization: getBasicAuthHeader(),
    ...headers,
  };

  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      // Respect rate limiting
      await waitForRateLimit();

      const url = `${STOREHUB_API_BASE}${endpoint}`;

      const response = await fetch(url, {
        method,
        headers: defaultHeaders,
        body: body ? JSON.stringify(body) : undefined,
      });

      if (!response.ok) {
        let errorDetails = "";
        try {
          const errorBody = await response.json();
          errorDetails = JSON.stringify(errorBody);
        } catch {
          errorDetails = await response.text();
        }

        console.error(
          `[StoreHub API Error] ${response.status} ${response.statusText}`,
          errorDetails,
        );

        // Determine if we should retry
        const isTransient =
          response.status === 502 ||
          response.status === 503 ||
          response.status === 504 ||
          response.status === 429;

        if (isTransient && attempt < retries) {
          const backoffDelay = Math.pow(2, attempt) * 1000;
          await new Promise((resolve) => setTimeout(resolve, backoffDelay));
          continue;
        }

        throw new Error(
          `API Error: ${response.statusText} (${response.status})`,
        );
      }

      return (await response.json()) as T;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      const isTransient =
        lastError.message.includes("502") ||
        lastError.message.includes("503") ||
        lastError.message.includes("504") ||
        lastError.message.includes("429");

      if (!isTransient || attempt === retries) {
        throw lastError;
      }

      const backoffDelay = Math.pow(2, attempt) * 1000;
      await new Promise((resolve) => setTimeout(resolve, backoffDelay));
    }
  }

  if (lastError) throw lastError;
  throw new Error("Unknown error in makeApiRequest");
}

/**
 * Transaction Interface
 */
export interface Transaction {
  id: string;
  receiptNumber: string;
  timestamp: string;
  storeId: string;
  registerId: string;
  employeeId: string;
  customerId?: string;
  items: TransactionItem[];
  subtotal: number;
  discount: number;
  tax: number;
  total: number;
  paymentMethod: "cash" | "card" | "qr" | "other";
  payments?: Array<{
    paymentMethod: string;
    amount: number;
  }>;
  status: "completed" | "cancelled" | "pending";
  transactionType?: string;
  channel?: string;
  tableId?: string | null;
  serviceCharge?: number;
}

export interface TransactionItem {
  sku: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  grossPrice: number;
  discount: number;
  netUnitPrice: number;
}

/**
 * Product Interface
 */
export interface Product {
  id: string;
  sku: string;
  name: string;
  category: string;
  unitPrice: number;
  cost: number;
  quantity?: number;
}

/**
 * Get all products
 */
export async function getProducts(filters?: {
  category?: string;
  sku?: string;
  limit?: number;
  offset?: number;
}): Promise<Product[]> {
  const queryParams = new URLSearchParams();

  if (filters?.category) queryParams.append("category", filters.category);
  if (filters?.sku) queryParams.append("sku", filters.sku);
  if (filters?.limit) queryParams.append("limit", filters.limit.toString());
  if (filters?.offset) queryParams.append("offset", filters.offset.toString());

  const endpoint = `/products${queryParams.toString() ? "?" + queryParams.toString() : ""}`;
  const rawProducts = await makeApiRequest<Record<string, unknown>[]>(endpoint);

  return rawProducts.map((product: Record<string, unknown>) => ({
    id: (product.id as string) || "",
    sku: (product.sku as string) || "",
    name: (product.name as string) || "",
    category: (product.category as string) || "",
    unitPrice: (product.unitPrice as number) || 0,
    cost: (product.cost as number) || 0,
    quantity: (product.quantity as number) || 0,
  }));
}

/**
 * Get transactions/sales within date range
 */
export async function getTransactions(filters?: {
  startDate?: string;
  endDate?: string;
  employeeId?: string;
  status?: "completed" | "cancelled" | "pending";
  limit?: number;
  offset?: number;
}): Promise<Transaction[]> {
  const queryParams = new URLSearchParams();

  // StoreHub API uses 'from' and 'to' parameters (YYYY-MM-DD format)
  if (filters?.startDate) queryParams.append("from", filters.startDate);
  if (filters?.endDate) queryParams.append("to", filters.endDate);
  if (filters?.employeeId)
    queryParams.append("employee_id", filters.employeeId);
  if (filters?.status) queryParams.append("status", filters.status);
  if (filters?.limit) queryParams.append("limit", filters.limit.toString());
  else queryParams.append("limit", "100");
  if (filters?.offset) queryParams.append("offset", filters.offset.toString());

  // Include online transactions
  queryParams.append("includeOnline", "true");

  console.log("[StoreHub API] Fetching transactions with params:", {
    from: filters?.startDate,
    to: filters?.endDate,
    status: filters?.status,
    limit: filters?.limit || 100,
    includeOnline: true,
  });

  const endpoint = `/transactions${queryParams.toString() ? "?" + queryParams.toString() : ""}`;
  const rawTransactions =
    await makeApiRequest<Record<string, unknown>[]>(endpoint);

  // Log sample transaction to inspect structure
  if (rawTransactions.length > 0) {
    console.log("[StoreHub API] Sample raw transaction:", {
      sample: rawTransactions[0],
      fields: Object.keys(rawTransactions[0]),
      transactionType: rawTransactions[0].transactionType,
      channel: rawTransactions[0].channel,
      payments: rawTransactions[0].payments,
    });
  }

  // Fetch products for lookup
  const productLookup = new Map<string, { sku: string; name: string }>();
  try {
    const products = await getProducts({ limit: 500 });
    for (const product of products) {
      productLookup.set(product.id, {
        sku: product.sku,
        name: product.name,
      });
    }
  } catch {
    // Continue without product lookup
  }

  return rawTransactions.map((txn: Record<string, unknown>) => {
    const payments = txn.payments as Record<string, unknown>[] | undefined;
    const paymentMethod: "cash" | "card" | "qr" | "other" =
      transformPaymentMethod(payments);

    // Get transaction-level discount
    const transactionDiscount = (txn.discount as number) || 0;
    const transactionSubtotal = (txn.subTotal as number) || 0;

    // First pass: calculate items with their gross values
    const rawItems = ((txn.items as Record<string, unknown>[]) || []).map(
      (item: Record<string, unknown>) => {
        const productId = item.productId as string;
        const productInfo = productLookup.get(productId);

        const netTotal = (item.total as number) || 0;
        const itemLevelDiscount = (item.discount as number) || 0;
        const subTotal =
          typeof item.subTotal === "number" ? (item.subTotal as number) : 0;
        // Gross must always be before item-level discount
        const grossTotal = Math.max(subTotal, netTotal + itemLevelDiscount);
        const quantity = (item.quantity as number) || 0;

        return {
          productId,
          productInfo,
          netTotal,
          itemLevelDiscount,
          grossTotal,
          quantity,
          unitPrice: (item.unitPrice as number) || 0,
          sku: item.sku as string,
          productName: item.productName as string,
        };
      },
    );

    // Calculate total gross amount for proportional distribution
    const totalGross = rawItems.reduce((sum, item) => sum + item.grossTotal, 0);

    // Second pass: distribute transaction-level discount proportionally
    const items = rawItems.map((item) => {
      // Calculate proportional share of transaction discount
      const proportionalDiscount =
        totalGross > 0 && transactionDiscount > 0
          ? (item.grossTotal / totalGross) * transactionDiscount
          : 0;

      // Total discount = item-level discount + proportional transaction discount
      const totalItemDiscount = item.itemLevelDiscount + proportionalDiscount;

      // Net = gross - all discounts applicable to this item
      const netTotal = item.grossTotal - totalItemDiscount;

      return {
        sku: item.productInfo?.sku || item.sku || item.productId,
        productName:
          item.productInfo?.name ||
          item.productName ||
          `Item ${item.productId}`,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        totalPrice: netTotal,
        grossPrice: item.grossTotal,
        discount: totalItemDiscount,
        netUnitPrice: item.quantity > 0 ? netTotal / item.quantity : netTotal,
      };
    });

    return {
      id: (txn.refId as string) || (txn.id as string),
      receiptNumber: (txn.invoiceNumber as string) || "",
      timestamp: (txn.transactionTime as string) || "",
      storeId: (txn.storeId as string) || "",
      registerId: (txn.registerId as string) || "",
      employeeId: (txn.employeeId as string) || "",
      customerId: undefined,
      items,
      subtotal: transactionSubtotal,
      discount: transactionDiscount,
      tax: (txn.tax as number) || 0,
      total: (txn.total as number) || 0,
      paymentMethod,
      payments: payments
        ? (payments as Array<{
            paymentMethod: string;
            amount: number;
          }>)
        : undefined,
      status: (txn.isCancelled as boolean)
        ? "cancelled"
        : (txn.transactionType as string) === "Sale"
          ? "completed"
          : "pending",
      transactionType: (txn.transactionType as string) || undefined,
      channel: (txn.channel as string) || undefined,
      tableId: txn.tableId as string | null,
      serviceCharge: (txn.serviceCharge as number) || 0,
    };
  });
}

/**
 * Helper function to transform payment method from API format
 */
function transformPaymentMethod(
  payments: Record<string, unknown>[] | undefined,
): "cash" | "card" | "qr" | "other" {
  if (!payments || payments.length === 0) return "other";

  const method = ((payments[0].paymentMethod as string) || "").toLowerCase();

  if (method.includes("cash")) return "cash";
  if (
    method.includes("debit") ||
    method.includes("credit") ||
    method.includes("card")
  )
    return "card";
  if (method.includes("qr")) return "qr";

  return "other";
}

/**
 * Test API connection
 */
export async function testApiConnection(): Promise<boolean> {
  try {
    await makeApiRequest<Product[]>("/products?limit=1");
    console.log("✅ StoreHub API connection successful");
    return true;
  } catch (error) {
    console.error("❌ StoreHub API connection failed:", error);
    return false;
  }
}
