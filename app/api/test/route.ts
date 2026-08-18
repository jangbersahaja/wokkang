import { testApiConnection } from "@/lib/storehubApi";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const isConnected = await testApiConnection();

    return NextResponse.json({
      success: isConnected,
      message: isConnected
        ? "StoreHub API connection successful"
        : "StoreHub API connection failed",
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("API test error:", error);
    return NextResponse.json(
      {
        success: false,
        message:
          error instanceof Error ? error.message : "Connection test failed",
        timestamp: new Date().toISOString(),
      },
      { status: 500 },
    );
  }
}
