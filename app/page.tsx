"use client";

import { useCallback, useEffect, useState } from "react";

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
      <span className="ml-2 px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs">
        {channel.replace(/_/g, " ")}
      </span>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white/95 backdrop-blur border-b border-gray-200 sticky top-0 z-20">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-2.5 sm:py-3">
          <div className="flex items-center justify-between gap-2">
            <div className="min-w-0">
              <h1 className="text-base sm:text-xl font-bold text-gray-900 truncate">
                StoreHub Live Monitor
              </h1>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span
                  className={`w-2 h-2 rounded-full ${
                    connectionStatus === "connected"
                      ? "bg-green-500"
                      : connectionStatus === "disconnected"
                        ? "bg-red-500"
                        : "bg-yellow-500 animate-pulse"
                  }`}
                />
                <span className="text-[11px] text-gray-500">
                  {connectionStatus === "connected"
                    ? "Connected"
                    : connectionStatus === "disconnected"
                      ? "Disconnected"
                      : "Checking..."}
                  {isMounted && stats.lastUpdated
                    ? ` · ${stats.lastUpdated}`
                    : ""}
                </span>
              </div>
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              <button
                onClick={() => setAutoRefresh(!autoRefresh)}
                title="Toggle auto-refresh"
                className={`px-2.5 py-1.5 rounded-md text-xs font-medium border ${
                  autoRefresh
                    ? "bg-blue-600 text-white border-blue-600"
                    : "bg-white text-gray-600 border-gray-300"
                }`}
              >
                Auto {autoRefresh ? "ON" : "OFF"}
              </button>
              <button
                onClick={fetchTransactions}
                disabled={loading}
                className="px-2.5 py-1.5 bg-gray-900 text-white rounded-md text-xs font-medium hover:bg-gray-800 disabled:opacity-50"
              >
                {loading ? "..." : "Refresh"}
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-6">
        {/* Date Filter */}
        <div className="mb-4">
          <div className="flex gap-1.5 overflow-x-auto pb-1 -mx-3 px-3 sm:mx-0 sm:px-0 sm:flex-wrap">
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
                className={`shrink-0 px-3 py-1.5 rounded-full text-xs sm:text-sm font-medium transition-colors ${
                  dateFilter === key
                    ? "bg-blue-600 text-white"
                    : "bg-white text-gray-600 border border-gray-200 hover:bg-gray-50"
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          {dateFilter === "custom" && (
            <div className="grid grid-cols-2 gap-2 mt-2">
              <input
                type="date"
                value={customStartDate}
                onChange={(e) => setCustomStartDate(e.target.value)}
                className="px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
              <input
                type="date"
                value={customEndDate}
                onChange={(e) => setCustomEndDate(e.target.value)}
                className="px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          )}
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 sm:gap-3 mb-4">
          <div className="bg-white rounded-xl border border-gray-200 p-3">
            <div className="text-[11px] font-medium text-gray-500 uppercase tracking-wide">
              Gross Sales
            </div>
            <div className="mt-1 text-lg sm:text-xl font-bold text-gray-900 tabular-nums">
              {formatCurrency(stats.grossSales)}
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-3">
            <div className="text-[11px] font-medium text-gray-500 uppercase tracking-wide">
              Net Sales
            </div>
            <div className="mt-1 text-lg sm:text-xl font-bold text-green-600 tabular-nums">
              {formatCurrency(stats.totalSales)}
            </div>
          </div>

          <div className="bg-orange-50 rounded-xl border border-orange-200 p-3">
            <div className="text-[11px] font-medium text-orange-700 uppercase tracking-wide">
              Discounts
            </div>
            <div className="mt-1 text-lg sm:text-xl font-bold text-orange-600 tabular-nums">
              {formatCurrency(stats.totalDiscount)}
            </div>
            <div className="text-[11px] text-orange-500">
              {stats.grossSales > 0
                ? `${((stats.totalDiscount / stats.grossSales) * 100).toFixed(1)}% off`
                : "0% off"}
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-3">
            <div className="text-[11px] font-medium text-gray-500 uppercase tracking-wide">
              Transactions
            </div>
            <div className="mt-1 text-lg sm:text-xl font-bold text-gray-900 tabular-nums">
              {stats.transactionCount}
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-3">
            <div className="text-[11px] font-medium text-gray-500 uppercase tracking-wide">
              Avg Ticket
            </div>
            <div className="mt-1 text-lg sm:text-xl font-bold text-gray-900 tabular-nums">
              {formatCurrency(stats.averageTransaction)}
            </div>
          </div>
        </div>

        {/* Cancelled */}
        {stats.cancelledCount > 0 && (
          <div className="flex items-center justify-between gap-3 bg-red-50 border border-red-200 rounded-xl px-3 py-2.5 mb-4">
            <div className="text-xs font-medium text-red-800">
              {stats.cancelledCount} cancelled transaction
              {stats.cancelledCount > 1 ? "s" : ""}
            </div>
            <div className="text-sm font-bold text-red-900 tabular-nums">
              -{formatCurrency(stats.cancelledTotal)}
            </div>
          </div>
        )}

        {/* Payment Breakdown Cards */}
        {Object.keys(stats.paymentBreakdown).length > 0 && (
          <div className="mb-5">
            <h3 className="text-sm font-semibold text-gray-900 mb-2">
              Sales by Payment Method
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
              {Object.entries(stats.paymentBreakdown)
                .sort((a, b) => b[1].total - a[1].total)
                .map(([method, data]) => (
                  <div
                    key={method}
                    className="bg-white border border-gray-200 rounded-xl p-3"
                  >
                    <div className="flex items-center justify-between gap-1 mb-1">
                      <div className="text-[11px] font-medium text-gray-600 truncate">
                        {method}
                      </div>
                      <div className="text-[10px] text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded shrink-0">
                        {data.count}
                      </div>
                    </div>
                    <div className="text-base sm:text-lg font-bold text-gray-900 tabular-nums">
                      {formatCurrency(data.total)}
                    </div>
                    <div className="mt-1 h-1 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-blue-500"
                        style={{
                          width: `${stats.totalSales > 0 ? (data.total / stats.totalSales) * 100 : 0}%`,
                        }}
                      />
                    </div>
                    <div className="mt-1 text-[11px] text-gray-500">
                      {stats.totalSales > 0
                        ? ((data.total / stats.totalSales) * 100).toFixed(1)
                        : "0.0"}
                      %
                    </div>
                  </div>
                ))}
            </div>
          </div>
        )}

        {/* Sales by Products Table */}
        {productSales.length > 0 && (
          <div className="mb-5">
            <h3 className="text-sm font-semibold text-gray-900 mb-2">
              Sales by Products
            </h3>
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              {/* Mobile Card View */}
              <div className="block lg:hidden divide-y divide-gray-100">
                {productSales.slice(0, 20).map((product, idx) => (
                  <div key={idx} className="p-3">
                    <div className="flex justify-between items-start gap-2">
                      <div className="min-w-0">
                        <div className="font-medium text-gray-900 text-sm truncate">
                          {product.productName}
                        </div>
                        <div className="text-[11px] text-gray-400">
                          {product.sku}
                        </div>
                      </div>
                      <span className="shrink-0 px-2 py-0.5 bg-blue-50 text-blue-700 rounded-full text-[11px] font-semibold">
                        {product.quantity}x
                      </span>
                    </div>
                    <div className="grid grid-cols-4 gap-1.5 mt-2 text-xs">
                      <div>
                        <div className="text-[10px] text-gray-400">Gross</div>
                        <div className="font-medium tabular-nums">
                          {formatCurrency(product.grossSales)}
                        </div>
                      </div>
                      <div>
                        <div className="text-[10px] text-gray-400">Disc</div>
                        <div className="font-medium text-orange-600 tabular-nums">
                          {product.discount > 0
                            ? `-${formatCurrency(product.discount)}`
                            : "–"}
                        </div>
                      </div>
                      <div>
                        <div className="text-[10px] text-gray-400">Net</div>
                        <div className="font-semibold text-green-600 tabular-nums">
                          {formatCurrency(product.netSales)}
                        </div>
                      </div>
                      <div>
                        <div className="text-[10px] text-gray-400">Profit</div>
                        <div className="font-semibold text-blue-600 tabular-nums">
                          {formatCurrency(product.netSales - product.totalCost)}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Desktop Table View */}
              <div className="hidden lg:block overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 text-sm">
                  <thead className="bg-gray-50">
                    <tr className="text-[11px] uppercase tracking-wide text-gray-500">
                      <th className="px-3 py-2 text-left font-medium">#</th>
                      <th className="px-3 py-2 text-left font-medium">
                        Product
                      </th>
                      <th className="px-3 py-2 text-left font-medium">SKU</th>
                      <th className="px-3 py-2 text-right font-medium">Qty</th>
                      <th className="px-3 py-2 text-right font-medium">
                        Gross
                      </th>
                      <th className="px-3 py-2 text-right font-medium">
                        Discount
                      </th>
                      <th className="px-3 py-2 text-right font-medium">Net</th>
                      <th className="px-3 py-2 text-right font-medium">Cost</th>
                      <th className="px-3 py-2 text-right font-medium">
                        Profit
                      </th>
                      <th className="px-3 py-2 text-right font-medium">Txns</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-100">
                    {productSales.slice(0, 20).map((product, idx) => (
                      <tr key={idx} className="hover:bg-gray-50">
                        <td className="px-3 py-2 text-gray-400">{idx + 1}</td>
                        <td className="px-3 py-2 font-medium text-gray-900">
                          {product.productName}
                        </td>
                        <td className="px-3 py-2 text-gray-500 text-xs">
                          {product.sku}
                        </td>
                        <td className="px-3 py-2 text-right font-medium text-gray-900 tabular-nums">
                          {product.quantity}
                        </td>
                        <td className="px-3 py-2 text-right text-gray-900 tabular-nums">
                          {formatCurrency(product.grossSales)}
                        </td>
                        <td className="px-3 py-2 text-right text-orange-600 tabular-nums">
                          {product.discount > 0
                            ? `-${formatCurrency(product.discount)}`
                            : "–"}
                        </td>
                        <td className="px-3 py-2 text-right font-semibold text-green-600 tabular-nums">
                          {formatCurrency(product.netSales)}
                        </td>
                        <td className="px-3 py-2 text-right text-gray-500 tabular-nums">
                          {formatCurrency(product.totalCost)}
                        </td>
                        <td className="px-3 py-2 text-right font-semibold text-blue-600 tabular-nums">
                          {formatCurrency(product.netSales - product.totalCost)}
                        </td>
                        <td className="px-3 py-2 text-right text-gray-500 tabular-nums">
                          {product.transactionCount}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl px-3 py-2 mb-4 text-xs text-red-800">
            {error}
          </div>
        )}

        {/* Transactions Table */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-3 sm:px-4 py-2.5 border-b border-gray-200 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-gray-900">
              Recent Transactions
            </h2>
            <span className="text-[11px] text-gray-500">
              {transactions.length} shown
            </span>
          </div>

          {/* Mobile Card View */}
          <div className="block lg:hidden">
            {loading && transactions.length === 0 ? (
              <div className="px-4 py-10 text-center text-sm text-gray-500">
                Loading transactions...
              </div>
            ) : transactions.length === 0 ? (
              <div className="px-4 py-10 text-center text-sm text-gray-500">
                No transactions found for {getDateFilterLabel().toLowerCase()}
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {transactions.map((transaction) => {
                  const hasDiscount = (transaction.discount ?? 0) > 0;
                  return (
                    <div
                      key={transaction.id}
                      className={`px-3 py-2.5 ${hasDiscount ? "bg-orange-50/60" : ""}`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="font-medium text-gray-900 text-xs truncate">
                              {transaction.receiptNumber}
                            </span>
                            {transaction.status !== "completed" && (
                              <span
                                className={`px-1.5 py-0.5 text-[10px] rounded-full ${
                                  transaction.status === "cancelled"
                                    ? "bg-red-100 text-red-700"
                                    : "bg-yellow-100 text-yellow-700"
                                }`}
                              >
                                {transaction.status}
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-gray-500 mt-0.5">
                            {formatDate(transaction.timestamp)}{" "}
                            {formatTime(transaction.timestamp)} ·{" "}
                            {getPaymentDisplay(transaction)}
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          <div className="font-bold text-sm text-green-600 tabular-nums">
                            {formatCurrency(
                              transaction.total - (transaction.discount || 0),
                            )}
                          </div>
                          {hasDiscount && (
                            <div className="text-[10px] text-orange-600 tabular-nums">
                              -{formatCurrency(transaction.discount!)}
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="mt-1 text-[11px] text-gray-500 truncate">
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
              <div className="px-6 py-10 text-center text-sm text-gray-500">
                Loading transactions...
              </div>
            ) : transactions.length === 0 ? (
              <div className="px-6 py-10 text-center text-sm text-gray-500">
                No transactions found for {getDateFilterLabel().toLowerCase()}
              </div>
            ) : (
              <table className="min-w-full divide-y divide-gray-200 text-sm">
                <thead className="bg-gray-50">
                  <tr className="text-[11px] uppercase tracking-wide text-gray-500">
                    <th className="px-3 py-2 text-left font-medium">
                      Date &amp; Time
                    </th>
                    <th className="px-3 py-2 text-left font-medium">Receipt</th>
                    <th className="px-3 py-2 text-left font-medium">Items</th>
                    <th className="px-3 py-2 text-left font-medium">Payment</th>
                    <th className="px-3 py-2 text-right font-medium">
                      Subtotal
                    </th>
                    <th className="px-3 py-2 text-right font-medium">
                      Discount
                    </th>
                    <th className="px-3 py-2 text-right font-medium">Total</th>
                    <th className="px-3 py-2 text-left font-medium">Status</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-100">
                  {transactions.map((transaction) => {
                    const hasDiscount = (transaction.discount ?? 0) > 0;
                    return (
                      <tr
                        key={transaction.id}
                        className={`hover:bg-gray-50 ${hasDiscount ? "bg-orange-50/60" : ""}`}
                      >
                        <td className="px-3 py-2 whitespace-nowrap text-gray-900">
                          <div className="text-xs">
                            {formatDate(transaction.timestamp)}
                          </div>
                          <div className="text-[11px] text-gray-500">
                            {formatTime(transaction.timestamp)}
                          </div>
                        </td>
                        <td className="px-3 py-2 whitespace-nowrap text-xs font-medium text-gray-900">
                          {transaction.receiptNumber}
                        </td>
                        <td className="px-3 py-2 text-xs text-gray-500 max-w-xs truncate">
                          {transaction.items
                            .slice(0, 3)
                            .map((i) => `${i.quantity}× ${i.productName}`)
                            .join(", ")}
                          {transaction.items.length > 3 &&
                            ` +${transaction.items.length - 3}`}
                        </td>
                        <td className="px-3 py-2 whitespace-nowrap">
                          <span className="px-1.5 py-0.5 bg-gray-100 rounded text-[11px] text-gray-600">
                            {getPaymentDisplay(transaction)}
                          </span>
                        </td>
                        <td className="px-3 py-2 text-right whitespace-nowrap text-gray-900 tabular-nums">
                          {formatCurrency(transaction.total)}
                        </td>
                        <td className="px-3 py-2 text-right whitespace-nowrap text-orange-600 tabular-nums">
                          {hasDiscount
                            ? `-${formatCurrency(transaction.discount!)}`
                            : "–"}
                        </td>
                        <td className="px-3 py-2 text-right whitespace-nowrap font-semibold text-green-600 tabular-nums">
                          {formatCurrency(
                            transaction.total - (transaction.discount || 0),
                          )}
                        </td>
                        <td className="px-3 py-2 whitespace-nowrap">
                          <span
                            className={`px-1.5 py-0.5 text-[10px] rounded-full ${
                              transaction.status === "completed"
                                ? "bg-green-100 text-green-700"
                                : transaction.status === "cancelled"
                                  ? "bg-red-100 text-red-700"
                                  : "bg-yellow-100 text-yellow-700"
                            }`}
                          >
                            {transaction.status}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
