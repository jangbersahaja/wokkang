import { getProducts } from "@/lib/storehubApi";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const products = await getProducts({ limit: 500 });

    return NextResponse.json({
      success: true,
      count: products.length,
      data: products,
    });
  } catch (error) {
    console.error("Error fetching products:", error);
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error ? error.message : "Failed to fetch products",
      },
      { status: 500 },
    );
  }
}
