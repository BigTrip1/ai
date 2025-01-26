import { IDataSource } from "@/lib/db/models/DataSource";
import { MongoClient, WithId, Document } from "mongodb";

interface TokenDocument extends WithId<Document> {
  tokenAddress: string;
  tokenName: string;
  tokenSymbol: string;
  timestamp: Date;
  nameAnalysis?: {
    components: string[];
    trendingConnections: {
      relatedTokens: string[];
      narrativeAlignment: string;
      timing: string;
    };
  };
  marketMetrics?: {
    priceAnalysis?: {
      current?: string;
    };
    tradingActivity?: {
      volume?: {
        "24hVolumeUSD": string;
      };
    };
  };
  tldr?: {
    categories: string;
    sentiment: string;
    riskLevel: string;
    volumeLevel: string;
    priceDirection: string;
    socialPresence: string;
  };
  relevantEvents?: string[];
}

export class LureTokenSource {
  private mongoUri: string;

  constructor() {
    this.mongoUri = process.env.MONGODB_URI || "";
    if (!this.mongoUri) {
      console.warn("No MongoDB URI provided");
    }
  }

  async fetchLatestTokens(limit: number = 1) {
    console.log(
      `[LureTokenSource] Starting fetchLatestTokens with limit: ${limit}`
    );

    if (!this.mongoUri) {
      throw new Error("MongoDB URI is required");
    }

    const client = new MongoClient(this.mongoUri, {
      family: 4,
      serverSelectionTimeoutMS: 5000,
    });

    try {
      await client.connect();
      console.log("[LureTokenSource] Connected successfully to MongoDB");

      const db = client.db("lure");
      const collection = db.collection("lureTokens");

      console.log("[LureTokenSource] Executing find query...");
      const tokens = await collection
        .find()
        .sort({ timestamp: -1 })
        .limit(limit)
        .toArray();

      console.log(
        `[LureTokenSource] Query complete. Found ${tokens.length} tokens`
      );

      if (tokens.length === 0) {
        console.log("[LureTokenSource] No tokens found in collection");
        return [];
      }

      console.log(
        "[LureTokenSource] First token raw data:",
        JSON.stringify(tokens[0], null, 2)
      );

      const mappedTokens = tokens.map((token) => {
        const tokenDoc = token as unknown as TokenDocument;
        const mapped = {
          tokenSymbol: tokenDoc.tokenSymbol,
          tokenName: tokenDoc.tokenName,
          marketCap: tokenDoc.marketMetrics?.priceAnalysis?.current,
          price: tokenDoc.marketMetrics?.priceAnalysis?.current?.replace(
            "$",
            ""
          ),
          volume24h:
            tokenDoc.marketMetrics?.tradingActivity?.volume?.["24hVolumeUSD"],
          sentiment: tokenDoc.tldr?.sentiment || "neutral",
          events: tokenDoc.relevantEvents || [],
          narrativeAlignment:
            tokenDoc.nameAnalysis?.trendingConnections?.narrativeAlignment,
          timing: tokenDoc.nameAnalysis?.trendingConnections?.timing,
          categories: tokenDoc.tldr?.categories,
          riskLevel: tokenDoc.tldr?.riskLevel,
          timestamp: tokenDoc.timestamp,
        };
        console.log(
          "[LureTokenSource] Mapped token data:",
          JSON.stringify(mapped, null, 2)
        );
        return mapped;
      });

      return mappedTokens;
    } catch (error) {
      console.error("Error fetching tokens:", error);
      throw error;
    } finally {
      await client.close();
    }
  }

  async createDataSource(): Promise<IDataSource> {
    return {
      name: "lure-tokens",
      type: "api",
      url: "internal://lure-tokens",
      method: "GET",
      isActive: true,
      metadata: {
        description: "Lure token analysis data",
        updateFrequency: "5m",
      },
    };
  }
}
