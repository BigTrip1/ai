// Disable SSL certificate verification in development
if (process.env.NODE_ENV === "development") {
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
}

import { NextResponse } from "next/server";
import { AIAgent } from "@/lib/agent/AIAgent";
import { defaultCharacterState } from "@/config/agent.config";

export async function POST(request: Request) {
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

    try {
      const result = await agent.analyzeAndTweetTokens(1);
      return NextResponse.json({
        success: true,
        tokenData: {
          ...result,
          tweets: result.tweets || [], // Ensure tweets is always an array
        },
      });
    } catch (analyzeError) {
      console.error("Error analyzing tokens:", analyzeError);
      // If we get token data but tweet generation fails, return what we have
      if (analyzeError.token) {
        return NextResponse.json({
          success: true,
          tokenData: {
            ...analyzeError,
            tweets: [], // Provide empty array for tweets if generation failed
          },
        });
      }
      throw analyzeError; // Re-throw if we don't have any token data
    }
  } catch (error) {
    console.error("Error in token analysis endpoint:", error);
    return NextResponse.json(
      {
        success: false,
        message:
          error instanceof Error ? error.message : "Error analyzing tokens",
        tokenData: {
          token: null,
          tweets: [], // Always include an empty array for tweets
        },
      },
      { status: 500 }
    );
  }
}

export async function GET(request: Request) {
  return POST(request);
}
