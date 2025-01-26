import { NextResponse } from "next/server";
import { TwitterApi } from "twitter-api-v2";

export async function GET() {
  try {
    const twitterClient = new TwitterApi({
      appKey: process.env.TWITTER_API_KEY!,
      appSecret: process.env.TWITTER_API_SECRET!,
      accessToken: process.env.TWITTER_ACCESS_TOKEN!,
      accessSecret: process.env.TWITTER_ACCESS_TOKEN_SECRET!,
    });

    const testContent =
      "Hello world! This is a test tweet from my AI agent. 🤖 #AITest " +
      new Date().toISOString();

    const response = await twitterClient.v1.tweet(testContent);

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
