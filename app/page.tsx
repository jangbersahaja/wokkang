"use client";

import {
  CalendarDays,
  ChartColumn,
  CircleDollarSign,
  Receipt,
  Tags,
  WalletCards,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { AppHeader } from "../components/dashboard/AppHeader";
import { MetricCard } from "../components/dashboard/MetricCard";
import { PaymentMethodCard } from "../components/dashboard/PaymentMethodCard";
import { StatusBadge } from "../components/dashboard/StatusBadge";

interface Transaction {
  id: string;
  receiptNumber: string;
  timestamp: string;
  employeeId: string;
  items: Array<{
    productName: string;
    sku?: string;
    quantity: number;
    totalPrice: number;
    discount?: number;
    grossPrice?: number;
  }>;
  total: number;
  paymentMethod: string;
  payments?: Array<{
    paymentMethod: string;
    amount: number;
  }>;
  status: string;
  transactionType?: string;
  channel?: string;
  tableId?: string | null;
  discount?: number;
}

interface Stats {
  totalSales: number;
  transactionCount: number;
  averageTransaction: number;
  lastUpdated: string;
  paymentBreakdown: {
    [key: string]: {
      total: number;
      count: number;
    };
  };
  cancelledCount: number;
  cancelledTotal: number;
  totalDiscount: number;
  grossSales: number;
}

interface ProductSales {
  productName: string;
  sku: string;
  quantity: number;
  grossSales: number;
  discount: number;
  netSales: number;
  transactionCount: number;
  cost: number;
  totalCost: number;
}

type DateFilter = "today" | "yesterday" | "week" | "month" | "custom";

export default function LiveMonitorPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [stats, setStats] = useState<Stats>({
    totalSales: 0,
    transactionCount: 0,
    averageTransaction: 0,
    lastUpdated: "",
    paymentBreakdown: {},
    cancelledCount: 0,
    cancelledTotal: 0,
    totalDiscount: 0,
    grossSales: 0,
  });
  const [productSales, setProductSales] = useState<ProductSales[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [connectionStatus, setConnectionStatus] = useState<
    "checking" | "connected" | "disconnected"
  >("checking");
  const [isMounted, setIsMounted] = useState(false);
  const [dateFilter, setDateFilter] = useState<DateFilter>("today");
  const [customStartDate, setCustomStartDate] = useState("");
  const [customEndDate, setCustomEndDate] = useState("");
  const [session, setSession] = useState<{
    username: string;
    role: string;
  } | null>(null);

  // Test connection on mount
  useEffect(() => {
    setIsMounted(true);
    async function checkConnection() {
      try {
        const response = await fetch("/api/test");
        const data = await response.json();
        setConnectionStatus(data.success ? "connected" : "disconnected");
      } catch {
        setConnectionStatus("disconnected");
      }
    }
    checkConnection();

    async function loadSession() {
      try {
        const response = await fetch("/api/session");
        const data = await response.json();
        setSession(data.session);
      } catch {
        setSession(null);
      }
    }
    loadSession();
  }, []);

  const handleLogout = useCallback(async () => {
    await fetch("/api/logout", { method: "POST" });
    window.location.href = "/login";
  }, []);

  // Get date range based on filter (Malaysia timezone)
  const getDateRange = () => {
    // Get current time in Malaysia timezone (UTC+8)
    const nowMY = new Date(
      new Date().toLocaleString("en-US", { timeZone: "Asia/Kuala_Lumpur" }),
    );

    let startDate: Date;
    let endDate: Date;

    switch (dateFilter) {
      case "today":
        startDate = new Date(nowMY);
        startDate.setHours(0, 0, 0, 0);
        endDate = new Date(nowMY);
        endDate.setHours(23, 59, 59, 999);
        break;
      case "yesterday":
        const yesterday = new Date(nowMY);
        yesterday.setDate(yesterday.getDate() - 1);
        startDate = new Date(yesterday);
        startDate.setHours(0, 0, 0, 0);
        endDate = new Date(yesterday);
        endDate.setHours(23, 59, 59, 999);
        break;
      case "week":
        startDate = new Date(nowMY);
        startDate.setDate(startDate.getDate() - 7);
        startDate.setHours(0, 0, 0, 0);
        endDate = new Date(nowMY);
        endDate.setHours(23, 59, 59, 999);
        break;
      case "month":
        startDate = new Date(nowMY);
        startDate.setMonth(startDate.getMonth() - 1);
        startDate.setHours(0, 0, 0, 0);
        endDate = new Date(nowMY);
        endDate.setHours(23, 59, 59, 999);
        break;
      case "custom":
        if (!customStartDate || !customEndDate) {
          startDate = new Date(nowMY);
          startDate.setHours(0, 0, 0, 0);
          endDate = new Date(nowMY);
          endDate.setHours(23, 59, 59, 999);
        } else {
          // Parse custom dates in Malaysia timezone
          startDate = new Date(customStartDate + "T00:00:00+08:00");
          endDate = new Date(customEndDate + "T23:59:59+08:00");
        }
        break;
      default:
        startDate = new Date(nowMY);
        startDate.setHours(0, 0, 0, 0);
        endDate = new Date(nowMY);
        endDate.setHours(23, 59, 59, 999);
    }

    // Format dates in YYYY-MM-DD format for Malaysia timezone
    const formatDateMY = (date: Date) => {
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, "0");
      const day = String(date.getDate()).padStart(2, "0");
      return `${year}-${month}-${day}`;
    };

    return {
      startDate: formatDateMY(startDate),
      endDate: formatDateMY(endDate),
    };
  };

  // Fetch transactions
  const fetchTransactions = useCallback(async () => {
    try {
      setError(null);
      const { startDate, endDate } = getDateRange();

      console.log("[Frontend] Fetching transactions for date range:", {
        startDate,
        endDate,
        filter: dateFilter,
      });

      const response = await fetch(
        `/api/transactions?startDate=${startDate}&endDate=${endDate}&limit=500`,
      );

      if (!response.ok) {
        throw new Error("Failed to fetch transactions");
      }

      const result = await response.json();

      if (result.success && result.data) {
        let txns = result.data;

        console.log("[Frontend] Raw API response:", {
          totalCount: result.count,
          dataLength: txns.length,
          firstTransaction: txns[0],
          sampleTimestamps: txns
            .slice(0, 3)
            .map((t: Transaction) => t.timestamp),
        });

        // Client-side date filtering (API server-side filtering not working)
        const startDateTime = new Date(startDate + "T00:00:00+08:00").getTime();
        const endDateTime = new Date(endDate + "T23:59:59+08:00").getTime();

        console.log("[Frontend] Filter range:", {
          startDate,
          endDate,
          startDateTime: new Date(startDateTime).toISOString(),
          endDateTime: new Date(endDateTime).toISOString(),
        });

        const beforeFilter = txns.length;
        txns = txns.filter((t: Transaction) => {
          const txnTime = new Date(t.timestamp).getTime();
          return txnTime >= startDateTime && txnTime <= endDateTime;
        });

        console.log("[Frontend] Filtered transactions:", {
          apiReturned: result.data.length,
          beforeFilter,
          afterFilter: txns.length,
          dateRange: { startDate, endDate },
          sampleFiltered: txns.slice(0, 3).map((t: Transaction) => ({
            receipt: t.receiptNumber,
            timestamp: t.timestamp,
          })),
        });

        // If no transactions match the filter, show a helpful message
        if (txns.length === 0 && result.data.length > 0) {
          // Get date range of available data
          const allTimestamps = result.data.map((t: Transaction) =>
            new Date(t.timestamp).getTime(),
          );
          const minDate = new Date(Math.min(...allTimestamps));
          const maxDate = new Date(Math.max(...allTimestamps));

          setError(
            `No transactions found for ${getDateFilterLabel()}. ` +
              `Available data ranges from ${minDate.toLocaleDateString("en-MY", { timeZone: "Asia/Kuala_Lumpur" })} ` +
              `to ${maxDate.toLocaleDateString("en-MY", { timeZone: "Asia/Kuala_Lumpur" })}`,
          );
        }

        // Sort transactions by timestamp descending (latest first)
        txns.sort((a: Transaction, b: Transaction) => {
          return (
            new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
          );
        });

        setTransactions(txns);

        // Calculate stats
        const completed = txns.filter(
          (t: Transaction) => t.status === "completed",
        );
        const cancelled = txns.filter(
          (t: Transaction) => t.status === "cancelled",
        );

        // transaction.total = gross price (before discount)
        // Gross sales = sum of transaction.total
        const grossSales = completed.reduce(
          (sum: number, t: Transaction) => sum + t.total,
          0,
        );
        const totalDiscount = completed.reduce(
          (sum: number, t: Transaction) => sum + (t.discount || 0),
          0,
        );
        // Net sales = gross sales - discounts (actual revenue received)
        const totalSales = grossSales - totalDiscount;
        const cancelledTotal = cancelled.reduce(
          (sum: number, t: Transaction) => sum + t.total,
          0,
        );
        const avgTransaction =
          completed.length > 0 ? totalSales / completed.length : 0;

        // Calculate payment breakdown
        const paymentBreakdown: {
          [key: string]: { total: number; count: number };
        } = {};

        completed.forEach((t: Transaction) => {
          const paymentMethod =
            t.payments && t.payments.length > 0
              ? t.payments[0].paymentMethod
              : t.paymentMethod;

          if (!paymentBreakdown[paymentMethod]) {
            paymentBreakdown[paymentMethod] = { total: 0, count: 0 };
          }
          // Use net amount (after discount) for payment breakdown
          const netAmount = t.total - (t.discount || 0);
          paymentBreakdown[paymentMethod].total += netAmount;
          paymentBreakdown[paymentMethod].count += 1;
        });

        setStats({
          totalSales,
          transactionCount: completed.length,
          averageTransaction: avgTransaction,
          paymentBreakdown,
          cancelledCount: cancelled.length,
          cancelledTotal,
          totalDiscount,
          grossSales,
          lastUpdated: new Date().toLocaleTimeString("en-MY", {
            timeZone: "Asia/Kuala_Lumpur",
          }),
        });

        // Calculate product sales
        const productMap = new Map<string, ProductSales>();

        // Fetch products to get cost data
        let productCostMap = new Map<string, number>();
        try {
          const productsResponse = await fetch("/api/products");
          if (productsResponse.ok) {
            const productsData = await productsResponse.json();
            if (productsData.success && productsData.data) {
              productsData.data.forEach((product: any) => {
                productCostMap.set(product.sku, product.cost || 0);
              });
            }
          }
        } catch (error) {
          console.error("Failed to fetch product costs:", error);
        }

        completed.forEach((t: Transaction) => {
          t.items.forEach((item) => {
            const key = `${item.sku || "unknown"}-${item.productName}`;
            const existing = productMap.get(key);
            const itemSku = item.sku || "N/A";
            const unitCost = productCostMap.get(itemSku) || 0;

            if (existing) {
              existing.quantity += item.quantity;
              existing.grossSales += item.grossPrice || item.totalPrice;
              existing.discount += item.discount || 0;
              existing.netSales += item.totalPrice;
              existing.transactionCount += 1;
              existing.totalCost += unitCost * item.quantity;
            } else {
              productMap.set(key, {
                productName: item.productName,
                sku: itemSku,
                quantity: item.quantity,
                grossSales: item.grossPrice || item.totalPrice,
                discount: item.discount || 0,
                netSales: item.totalPrice,
                transactionCount: 1,
                cost: unitCost,
                totalCost: unitCost * item.quantity,
              });
            }
          });
        });

        const productSalesArray = Array.from(productMap.values());
        productSalesArray.sort((a, b) => b.netSales - a.netSales);
        setProductSales(productSalesArray);
      }

      setLoading(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
      setLoading(false);
    }
  }, [dateFilter, customStartDate, customEndDate]);

  // Initial fetch
  useEffect(() => {
    fetchTransactions();
  }, [fetchTransactions]);

  // Auto-refresh every 30 seconds
  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(() => {
      fetchTransactions();
    }, 30000);

    return () => clearInterval(interval);
  }, [autoRefresh, fetchTransactions]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-MY", {
      style: "currency",
      currency: "MYR",
    }).format(amount);
  };

  const formatTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString("en-MY", {
      hour: "2-digit",
      minute: "2-digit",
      timeZone: "Asia/Kuala_Lumpur",
    });
  };

  const formatDate = (timestamp: string) => {
    return new Date(timestamp).toLocaleDateString("en-MY", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      timeZone: "Asia/Kuala_Lumpur",
    });
  };

  const getDateFilterLabel = () => {
    switch (dateFilter) {
      case "today":
        return "Today";
      case "yesterday":
        return "Yesterday";
      case "week":
        return "Last 7 Days";
      case "month":
        return "Last 30 Days";
      case "custom":
        return customStartDate && customEndDate
          ? `${formatDate(customStartDate)} - ${formatDate(customEndDate)}`
          : "Custom Range";
      default:
        return "Today";
    }
  };

  const getPaymentDisplay = (transaction: Transaction) => {
    // Use actual payment method from payments array if available
    if (transaction.payments && transaction.payments.length > 0) {
      return transaction.payments[0].paymentMethod;
    }
    return transaction.paymentMethod;
  };

  const getChannelBadge = (channel?: string) => {
    if (!channel || channel === "OFFLINE_PAYMENTS") {
      return null;
    }
    // Online channels like GrabFood, Foodpanda, etc.
    return (
      <span className="ml-2 rounded-full bg-[var(--wk-brand)]/10 px-2 py-1 text-xs font-bold text-[var(--wk-brand)]">
        {channel.replace(/_/g, " ")}
      </span>
    );
  };

  return (
    <div className="min-h-screen">
      <AppHeader
        autoRefresh={autoRefresh}
        connectionStatus={connectionStatus}
        isLoading={loading}
        lastUpdated={isMounted ? stats.lastUpdated : ""}
        onRefresh={fetchTransactions}
        onToggleAutoRefresh={() => setAutoRefresh(!autoRefresh)}
        username={session?.username}
        canManageAccounts={
          session?.role === "SUPER_ADMIN" || session?.role === "ADMIN"
        }
        onLogout={handleLogout}
      />

      <main className="mx-auto max-w-7xl px-4 py-7 sm:px-6 lg:px-8 lg:py-10">
        {/* Date Filter */}
        <section className="mb-8 border-b border-[var(--wk-line)] pb-7">
          <div className="mb-5 flex flex-col justify-between gap-4 md:flex-row md:items-end">
            <div>
              <div className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.1em] text-[var(--wk-brand)]">
                <span className="h-2 w-2 rounded-full bg-[var(--wk-cyan)]" />{" "}
                Live operations
              </div>
              <h1 className="text-3xl font-black tracking-[0.01em] text-[var(--wk-ink)] sm:text-4xl">
                Sales pulse
              </h1>
              <p className="mt-2 text-sm font-medium text-[var(--wk-muted)]">
                StoreHub performance for {getDateFilterLabel().toLowerCase()}.
              </p>
            </div>
            <div className="flex items-center gap-2 text-xs font-bold text-[var(--wk-muted)]">
              <CalendarDays
                className="h-4 w-4 text-[var(--wk-brand)]"
                aria-hidden="true"
              />
              Malaysia time (UTC+8)
            </div>
          </div>
          <div className="flex gap-1.5 overflow-x-auto pb-1 sm:flex-wrap">
            {(
              [
                ["today", "Today"],
                ["yesterday", "Yesterday"],
                ["week", "7 Days"],
                ["month", "30 Days"],
                ["custom", "Custom"],
              ] as [DateFilter, string][]
            ).map(([key, label]) => (
              <button
                key={key}
                onClick={() => setDateFilter(key)}
                className={`shrink-0 rounded-md px-3 py-2 text-xs font-bold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--wk-brand)] ${
                  dateFilter === key
                    ? "bg-[var(--wk-ink)] text-white shadow-[3px_3px_0_var(--wk-cyan)]"
                    : "border border-[var(--wk-line-strong)] bg-white text-[var(--wk-muted)] hover:border-[var(--wk-ink)] hover:text-[var(--wk-ink)]"
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          {dateFilter === "custom" && (
            <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
              <input
                type="date"
                value={customStartDate}
                onChange={(e) => setCustomStartDate(e.target.value)}
                className="rounded-md border border-[var(--wk-line-strong)] bg-white px-3 py-2 text-sm font-medium text-[var(--wk-ink)] focus:outline-2 focus:outline-offset-2 focus:outline-[var(--wk-brand)]"
              />
              <input
                type="date"
                value={customEndDate}
                onChange={(e) => setCustomEndDate(e.target.value)}
                className="rounded-md border border-[var(--wk-line-strong)] bg-white px-3 py-2 text-sm font-medium text-[var(--wk-ink)] focus:outline-2 focus:outline-offset-2 focus:outline-[var(--wk-brand)]"
              />
            </div>
          )}
        </section>

        {/* Stats Cards */}
        <section className="mb-8">
          <div className="mb-3 flex items-center justify-between gap-4">
            <h2 className="text-sm font-black uppercase tracking-[0.08em] text-[var(--wk-ink)]">
              Performance
            </h2>
            <span className="text-xs font-semibold text-[var(--wk-muted)]">
              Live calculation
            </span>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
            <MetricCard
              label="Gross sales"
              value={formatCurrency(stats.grossSales)}
              icon={<CircleDollarSign className="h-4 w-4" aria-hidden="true" />}
            />
            <MetricCard
              label="Net sales"
              value={formatCurrency(stats.totalSales)}
              tone="success"
              icon={<ChartColumn className="h-4 w-4" aria-hidden="true" />}
            />
            <MetricCard
              label="Discounts"
              value={formatCurrency(stats.totalDiscount)}
              detail={
                stats.grossSales > 0
                  ? `${((stats.totalDiscount / stats.grossSales) * 100).toFixed(1)}% of gross sales`
                  : "No discounts applied"
              }
              tone="warning"
              icon={<Tags className="h-4 w-4" aria-hidden="true" />}
            />
            <MetricCard
              label="Transactions"
              value={String(stats.transactionCount)}
              icon={<Receipt className="h-4 w-4" aria-hidden="true" />}
            />
            <MetricCard
              label="Average ticket"
              value={formatCurrency(stats.averageTransaction)}
              icon={<WalletCards className="h-4 w-4" aria-hidden="true" />}
            />
          </div>
        </section>

        {/* Cancelled */}
        {stats.cancelledCount > 0 && (
          <div className="mb-8 flex items-center justify-between gap-3 border border-[var(--wk-danger)] bg-[var(--wk-danger-soft)] px-4 py-3">
            <div className="text-xs font-bold text-[var(--wk-danger)]">
              {stats.cancelledCount} cancelled transaction
              {stats.cancelledCount > 1 ? "s" : ""}
            </div>
            <div className="text-sm font-black text-[var(--wk-danger)] tabular-nums">
              -{formatCurrency(stats.cancelledTotal)}
            </div>
          </div>
        )}

        {/* Payment Breakdown Cards */}
        {Object.keys(stats.paymentBreakdown).length > 0 && (
          <section className="mb-9">
            <div className="mb-3 flex items-center justify-between gap-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.08em] text-[var(--wk-brand)]">
                  Payments
                </p>
                <h2 className="mt-1 text-xl font-black text-[var(--wk-ink)]">
                  Where sales landed
                </h2>
              </div>
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
              {Object.entries(stats.paymentBreakdown)
                .sort((a, b) => b[1].total - a[1].total)
                .map(([method, data]) => (
                  <PaymentMethodCard
                    key={method}
                    method={method}
                    count={data.count}
                    total={formatCurrency(data.total)}
                    percentage={
                      stats.totalSales > 0
                        ? (data.total / stats.totalSales) * 100
                        : 0
                    }
                  />
                ))}
            </div>
          </section>
        )}

        {/* Sales by Products Table */}
        {productSales.length > 0 && (
          <section className="mb-9">
            <div className="mb-3">
              <p className="text-xs font-bold uppercase tracking-[0.08em] text-[var(--wk-brand)]">
                Products
              </p>
              <h2 className="mt-1 text-xl font-black text-[var(--wk-ink)]">
                What is moving
              </h2>
            </div>
            <div className="overflow-hidden border border-[var(--wk-line-strong)] bg-white shadow-[0_1px_0_rgb(16_23_42_/_0.02)]">
              {/* Mobile Card View */}
              <div className="block divide-y divide-[var(--wk-line)] lg:hidden">
                {productSales.slice(0, 20).map((product, idx) => (
                  <div key={idx} className="p-4">
                    <div className="flex justify-between items-start gap-2">
                      <div className="min-w-0">
                        <div className="truncate text-sm font-bold text-[var(--wk-ink)]">
                          {product.productName}
                        </div>
                        <div className="text-[11px] font-medium text-[var(--wk-faint)]">
                          {product.sku}
                        </div>
                      </div>
                      <span className="shrink-0 rounded-full bg-[var(--wk-brand)]/10 px-2 py-0.5 text-[11px] font-bold text-[var(--wk-brand)]">
                        {product.quantity}x
                      </span>
                    </div>
                    <div className="mt-3 grid grid-cols-2 gap-x-3 gap-y-2 text-xs sm:grid-cols-4">
                      <div>
                        <div className="text-[10px] font-bold uppercase tracking-[0.06em] text-[var(--wk-faint)]">
                          Gross
                        </div>
                        <div className="font-semibold tabular-nums text-[var(--wk-ink)]">
                          {formatCurrency(product.grossSales)}
                        </div>
                      </div>
                      <div>
                        <div className="text-[10px] font-bold uppercase tracking-[0.06em] text-[var(--wk-faint)]">
                          Disc
                        </div>
                        <div className="font-semibold text-[var(--wk-warning)] tabular-nums">
                          {product.discount > 0
                            ? `-${formatCurrency(product.discount)}`
                            : "–"}
                        </div>
                      </div>
                      <div>
                        <div className="text-[10px] font-bold uppercase tracking-[0.06em] text-[var(--wk-faint)]">
                          Net
                        </div>
                        <div className="font-bold text-[var(--wk-success)] tabular-nums">
                          {formatCurrency(product.netSales)}
                        </div>
                      </div>
                      <div>
                        <div className="text-[10px] font-bold uppercase tracking-[0.06em] text-[var(--wk-faint)]">
                          Profit
                        </div>
                        <div className="font-bold text-[var(--wk-brand)] tabular-nums">
                          {formatCurrency(product.netSales - product.totalCost)}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Desktop Table View */}
              <div className="hidden overflow-x-auto lg:block">
                <table className="min-w-full divide-y divide-[var(--wk-line)] text-sm">
                  <thead className="bg-[var(--wk-canvas)]">
                    <tr className="text-[11px] font-bold uppercase tracking-[0.07em] text-[var(--wk-muted)]">
                      <th className="px-4 py-3 text-left font-bold">#</th>
                      <th className="px-4 py-3 text-left font-bold">Product</th>
                      <th className="px-4 py-3 text-left font-bold">SKU</th>
                      <th className="px-4 py-3 text-right font-bold">Qty</th>
                      <th className="px-4 py-3 text-right font-bold">Gross</th>
                      <th className="px-4 py-3 text-right font-bold">
                        Discount
                      </th>
                      <th className="px-4 py-3 text-right font-bold">Net</th>
                      <th className="px-4 py-3 text-right font-bold">Cost</th>
                      <th className="px-4 py-3 text-right font-bold">Profit</th>
                      <th className="px-4 py-3 text-right font-bold">Txns</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--wk-line)] bg-white">
                    {productSales.slice(0, 20).map((product, idx) => (
                      <tr
                        key={idx}
                        className="transition-colors hover:bg-[var(--wk-canvas)]"
                      >
                        <td className="px-4 py-3 font-medium text-[var(--wk-faint)]">
                          {idx + 1}
                        </td>
                        <td className="px-4 py-3 font-bold text-[var(--wk-ink)]">
                          {product.productName}
                        </td>
                        <td className="px-4 py-3 text-xs font-medium text-[var(--wk-muted)]">
                          {product.sku}
                        </td>
                        <td className="px-4 py-3 text-right font-semibold text-[var(--wk-ink)] tabular-nums">
                          {product.quantity}
                        </td>
                        <td className="px-4 py-3 text-right text-[var(--wk-ink)] tabular-nums">
                          {formatCurrency(product.grossSales)}
                        </td>
                        <td className="px-4 py-3 text-right text-[var(--wk-warning)] tabular-nums">
                          {product.discount > 0
                            ? `-${formatCurrency(product.discount)}`
                            : "–"}
                        </td>
                        <td className="px-4 py-3 text-right font-bold text-[var(--wk-success)] tabular-nums">
                          {formatCurrency(product.netSales)}
                        </td>
                        <td className="px-4 py-3 text-right text-[var(--wk-muted)] tabular-nums">
                          {formatCurrency(product.totalCost)}
                        </td>
                        <td className="px-4 py-3 text-right font-bold text-[var(--wk-brand)] tabular-nums">
                          {formatCurrency(product.netSales - product.totalCost)}
                        </td>
                        <td className="px-4 py-3 text-right text-[var(--wk-muted)] tabular-nums">
                          {product.transactionCount}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </section>
        )}

        {/* Error Message */}
        {error && (
          <div className="mb-6 border border-[var(--wk-danger)] bg-[var(--wk-danger-soft)] px-4 py-3 text-xs font-bold text-[var(--wk-danger)]">
            {error}
          </div>
        )}

        {/* Transactions Table */}
        <section>
          <div className="mb-3 flex items-end justify-between gap-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.08em] text-[var(--wk-brand)]">
                Activity
              </p>
              <h2 className="mt-1 text-xl font-black text-[var(--wk-ink)]">
                Recent transactions
              </h2>
            </div>
            <span className="text-xs font-semibold text-[var(--wk-muted)]">
              {transactions.length} shown
            </span>
          </div>
          <div className="overflow-hidden border border-[var(--wk-line-strong)] bg-white shadow-[0_1px_0_rgb(16_23_42_/_0.02)]">
            {/* Mobile Card View */}
            <div className="block lg:hidden">
              {loading && transactions.length === 0 ? (
                <div className="px-4 py-12 text-center text-sm font-medium text-[var(--wk-muted)]">
                  Loading transactions...
                </div>
              ) : transactions.length === 0 ? (
                <div className="px-4 py-12 text-center text-sm font-medium text-[var(--wk-muted)]">
                  No transactions found for {getDateFilterLabel().toLowerCase()}
                </div>
              ) : (
                <div className="divide-y divide-[var(--wk-line)]">
                  {transactions.map((transaction) => {
                    const hasDiscount = (transaction.discount ?? 0) > 0;
                    return (
                      <div
                        key={transaction.id}
                        className={`px-4 py-3 ${hasDiscount ? "bg-[var(--wk-warning-soft)]/60" : ""}`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5">
                              <span className="truncate text-xs font-bold text-[var(--wk-ink)]">
                                {transaction.receiptNumber}
                              </span>
                              {transaction.status !== "completed" && (
                                <StatusBadge status={transaction.status} />
                              )}
                            </div>
                            <div className="mt-0.5 text-[11px] font-medium text-[var(--wk-muted)]">
                              {formatDate(transaction.timestamp)}{" "}
                              {formatTime(transaction.timestamp)} ·{" "}
                              {getPaymentDisplay(transaction)}
                            </div>
                          </div>
                          <div className="text-right shrink-0">
                            <div className="text-sm font-black text-[var(--wk-success)] tabular-nums">
                              {formatCurrency(
                                transaction.total - (transaction.discount || 0),
                              )}
                            </div>
                            {hasDiscount && (
                              <div className="text-[10px] font-bold text-[var(--wk-warning)] tabular-nums">
                                -{formatCurrency(transaction.discount!)}
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="mt-2 truncate text-[11px] font-medium text-[var(--wk-muted)]">
                          {transaction.items
                            .slice(0, 3)
                            .map((i) => `${i.quantity}× ${i.productName}`)
                            .join(", ")}
                          {transaction.items.length > 3 &&
                            ` +${transaction.items.length - 3}`}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Desktop Table View */}
            <div className="hidden lg:block overflow-x-auto">
              {loading && transactions.length === 0 ? (
                <div className="px-6 py-12 text-center text-sm font-medium text-[var(--wk-muted)]">
                  Loading transactions...
                </div>
              ) : transactions.length === 0 ? (
                <div className="px-6 py-12 text-center text-sm font-medium text-[var(--wk-muted)]">
                  No transactions found for {getDateFilterLabel().toLowerCase()}
                </div>
              ) : (
                <table className="min-w-full divide-y divide-[var(--wk-line)] text-sm">
                  <thead className="bg-[var(--wk-canvas)]">
                    <tr className="text-[11px] font-bold uppercase tracking-[0.07em] text-[var(--wk-muted)]">
                      <th className="px-4 py-3 text-left font-bold">
                        Date &amp; Time
                      </th>
                      <th className="px-4 py-3 text-left font-bold">Receipt</th>
                      <th className="px-4 py-3 text-left font-bold">Items</th>
                      <th className="px-4 py-3 text-left font-bold">Payment</th>
                      <th className="px-4 py-3 text-right font-bold">
                        Subtotal
                      </th>
                      <th className="px-4 py-3 text-right font-bold">
                        Discount
                      </th>
                      <th className="px-4 py-3 text-right font-bold">Total</th>
                      <th className="px-4 py-3 text-left font-bold">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--wk-line)] bg-white">
                    {transactions.map((transaction) => {
                      const hasDiscount = (transaction.discount ?? 0) > 0;
                      return (
                        <tr
                          key={transaction.id}
                          className={`transition-colors hover:bg-[var(--wk-canvas)] ${hasDiscount ? "bg-[var(--wk-warning-soft)]/60" : ""}`}
                        >
                          <td className="whitespace-nowrap px-4 py-3 text-[var(--wk-ink)]">
                            <div className="text-xs">
                              {formatDate(transaction.timestamp)}
                            </div>
                            <div className="text-[11px] font-medium text-[var(--wk-muted)]">
                              {formatTime(transaction.timestamp)}
                            </div>
                          </td>
                          <td className="whitespace-nowrap px-4 py-3 text-xs font-bold text-[var(--wk-ink)]">
                            {transaction.receiptNumber}
                          </td>
                          <td className="max-w-xs truncate px-4 py-3 text-xs font-medium text-[var(--wk-muted)]">
                            {transaction.items
                              .slice(0, 3)
                              .map((i) => `${i.quantity}× ${i.productName}`)
                              .join(", ")}
                            {transaction.items.length > 3 &&
                              ` +${transaction.items.length - 3}`}
                          </td>
                          <td className="whitespace-nowrap px-4 py-3">
                            <span className="rounded-md bg-[var(--wk-canvas)] px-2 py-1 text-[11px] font-bold text-[var(--wk-muted)]">
                              {getPaymentDisplay(transaction)}
                            </span>
                          </td>
                          <td className="whitespace-nowrap px-4 py-3 text-right text-[var(--wk-ink)] tabular-nums">
                            {formatCurrency(transaction.total)}
                          </td>
                          <td className="whitespace-nowrap px-4 py-3 text-right text-[var(--wk-warning)] tabular-nums">
                            {hasDiscount
                              ? `-${formatCurrency(transaction.discount!)}`
                              : "–"}
                          </td>
                          <td className="whitespace-nowrap px-4 py-3 text-right font-bold text-[var(--wk-success)] tabular-nums">
                            {formatCurrency(
                              transaction.total - (transaction.discount || 0),
                            )}
                          </td>
                          <td className="whitespace-nowrap px-4 py-3">
                            <StatusBadge status={transaction.status} />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
