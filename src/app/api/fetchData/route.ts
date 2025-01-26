import { NextResponse } from "next/server";
import connectDB from "@/lib/db/mongodb";
import { CollectedData } from "@/lib/db/models/CollectedData";

export async function GET() {
  try {
    await connectDB();
    
    // Get the latest unprocessed data
    const latestData = await CollectedData.findOne({
      processed: false,
    }).sort({ createdAt: -1 });

    if (!latestData) {
      return NextResponse.json(
        { error: "No unprocessed data found" },
        { status: 404 }
      );
    }

    return NextResponse.json(latestData);
  } catch (error) {
    console.error("Error fetching data:", error);
    return NextResponse.json(
      { error: "Failed to fetch data" },
      { status: 500 }
    );
  }
} 