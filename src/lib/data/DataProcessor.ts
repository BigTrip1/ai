import { CollectedData, ICollectedData } from "../db/models/CollectedData";
import { TokenData } from "@/types/token";
import axios from "axios";
import { Agent as HttpsAgent } from "https";
import connectDB from "../db/mongodb";
import { DataSource, IDataSource } from "../db/models/DataSource";
import https from "https";

export interface ProcessedData {
  content: string;
  tweetContent: string;
  tokenSymbol: string;
  marketMetrics: {
    price?: string;
    volume24h?: string;
  };
  sentiment: "positive" | "negative" | "neutral";
  relevanceScore: number;
}

export class DataProcessor {
  private xaiApiKey: string;
  private baseUrl: string;

  constructor(xaiApiKey: string) {
    if (!xaiApiKey) {
      throw new Error("xAI API key is required");
    }
    this.xaiApiKey = xaiApiKey;
    this.baseUrl =
      process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:3000";
  }

  private validateTokenData(token: TokenData): void {
    const requiredFields = [
      "tokenSymbol",
      "tokenName",
      "price",
      "volume24h",
      "marketCap",
    ];
    const missingFields = requiredFields.filter(
      (field) => !token[field as keyof TokenData]
    );

    if (missingFields.length > 0) {
      throw new Error(`Missing required fields: ${missingFields.join(", ")}`);
    }
  }

  private ensureNumber(value: string | number | undefined): number | null {
    if (typeof value === "undefined") return null;
    if (typeof value === "number") return value;
    const parsed = parseFloat(value);
    return isNaN(parsed) ? null : parsed;
  }

  async generateTweetContent(token: TokenData): Promise<string[]> {
    try {
      this.validateTokenData(token);

      const marketCap = this.ensureNumber(token.marketCap);
      const price = this.ensureNumber(token.price);
      const volume24h = this.ensureNumber(token.volume24h);

      const prompt = {
        model: "grok-2",
        messages: [
          {
            role: "system",
            content:
              "You are a crypto analyst who writes concise, informative tweets about tokens. Keep the tone cool and professional.",
          },
          {
            role: "user",
            content: `Analyze this token data and provide a tweet under 15 words in the format:
$${token.tokenSymbol}: Analysis + action?

Token Symbol: ${token.tokenSymbol}
Token Name: ${token.tokenName}
Analysis: ${JSON.stringify(token.analysis || {})}
Summary: ${token.tldr || ""}
Market Cap: ${marketCap ? `$${this.formatNumber(marketCap)}` : "N/A"}
Price: ${price ? `$${price.toFixed(8)}` : "N/A"}
Volume 24h: ${volume24h ? `$${this.formatNumber(volume24h)}` : "N/A"}
Sentiment: ${token.sentiment || "neutral"}
Events: ${token.events?.join(", ") || "none"}

Keep it cool, no caps for emotion, mix up the final actions like 'ape?', 'fomo?', 'stack?'`,
          },
        ],
        temperature: 0.7,
      };

      console.log("[DataProcessor] Sending request to xAI API");

      const response = await axios.post(
        "https://api.x.ai/v2/chat/completions",
        prompt,
        {
          headers: {
            Authorization: `Bearer ${this.xaiApiKey}`,
            "Content-Type": "application/json",
          },
          httpsAgent:
            process.env.NODE_ENV === "development"
              ? new HttpsAgent({ rejectUnauthorized: false })
              : undefined,
        }
      );

      if (!response.data?.choices?.[0]?.message?.content) {
        throw new Error("Invalid response from xAI API");
      }

      return [response.data.choices[0].message.content.trim()];
    } catch (error) {
      console.error("[DataProcessor] Error generating tweet:", error);
      return [this.generateFallbackTweet(token)];
    }
  }

  private generateFallbackTweet(token: TokenData): string {
    const price = this.ensureNumber(token.price);
    const volume24h = this.ensureNumber(token.volume24h);

    const priceStr = price ? `$${price.toFixed(8)}` : "N/A";
    const volumeStr = volume24h ? `$${this.formatNumber(volume24h)}` : "N/A";

    return `$${token.tokenSymbol}: ${priceStr} | vol ${volumeStr} | ${
      token.sentiment || "neutral"
    } sentiment. stack?`;
  }

  private formatNumber(num: number): string {
    if (num >= 1e9) return `${(num / 1e9).toFixed(2)}B`;
    if (num >= 1e6) return `${(num / 1e6).toFixed(2)}M`;
    if (num >= 1e3) return `${(num / 1e3).toFixed(2)}K`;
    return num.toFixed(2);
  }

  async addSource(name: string, source: Partial<IDataSource>) {
    await connectDB();
    const newSource = new DataSource({
      name,
      ...source,
      isActive: true,
    });
    await newSource.save();
  }

  async removeSource(name: string) {
    await connectDB();
    await DataSource.findOneAndUpdate({ name }, { isActive: false });
  }

  async fetchFromSource(sourceName: string): Promise<Record<string, unknown>> {
    await connectDB();
    const source = await DataSource.findOne({
      name: sourceName,
      isActive: true,
    });

    if (!source) {
      throw new Error(`Source not found or inactive: ${sourceName}`);
    }

    try {
      const response = await axios({
        method: source.method || "GET",
        url: source.url,
        headers: source.headers,
        params: source.params,
      });

      const collectedData = new CollectedData({
        sourceId: source._id,
        sourceName: source.name,
        content: JSON.stringify(response.data),
        rawData: response.data,
      });
      await collectedData.save();

      await DataSource.findByIdAndUpdate(source._id, {
        lastFetched: new Date(),
      });

      return response.data;
    } catch (error) {
      console.error(`Error fetching from ${sourceName}:`, error);
      throw error;
    }
  }

  async processData(
    data: TokenData
  ): Promise<ProcessedData & { generatedTweets: string }> {
    try {
      console.log(
        "[DataProcessor] Processing token data:",
        JSON.stringify(data, null, 2)
      );

      if (!data.tokenSymbol) {
        throw new Error("Token symbol is required");
      }

      const tokenInfo: Record<string, unknown> = {
        tokenSymbol: data.tokenSymbol,
        tokenName: data.tokenName,
        marketMetrics: {
          price: data.price?.toString(),
          volume24h: data.volume24h?.toString(),
        },
        marketCap: data.marketCap?.toString(),
        sentiment: data.sentiment || "neutral",
      };

      console.log("[DataProcessor] Prepared token info:", tokenInfo);

      const prompt = `Analyze this token data and provide two tweets:
      1. Under 15 words: $${
        data.tokenSymbol
      }: Analysis + action? Keep it cool, no caps.
      2. Just drop ticker info like: $${
        data.tokenSymbol
      } - utility info, market cap, key context

      Token data: ${JSON.stringify(tokenInfo, null, 2)}`;

      console.log("[DataProcessor] Sending prompt to xAI API:", prompt);

      const response = await axios.post(
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
            Authorization: `Bearer ${this.xaiApiKey}`,
            "Content-Type": "application/json",
          },
        }
      );

      if (!response.data) {
        throw new Error(`xAI API error: No response data`);
      }

      console.log(
        "[DataProcessor] xAI API response:",
        JSON.stringify(response.data, null, 2)
      );

      return {
        content: JSON.stringify(tokenInfo),
        tweetContent: response.data.choices[0].message.content,
        tokenSymbol: data.tokenSymbol,
        marketMetrics: {
          price: data.price?.toString(),
          volume24h: data.volume24h?.toString(),
        },
        sentiment:
          (data.sentiment as "positive" | "negative" | "neutral") || "neutral",
        relevanceScore: 1,
        generatedTweets: response.data.choices[0].message.content,
      };
    } catch (error) {
      console.error("[DataProcessor] Error processing data:", error);
      if (error instanceof AxiosError && error.response) {
        console.error("[DataProcessor] xAI API error response:", {
          status: error.response.status,
          data: error.response.data,
        });
      }
      throw error;
    }
  }

  async processAndFormat(sourceName: string): Promise<string> {
    await connectDB();
    const unprocessedData = await CollectedData.findOne({
      sourceName,
      processed: false,
    });

    if (!unprocessedData) {
      throw new Error(`No unprocessed data found for source: ${sourceName}`);
    }

    const processed = await this.processData(
      unprocessedData.rawData as TokenData
    );
    await CollectedData.findByIdAndUpdate(unprocessedData._id, {
      processed: true,
      processedContent: processed,
    });

    return processed.generatedTweets || "";
  }

  async getUnprocessedDataCount(sourceName: string): Promise<number> {
    await connectDB();
    return CollectedData.countDocuments({ sourceName, processed: false });
  }

  async getUnpostedProcessedData(): Promise<ICollectedData[]> {
    await connectDB();
    return CollectedData.find({
      processed: true,
      posted: false,
      "processedContent.relevanceScore": { $gt: 0.5 },
    }).sort({ "processedContent.relevanceScore": -1 });
  }
}
