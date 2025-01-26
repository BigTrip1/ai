// Disable SSL certificate verification in development
if (process.env.NODE_ENV === "development") {
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
}

import { NextResponse } from "next/server";
import { AIAgent } from "@/lib/agent/AIAgent";
import { defaultCharacterState } from "@/config/agent.config";

export async function handler(request: Request) {
  try {
    const xaiApiKey = process.env.XAI_API_KEY;
    if (!xaiApiKey) {
      throw new Error("xAI API key is not configured");
    }

    console.log(
      "[API] Initializing AIAgent with xAI API key:",
      xaiApiKey ? "Present" : "Missing"
    );

    // In development, don't require Twitter credentials
    const isDev = process.env.NODE_ENV === "development";

    const agent = new AIAgent({
      xaiApiKey,
      twitterApiKey: isDev ? "dev" : process.env.TWITTER_API_KEY || "",
      twitterApiSecret: isDev ? "dev" : process.env.TWITTER_API_SECRET || "",
      twitterAccessToken: isDev
        ? "dev"
        : process.env.TWITTER_ACCESS_TOKEN || "",
      twitterAccessTokenSecret: isDev
        ? "dev"
        : process.env.TWITTER_ACCESS_TOKEN_SECRET || "",
      characterConfig: defaultCharacterState,
    });

    const result = await agent.analyzeAndTweetTokens(1);
    
    // Ensure we have valid token data
    if (!result.success || !result.token) {
      console.error("[API] No valid token data returned:", result);
      return NextResponse.json(
        {
          success: false,
          message: result.message || "No valid token data found",
          tokenData: null,
        },
        { status: 404 }
      );
    }

    // Return a properly structured response
    return NextResponse.json({
      success: true,
      tokenData: result.token,
      tweets: result.tweets || [],
      message: result.message,
    });
  } catch (error) {
    console.error("[API] Error in token analysis endpoint:", error);
    return NextResponse.json(
      {
        success: false,
        message: error instanceof Error ? error.message : "Error analyzing tokens",
        tokenData: null,
        tweets: [],
      },
      { status: 500 }
    );
  }
}

export const GET = handler;
export const POST = handler;
