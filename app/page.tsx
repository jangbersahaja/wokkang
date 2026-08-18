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

        completed.forEach((t: Transaction) => {
          t.items.forEach((item) => {
            const key = `${item.sku || "unknown"}-${item.productName}`;
            const existing = productMap.get(key);

            if (existing) {
              existing.quantity += item.quantity;
              existing.grossSales += item.grossPrice || item.totalPrice;
              existing.discount += item.discount || 0;
              existing.netSales += item.totalPrice;
              existing.transactionCount += 1;
            } else {
              productMap.set(key, {
                productName: item.productName,
                sku: item.sku || "N/A",
                quantity: item.quantity,
                grossSales: item.grossPrice || item.totalPrice,
                discount: item.discount || 0,
                netSales: item.totalPrice,
                transactionCount: 1,
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
      <header className="bg-white shadow sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
                StoreHub Live Monitor
              </h1>
              <p className="mt-1 text-xs sm:text-sm text-gray-500">
                Real-time transaction monitoring
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2 sm:gap-4">
              <div className="flex items-center gap-2">
                <div
                  className={`w-3 h-3 rounded-full ${
                    connectionStatus === "connected"
                      ? "bg-green-500"
                      : connectionStatus === "disconnected"
                        ? "bg-red-500"
                        : "bg-yellow-500 animate-pulse"
                  }`}
                ></div>
                <span className="text-xs sm:text-sm text-gray-600">
                  {connectionStatus === "connected"
                    ? "Connected"
                    : connectionStatus === "disconnected"
                      ? "Disconnected"
                      : "Checking..."}
                </span>
              </div>
              <button
                onClick={() => setAutoRefresh(!autoRefresh)}
                className={`px-3 sm:px-4 py-2 rounded-lg text-sm font-medium ${
                  autoRefresh
                    ? "bg-blue-600 text-white"
                    : "bg-gray-200 text-gray-700"
                }`}
              >
                <span className="hidden sm:inline">
                  {autoRefresh ? "Auto-refresh ON" : "Auto-refresh OFF"}
                </span>
                <span className="sm:hidden">
                  {autoRefresh ? "Auto ON" : "Auto OFF"}
                </span>
              </button>
              <button
                onClick={fetchTransactions}
                disabled={loading}
                className="px-3 sm:px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
              >
                {loading ? "Refreshing..." : "Refresh"}
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Date Filter */}
        <div className="bg-white rounded-lg shadow p-4 sm:p-6 mb-6">
          <div className="flex flex-col gap-4">
            <div className="w-full">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Date Range
              </label>
              <div className="grid grid-cols-2 sm:flex gap-2">
                <button
                  onClick={() => setDateFilter("today")}
                  className={`px-3 sm:px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    dateFilter === "today"
                      ? "bg-blue-600 text-white"
                      : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                  }`}
                >
                  Today
                </button>
                <button
                  onClick={() => setDateFilter("yesterday")}
                  className={`px-3 sm:px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    dateFilter === "yesterday"
                      ? "bg-blue-600 text-white"
                      : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                  }`}
                >
                  Yesterday
                </button>
                <button
                  onClick={() => setDateFilter("week")}
                  className={`px-3 sm:px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    dateFilter === "week"
                      ? "bg-blue-600 text-white"
                      : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                  }`}
                >
                  <span className="hidden sm:inline">Last 7 Days</span>
                  <span className="sm:hidden">Week</span>
                </button>
                <button
                  onClick={() => setDateFilter("month")}
                  className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                    dateFilter === "month"
                      ? "bg-blue-600 text-white"
                      : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                  }`}
                >
                  Last 30 Days
                </button>
                <button
                  onClick={() => setDateFilter("custom")}
                  className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                    dateFilter === "custom"
                      ? "bg-blue-600 text-white"
                      : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                  }`}
                >
                  Custom
                </button>
                <button
                  onClick={() => {
                    setCustomStartDate("2025-10-14");
                    setCustomEndDate("2026-01-29");
                    setDateFilter("custom");
                  }}
                  className="px-4 py-2 rounded-lg font-medium bg-green-600 text-white hover:bg-green-700 transition-colors"
                  title="Show all available data (Oct 2025 - Jan 2026)"
                >
                  Show All Data
                </button>
              </div>
            </div>

            {dateFilter === "custom" && (
              <div className="flex gap-4 items-end">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Start Date
                  </label>
                  <input
                    type="date"
                    value={customStartDate}
                    onChange={(e) => setCustomStartDate(e.target.value)}
                    className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    End Date
                  </label>
                  <input
                    type="date"
                    value={customEndDate}
                    onChange={(e) => setCustomEndDate(e.target.value)}
                    className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6 mb-6">
          <div className="bg-white rounded-lg shadow p-4 sm:p-6">
            <div className="text-xs sm:text-sm font-medium text-gray-500">
              Gross Sales
            </div>
            <div className="mt-2 text-xl sm:text-3xl font-bold text-gray-900">
              {formatCurrency(stats.grossSales)}
            </div>
            <div className="mt-1 text-xs text-gray-400">Before discounts</div>
          </div>

          <div className="bg-white rounded-lg shadow p-4 sm:p-6">
            <div className="text-xs sm:text-sm font-medium text-gray-500">
              Net Sales
            </div>
            <div className="mt-2 text-xl sm:text-3xl font-bold text-green-600">
              {formatCurrency(stats.totalSales)}
            </div>
            <div className="mt-1 text-xs text-gray-400">After discounts</div>
          </div>

          <div className="bg-orange-50 border border-orange-200 rounded-lg shadow p-4 sm:p-6">
            <div className="text-xs sm:text-sm font-medium text-orange-700">
              Discounts
            </div>
            <div className="mt-2 text-xl sm:text-3xl font-bold text-orange-600">
              {formatCurrency(stats.totalDiscount)}
            </div>
            <div className="mt-1 text-xs text-orange-500">
              {stats.grossSales > 0
                ? `${((stats.totalDiscount / stats.grossSales) * 100).toFixed(1)}% off`
                : "0% off"}
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-4 sm:p-6">
            <div className="text-xs sm:text-sm font-medium text-gray-500">
              Last Updated
            </div>
            <div className="mt-2 text-xl sm:text-3xl font-bold text-gray-900">
              {isMounted ? stats.lastUpdated || "--:--:--" : "--:--:--"}
            </div>
          </div>
        </div>

        {/* Additional Stats */}
        <div className="grid grid-cols-2 gap-3 sm:gap-6 mb-6">
          <div className="bg-white rounded-lg shadow p-4 sm:p-6">
            <div className="text-xs sm:text-sm font-medium text-gray-500">
              Transactions
            </div>
            <div className="mt-2 text-xl sm:text-3xl font-bold text-gray-900">
              {stats.transactionCount}
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-4 sm:p-6">
            <div className="text-xs sm:text-sm font-medium text-gray-500">
              Avg Transaction
            </div>
            <div className="mt-2 text-xl sm:text-3xl font-bold text-gray-900">
              {formatCurrency(stats.averageTransaction)}
            </div>
          </div>
        </div>

        {/* Cancelled Transactions Cards */}
        {stats.cancelledCount > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            <div className="bg-red-50 border border-red-200 rounded-lg shadow p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <svg
                    className="h-8 w-8 text-red-600"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                </div>
                <div className="ml-4 flex-1">
                  <div className="text-sm font-medium text-red-800">
                    Cancelled Transactions
                  </div>
                  <div className="mt-1 text-2xl font-bold text-red-900">
                    {stats.cancelledCount}
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-red-50 border border-red-200 rounded-lg shadow p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <svg
                    className="h-8 w-8 text-red-600"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                </div>
                <div className="ml-4 flex-1">
                  <div className="text-sm font-medium text-red-800">
                    Lost Revenue (Cancelled)
                  </div>
                  <div className="mt-1 text-2xl font-bold text-red-900">
                    {formatCurrency(stats.cancelledTotal)}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Payment Breakdown Cards */}
        {Object.keys(stats.paymentBreakdown).length > 0 && (
          <div className="mb-8">
            <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-4">
              Sales by Payment Method
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
              {Object.entries(stats.paymentBreakdown)
                .sort((a, b) => b[1].total - a[1].total)
                .map(([method, data]) => (
                  <div
                    key={method}
                    className="bg-linear-to-br from-blue-50 to-white border border-blue-100 rounded-lg shadow p-3 sm:p-4"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="text-xs sm:text-sm font-medium text-gray-700 truncate">
                        {method}
                      </div>
                      <div className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded shrink-0">
                        {data.count}
                      </div>
                    </div>
                    <div className="text-lg sm:text-2xl font-bold text-gray-900">
                      {formatCurrency(data.total)}
                    </div>
                    <div className="mt-1 text-xs text-gray-500">
                      {((data.total / stats.totalSales) * 100).toFixed(1)}%
                    </div>
                  </div>
                ))}
            </div>
          </div>
        )}

        {/* Sales by Products Table */}
        {productSales.length > 0 && (
          <div className="mb-8">
            <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-4">
              Sales by Products
            </h3>
            <div className="bg-white rounded-lg shadow overflow-hidden">
              {/* Mobile Card View */}
              <div className="block lg:hidden divide-y divide-gray-200">
                {productSales.slice(0, 20).map((product, idx) => (
                  <div key={idx} className="p-4">
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex-1">
                        <div className="font-medium text-gray-900 text-sm">
                          {product.productName}
                        </div>
                        <div className="text-xs text-gray-500 mt-1">
                          SKU: {product.sku}
                        </div>
                      </div>
                      <span className="ml-2 px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs font-medium">
                        {product.quantity} sold
                      </span>
                    </div>
                    <div className="grid grid-cols-3 gap-2 text-sm mt-3">
                      <div>
                        <div className="text-xs text-gray-500">Gross</div>
                        <div className="font-medium">
                          {formatCurrency(product.grossSales)}
                        </div>
                      </div>
                      <div>
                        <div className="text-xs text-gray-500">Discount</div>
                        <div className="font-medium text-orange-600">
                          {product.discount > 0
                            ? `-${formatCurrency(product.discount)}`
                            : "-"}
                        </div>
                      </div>
                      <div>
                        <div className="text-xs text-gray-500">Net Sales</div>
                        <div className="font-bold text-green-600">
                          {formatCurrency(product.netSales)}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Desktop Table View */}
              <div className="hidden lg:block overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        #
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Product Name
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        SKU
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Qty Sold
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Gross Sales
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Discount
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Net Sales
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Transactions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {productSales.slice(0, 20).map((product, idx) => (
                      <tr key={idx} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {idx + 1}
                        </td>
                        <td className="px-6 py-4 text-sm font-medium text-gray-900">
                          {product.productName}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {product.sku}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded font-medium">
                            {product.quantity}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {formatCurrency(product.grossSales)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-orange-600 font-medium">
                          {product.discount > 0
                            ? `-${formatCurrency(product.discount)}`
                            : "-"}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-green-600">
                          {formatCurrency(product.netSales)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
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
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <div className="flex items-center">
              <div className="text-red-800">
                <strong>Error:</strong> {error}
              </div>
            </div>
          </div>
        )}

        {/* Transactions Table */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="px-4 sm:px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg sm:text-xl font-semibold text-gray-900">
              Recent Transactions
            </h2>
          </div>

          {/* Mobile Card View */}
          <div className="block lg:hidden">
            {loading && transactions.length === 0 ? (
              <div className="px-4 py-12 text-center text-gray-500">
                Loading transactions...
              </div>
            ) : transactions.length === 0 ? (
              <div className="px-4 py-12 text-center text-gray-500">
                No transactions found for {getDateFilterLabel().toLowerCase()}
              </div>
            ) : (
              <div className="divide-y divide-gray-200">
                {transactions.map((transaction) => {
                  const hasDiscount = (transaction.discount ?? 0) > 0;
                  return (
                    <div
                      key={transaction.id}
                      className={`p-4 ${hasDiscount ? "bg-orange-50 border-l-4 border-orange-400" : ""}`}
                    >
                      {/* Header */}
                      <div className="flex justify-between items-start mb-3">
                        <div className="flex-1">
                          <div className="font-medium text-gray-900 text-sm">
                            {transaction.receiptNumber}
                          </div>
                          <div className="text-xs text-gray-500 mt-1">
                            {formatDate(transaction.timestamp)}{" "}
                            {formatTime(transaction.timestamp)}
                          </div>
                        </div>
                        <span
                          className={`px-2 py-1 text-xs rounded-full ${
                            transaction.status === "completed"
                              ? "bg-green-100 text-green-800"
                              : transaction.status === "cancelled"
                                ? "bg-red-100 text-red-800"
                                : "bg-yellow-100 text-yellow-800"
                          }`}
                        >
                          {transaction.status}
                        </span>
                      </div>

                      {/* Badges */}
                      <div className="flex flex-wrap gap-2 mb-3">
                        {hasDiscount && (
                          <span className="px-2 py-1 bg-orange-600 text-white rounded text-xs font-bold">
                            DISCOUNTED
                          </span>
                        )}
                        <span className="px-2 py-1 bg-gray-100 rounded text-xs">
                          {getPaymentDisplay(transaction)}
                        </span>
                      </div>

                      {/* Items */}
                      <div className="mb-3">
                        {transaction.items.slice(0, 2).map((item, idx) => (
                          <div key={idx} className="text-sm text-gray-600 mb-1">
                            {item.quantity}x {item.productName}
                            {(item.discount ?? 0) > 0 && (
                              <span className="ml-2 px-2 py-0.5 bg-orange-100 text-orange-700 rounded text-xs">
                                -{formatCurrency(item.discount!)} off
                              </span>
                            )}
                          </div>
                        ))}
                        {transaction.items.length > 2 && (
                          <div className="text-xs text-gray-400">
                            +{transaction.items.length - 2} more...
                          </div>
                        )}
                      </div>

                      {/* Pricing */}
                      <div className="grid grid-cols-3 gap-2 text-sm">
                        <div>
                          <div className="text-xs text-gray-500">Subtotal</div>
                          <div className="font-medium">
                            {formatCurrency(transaction.total)}
                          </div>
                        </div>
                        <div>
                          <div className="text-xs text-gray-500">Discount</div>
                          <div className="font-medium text-orange-600">
                            {hasDiscount
                              ? `-${formatCurrency(transaction.discount!)}`
                              : "-"}
                          </div>
                        </div>
                        <div>
                          <div className="text-xs text-gray-500">
                            Final Price
                          </div>
                          <div className="font-bold text-green-600">
                            {formatCurrency(
                              transaction.total - (transaction.discount || 0),
                            )}
                          </div>
                        </div>
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
              <div className="px-6 py-12 text-center text-gray-500">
                Loading transactions...
              </div>
            ) : transactions.length === 0 ? (
              <div className="px-6 py-12 text-center text-gray-500">
                No transactions found for {getDateFilterLabel().toLowerCase()}
              </div>
            ) : (
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Date & Time
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Receipt #
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Items
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Payment
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Subtotal
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Discount
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Final Price
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {transactions.map((transaction) => {
                    const hasDiscount = (transaction.discount ?? 0) > 0;
                    return (
                      <tr
                        key={transaction.id}
                        className={`hover:bg-gray-50 ${hasDiscount ? "bg-orange-50 border-l-4 border-orange-400" : ""}`}
                      >
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          <div>{formatDate(transaction.timestamp)}</div>
                          <div className="text-gray-500">
                            {formatTime(transaction.timestamp)}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          <div className="flex items-center">
                            {transaction.receiptNumber}
                            {hasDiscount && (
                              <span className="ml-2 px-2 py-1 bg-orange-600 text-white rounded text-xs font-bold">
                                DISCOUNTED
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-500">
                          <div className="max-w-xs">
                            {transaction.items.slice(0, 2).map((item, idx) => (
                              <div key={idx} className="mb-1">
                                {item.quantity}x {item.productName}
                                {(item.discount ?? 0) > 0 && (
                                  <span className="ml-2 px-2 py-0.5 bg-orange-100 text-orange-700 rounded text-xs font-medium">
                                    -{formatCurrency(item.discount!)} off
                                  </span>
                                )}
                              </div>
                            ))}
                            {transaction.items.length > 2 && (
                              <div className="text-gray-400">
                                +{transaction.items.length - 2} more...
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          <span className="px-2 py-1 bg-gray-100 rounded text-xs">
                            {getPaymentDisplay(transaction)}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {formatCurrency(transaction.total)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-orange-600 font-medium">
                          {hasDiscount
                            ? `-${formatCurrency(transaction.discount!)}`
                            : "-"}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-green-600">
                          {formatCurrency(
                            transaction.total - (transaction.discount || 0),
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span
                            className={`px-2 py-1 text-xs rounded-full ${
                              transaction.status === "completed"
                                ? "bg-green-100 text-green-800"
                                : transaction.status === "cancelled"
                                  ? "bg-red-100 text-red-800"
                                  : "bg-yellow-100 text-yellow-800"
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
