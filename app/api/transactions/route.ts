import { getTransactions } from "@/lib/storehubApi";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const startDate = searchParams.get("startDate") || undefined;
    const endDate = searchParams.get("endDate") || undefined;
    const employeeId = searchParams.get("employeeId") || undefined;
    const statusParam = searchParams.get("status");
    const limitParam = searchParams.get("limit");

    const status =
      statusParam === "completed" ||
      statusParam === "cancelled" ||
      statusParam === "pending"
        ? statusParam
        : undefined;

    const limit = limitParam ? parseInt(limitParam, 10) : 100;

    const transactions = await getTransactions({
      startDate,
      endDate,
      employeeId,
      status,
      limit,
    });

    return NextResponse.json({
      success: true,
      count: transactions.length,
      data: transactions,
    });
  } catch (error) {
    console.error("Error fetching transactions:", error);
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to fetch transactions",
      },
      { status: 500 },
    );
  }
}
