import { NextResponse } from "next/server";
import axios from "axios";
import https from "https";

export async function POST(request: Request) {
  try {
    const { prompt, tokenData } = await request.json();
    const apiKey = process.env.XAI_API_KEY;

    // Validate request data
    if (!prompt || typeof prompt !== 'string') {
      console.error("[API] Invalid prompt:", prompt);
      return NextResponse.json(
        { error: "Invalid prompt" },
        { status: 400 }
      );
    }

    if (!tokenData || typeof tokenData !== 'object') {
      console.error("[API] Invalid token data:", tokenData);
      return NextResponse.json(
        { error: "Invalid token data" },
        { status: 400 }
      );
    }

    console.log(
      "[API] Starting tweet generation for token:",
      tokenData.tokenSymbol,
      "with prompt length:",
      prompt.length
    );

    if (!apiKey) {
      console.error("[API] XAI API key not configured");
      return NextResponse.json(
        { error: "XAI API key not configured" },
        { status: 500 }
      );
    }

    console.log("[API] Creating axios instance with SSL configuration");
    // Create a custom axios instance with SSL configuration
    const axiosInstance = axios.create({
      httpsAgent: new https.Agent({
        rejectUnauthorized: false,
        secureProtocol: "TLSv1_2_method",
      }),
      timeout: 30000, // 30 second timeout
    });

    console.log("[API] Sending request to xAI API");
    const response = await axiosInstance.post(
      "https://api.x.ai/v2/chat/completions",
      {
        model: "grok-2",
        messages: [
          {
            role: "system",
            content:
              "You are a crypto analyst who writes concise, informative tweets about tokens. Keep the tone cool and professional.",
          },
          {
            role: "user",
            content: prompt,
          },
        ],
        temperature: 0.7,
      },
      {
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
      }
    );

    if (!response.data) {
      console.error("[API] No response data from xAI API");
      throw new Error("No response from xAI API");
    }

    if (!response.data.choices?.[0]?.message?.content) {
      console.error("[API] Invalid response format from xAI API:", response.data);
      throw new Error("Invalid response format from xAI API");
    }

    console.log("[API] Successfully generated tweet");
    const tweet = response.data.choices[0].message.content;
    return NextResponse.json({ tweet });
  } catch (error) {
    console.error("[API] Error generating tweet:", error);
    if (axios.isAxiosError(error)) {
      console.error("[API] Axios error details:", {
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data,
        code: error.code,
        message: error.message,
      });

      // Handle specific error cases
      if (error.code === 'ECONNABORTED') {
        return NextResponse.json(
          { error: "Request timed out", details: "The API request took too long to complete" },
          { status: 504 }
        );
      }

      if (error.response?.status === 401) {
        return NextResponse.json(
          { error: "Authentication failed", details: "Invalid or expired API key" },
          { status: 401 }
        );
      }

      if (error.response?.status === 429) {
        return NextResponse.json(
          { error: "Rate limit exceeded", details: "Too many requests" },
          { status: 429 }
        );
      }
    }

    return NextResponse.json(
      {
        error: "Failed to generate tweet",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
