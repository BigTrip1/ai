import axios, { AxiosError } from "axios";
import connectDB from "../db/mongodb";
import { DataSource, IDataSource } from "../db/models/DataSource";
import { CollectedData, ICollectedData } from "../db/models/CollectedData";
import https from "https";

interface TokenData {
  tokenSymbol: string;
  tokenName: string;
  marketCap?: string | number;
  price?: string | number;
  volume24h?: string | number;
  sentiment?: string;
  events?: string[];
  narrativeAlignment?: string;
  timing?: string;
  categories?: string;
  riskLevel?: string;
  analysis?: {
    nameAnalysis?: {
      narrativeAlignment?: string;
    };
    priceAnalysis?: {
      current?: string;
    };
  };
  tldr?: string;
}

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
  private axiosInstance;

  constructor(xaiApiKey: string) {
    if (!xaiApiKey) {
      throw new Error("xAI API key is required");
    }
    this.xaiApiKey = xaiApiKey;

    // Create a custom axios instance with SSL configuration
    this.axiosInstance = axios.create({
      httpsAgent: new https.Agent({
        rejectUnauthorized: false,
        secureProtocol: "TLSv1_2_method",
      }),
    });
  }

  async generateTweetContent(tokenData: TokenData): Promise<string[]> {
    console.log(
      "[DataProcessor] Starting tweet generation for token:",
      tokenData.tokenSymbol
    );
    console.log(
      "[DataProcessor] Token data:",
      JSON.stringify(tokenData, null, 2)
    );

    try {
      // Construct a more informative prompt using all available data
      const prompt = `Analyze this token data and provide a tweet under 15 words in the format:
$${tokenData.tokenSymbol}: Analysis + action?

Token Symbol: ${tokenData.tokenSymbol}
Token Name: ${tokenData.tokenName}
Analysis: ${JSON.stringify(tokenData.analysis || {})}
Summary: ${tokenData.tldr || ""}
Market Cap: ${tokenData.marketCap || "N/A"}
Price: ${tokenData.price || "N/A"}
Volume 24h: ${tokenData.volume24h || "N/A"}
Sentiment: ${tokenData.sentiment || "neutral"}
Events: ${tokenData.events?.join(", ") || "none"}

Keep it cool, no caps for emotion, mix up the final actions like 'ape?', 'fomo?', 'stack?'`;

      const response = await this.axiosInstance.post("/api/generate-tweet", {
        prompt,
        tokenData,
      });
      console.log("[DataProcessor] Generated tweet:", response.data.tweet);
      return [response.data.tweet];
    } catch (error) {
      console.error("[DataProcessor] Error generating tweet content:", error);
      if (error instanceof AxiosError && error.response) {
        console.error("[DataProcessor] API error response:", {
          status: error.response.status,
          data: error.response.data,
        });
      }
      const defaultTweet = `$${tokenData.tokenSymbol}: ${
        tokenData.sentiment || "Analyzing"
      } sentiment with ${
        tokenData.volume24h ? "active" : "developing"
      } volume. worth watching?`;
      console.log("[DataProcessor] Using default tweet:", defaultTweet);
      return [defaultTweet];
    }
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

      const response = await this.axiosInstance.post(
        "https://api.x.ai/api/chat/completions",
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
