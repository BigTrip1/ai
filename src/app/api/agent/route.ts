import { NextResponse } from "next/server";
import { AIAgent, AIAgentConfig } from "@/lib/agent/AIAgent";
import { defaultCharacterState } from "@/config/agent.config";

let agent: AIAgent | null = null;

export async function GET() {
  try {
    if (!agent) {
      const config: AIAgentConfig = {
        openaiApiKey: process.env.OPENAI_API_KEY || "",
        twitterApiKey: process.env.TWITTER_API_KEY || "",
        discordToken: process.env.DISCORD_BOT_TOKEN || "",
        telegramToken: process.env.TELEGRAM_BOT_TOKEN || "",
        characterConfig: defaultCharacterState,
      };

      agent = new AIAgent(config);
    }

    const characterState = agent.getCharacterState();
    return NextResponse.json({ status: "success", characterState });
  } catch (error) {
    console.error("Error initializing agent:", error);
    return NextResponse.json(
      { status: "error", message: "Failed to initialize agent" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { action, data } = body;

    if (!agent) {
      return NextResponse.json(
        { status: "error", message: "Agent not initialized" },
        { status: 400 }
      );
    }

    switch (action) {
      case "processData":
        const content = await agent.processData(data.sourceName, data.platform);
        return NextResponse.json({ status: "success", content });

      case "postToSocial":
        const success = await agent.postToSocial(
          data.content,
          data.platform,
          data.media
        );
        return NextResponse.json({ status: "success", posted: success });

      case "addDataSource":
        await agent.addDataSource(data.name, data.source);
        return NextResponse.json({ status: "success" });

      default:
        return NextResponse.json(
          { status: "error", message: "Invalid action" },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error("Error processing request:", error);
    return NextResponse.json(
      { status: "error", message: "Internal server error" },
      { status: 500 }
    );
  }
}
