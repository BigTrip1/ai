import { NextResponse } from "next/server";
import { TwitterApi } from "twitter-api-v2";

// Create a client with your credentials
const client = new TwitterApi({
  appKey: process.env.TWITTER_API_KEY || "",
  appSecret: process.env.TWITTER_API_SECRET || "",
  accessToken: process.env.TWITTER_ACCESS_TOKEN || "",
  accessSecret: process.env.TWITTER_ACCESS_TOKEN_SECRET || "",
});

// Get the read-write client
const rwClient = client.readWrite;

export async function POST(request: Request) {
  try {
    const { content } = await request.json();

    if (!content) {
      return NextResponse.json(
        { error: "Tweet content is required" },
        { status: 400 }
      );
    }

    // First verify the credentials
    try {
      const verifyResponse = await rwClient.v2.me();
      console.log("Account verification:", {
        username: verifyResponse.data.username,
        id: verifyResponse.data.id,
      });
    } catch (verifyError: any) {
      console.error("Account verification failed:", verifyError);
      throw new Error(`Account verification failed: ${verifyError.message}`);
    }

    console.log("Attempting to post tweet with content:", content);
    console.log("Using credentials:", {
      appKey: process.env.TWITTER_API_KEY?.slice(0, 8) + "...",
      accessToken: process.env.TWITTER_ACCESS_TOKEN?.slice(0, 8) + "...",
    });

    try {
      // Try v2 endpoint with specific tweet data format
      const tweet = await rwClient.v2.tweet({
        text: content,
      });

      console.log("Twitter API v2 response:", JSON.stringify(tweet, null, 2));

      return NextResponse.json({
        success: true,
        data: tweet,
      });
    } catch (twitterError: any) {
      console.error("Twitter API Error Details:", {
        error: twitterError,
        message: twitterError.message,
        code: twitterError.code,
        data: twitterError.data,
        rateLimitInfo: twitterError.rateLimit,
        errors: twitterError.errors,
      });

      // Check if we need to refresh tokens
      if (twitterError.code === 401 || twitterError.code === 403) {
        console.log("Attempting to refresh client...");
        throw new Error(
          `Authentication error: ${twitterError.message}. Please verify your API access level and tokens.`
        );
      }

      throw new Error(`Twitter API Error: ${twitterError.message}`);
    }
  } catch (error: any) {
    console.error("Error posting tweet:", error);
    return NextResponse.json(
      {
        error: "Failed to post tweet",
        details: error.message,
      },
      { status: 500 }
    );
  }
}

// Test endpoint
export async function GET() {
  try {
    const testContent = "Test tweet " + new Date().toISOString();
    const response = await rwClient.v2.tweet(testContent);

    return NextResponse.json({
      success: true,
      data: response,
    });
  } catch (error: any) {
    console.error("Error in test tweet endpoint:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message,
      },
      { status: 500 }
    );
  }
}
