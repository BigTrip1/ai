import { TwitterApi } from "twitter-api-v2";
import { Telegraf } from "telegraf";
import { CharacterState } from "@/types/character";
import { SocialPlatform, SocialPost } from "@/types/social";
import { SocialMediaManager } from "@/lib/social/SocialMediaManager";
import { DataProcessor } from "@/lib/data/DataProcessor";
import { defaultPlatformConfigs } from "@/config/agent.config";
import { IDataSource } from "@/lib/db/models/DataSource";
import { LureTokenSource } from "../data/sources/LureTokenSource";

export interface AIAgentConfig {
  xaiApiKey: string;
  twitterApiKey: string;
  twitterApiSecret: string;
  twitterAccessToken: string;
  twitterAccessTokenSecret: string;
  characterConfig: CharacterState;
}

interface TokenAnalysisResult {
  success: boolean;
  token?: {
    tokenSymbol: string;
    tokenName: string;
    marketCap?: string;
    price?: string;
    volume24h?: string;
    sentiment?: string;
    events?: string[];
  };
  message?: string;
  error?: string;
  details?: string;
  tweets?: string[];
}

export class AIAgent {
  private xaiApiKey: string;
  private socialManager: SocialMediaManager;
  private dataProcessor: DataProcessor;
  private characterState: CharacterState;
  private isDevelopmentMode: boolean;
  private lureTokenSource: LureTokenSource;
  private twitterClient?: TwitterApi;

  constructor(config: AIAgentConfig) {
    if (!config.xaiApiKey) {
      throw new Error("xAI API key is required");
    }

    this.xaiApiKey = config.xaiApiKey;
    this.characterState = config.characterConfig;
    this.isDevelopmentMode = process.env.NODE_ENV === "development";
    this.lureTokenSource = new LureTokenSource();

    // Only initialize Twitter client if not in development mode
    if (process.env.NODE_ENV !== "development") {
      if (
        !config.twitterApiKey ||
        !config.twitterApiSecret ||
        !config.twitterAccessToken ||
        !config.twitterAccessTokenSecret
      ) {
        throw new Error("Twitter credentials are required in production mode");
      }
      this.twitterClient = new TwitterApi({
        appKey: config.twitterApiKey,
        appSecret: config.twitterApiSecret,
        accessToken: config.twitterAccessToken,
        accessSecret: config.twitterAccessTokenSecret,
      });
    }

    // Initialize social media manager with all required clients
    this.socialManager = new SocialMediaManager(
      null,
      this.twitterClient || null,
      new Telegraf(process.env.TELEGRAM_BOT_TOKEN || ""),
      defaultPlatformConfigs
    );

    // Initialize data processor with xAI API key
    this.dataProcessor = new DataProcessor(this.xaiApiKey);
  }

  async addDataSource(name: string, source: Partial<IDataSource>) {
    await this.dataProcessor.addSource(name, source);
    await this.updateCharacterState({
      status: {
        ...this.characterState.status,
        currentTask: `Added data source: ${name}`,
        lastUpdate: new Date(),
      },
    });
  }

  async processData(sourceName: string) {
    try {
      await this.updateCharacterState({
        status: {
          ...this.characterState.status,
          currentTask: `Processing data from ${sourceName}`,
          lastUpdate: new Date(),
        },
        emotion: {
          name: "thinking",
          intensity: 0.7,
          expression: "focused",
        },
      });

      const formattedContent = await this.dataProcessor.processAndFormat(
        sourceName
      );

      await this.updateCharacterState({
        emotion: {
          name: "happy",
          intensity: 0.5,
          expression: "satisfied",
        },
      });

      return formattedContent;
    } catch (error) {
      await this.updateCharacterState({
        emotion: {
          name: "sad",
          intensity: 0.6,
          expression: "concerned",
        },
      });

      console.error("Error processing data:", error);
      throw error;
    }
  }

  async postToSocial(
    content: string,
    platform: SocialPlatform,
    media?: SocialPost["media"]
  ) {
    if (!this.socialManager) {
      throw new Error("Social manager not initialized");
    }

    try {
      await this.updateCharacterState({
        status: {
          ...this.characterState.status,
          currentTask: `Posting to ${platform}`,
          lastUpdate: new Date(),
        },
        emotion: {
          name: "focused",
          intensity: 0.6,
          expression: "determined",
        },
      });

      const success = await this.socialManager.post({
        content,
        platform,
        media,
        metadata: {
          hashtags: [], // Could be generated based on content
          mentions: [], // Could be extracted from content
        },
      });

      await this.updateCharacterState({
        emotion: success
          ? { name: "happy", intensity: 0.8, expression: "accomplished" }
          : { name: "sad", intensity: 0.6, expression: "disappointed" },
      });

      return success;
    } catch (error) {
      console.error("Error posting to social:", error);
      throw error;
    }
  }

  async checkForNewContent() {
    try {
      const unpostedData = await this.dataProcessor.getUnpostedProcessedData();
      if (unpostedData.length > 0) {
        await this.updateCharacterState({
          status: {
            ...this.characterState.status,
            currentTask: "Found new content to post",
            lastUpdate: new Date(),
          },
        });
        return unpostedData;
      }
      return [];
    } catch (error) {
      console.error("Error checking for new content:", error);
      throw error;
    }
  }

  async updateCharacterState(newState: Partial<CharacterState>) {
    this.characterState = {
      ...this.characterState,
      ...newState,
    };
  }

  getCharacterState(): CharacterState {
    return this.characterState;
  }

  async analyzeAndTweetTokens(limit: number = 1): Promise<TokenAnalysisResult> {
    try {
      console.log("[AIAgent] Starting token analysis...");
      
      // Fetch and analyze tokens
      const tokens = await this.lureTokenSource.fetchLatestTokens(limit);
      console.log("[AIAgent] Fetched tokens:", tokens);
      
      if (!tokens || tokens.length === 0) {
        console.log("[AIAgent] No tokens found to analyze");
        return {
          success: false,
          message: "No tokens found to analyze",
        };
      }

      // The tokens are already mapped in LureTokenSource, so we can use them directly
      const tokenData = tokens[0];
      console.log("[AIAgent] Processing token:", tokenData);

      // Generate tweets using Grok
      const tweets = await this.dataProcessor.generateTweetContent({
        tokenSymbol: tokenData.tokenSymbol,
        tokenName: tokenData.tokenName,
        marketCap: tokenData.marketCap,
        price: tokenData.price,
        volume24h: tokenData.volume24h,
        sentiment: tokenData.sentiment,
        events: tokenData.events,
      });

      console.log("[AIAgent] Generated tweets:", tweets);

      if (this.isDevelopmentMode) {
        return {
          success: true,
          token: tokenData,
          message: "Token analyzed successfully (Development Mode - No Tweet Sent)",
          tweets: tweets,
        };
      }

      // Post to Twitter
      for (const tweet of tweets) {
        await this.socialManager.tweet(tweet);
      }

      return {
        success: true,
        token: tokenData,
        message: "Token analyzed and tweeted successfully",
        tweets: tweets,
      };
    } catch (error) {
      console.error("[AIAgent] Error in analyzeAndTweetTokens:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error occurred",
        details: JSON.stringify(error),
      };
    }
  }
}
