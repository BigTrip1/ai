import { TokenData } from "@/types/token";
import { IDataSource } from "@/lib/db/models/DataSource";
import { MongoClient } from "mongodb";

export class LureTokenSource {
  private mongoUri: string;

  constructor() {
    this.mongoUri = process.env.MONGODB_URI || "mongodb://localhost:27017/lure";
  }

  async fetchLatestTokens(): Promise<TokenData[]> {
    try {
      console.log("[LureTokenSource] Connecting to MongoDB...");
      const client = await MongoClient.connect(this.mongoUri);
      const db = client.db();

      // Fetch the latest entries from the lureTokens collection
      const tokens = await db
        .collection("lureTokens")
        .find()
        .sort({ timestamp: -1 })
        .limit(10)
        .toArray();

      console.log("[LureTokenSource] Fetched tokens:", tokens);

      await client.close();

      if (!tokens.length) {
        console.log("[LureTokenSource] No tokens found in database");
        return [];
      }

      // Map the MongoDB documents to TokenData format
      return tokens.map((token) => ({
        tokenSymbol: token.tokenSymbol,
        tokenName: token.tokenName,
        price: token.price,
        volume24h: token.volume24h,
        marketCap: token.marketCap,
        change24h: token.change24h,
        holders: token.holders,
        sentiment: token.sentiment,
        events: token.events || [],
        narrativeAlignment: token.narrativeAlignment,
        timing: token.timing,
        categories: token.categories,
        riskLevel: token.riskLevel,
        analysis: token.analysis || {},
        tldr: token.tldr,
      }));
    } catch (error) {
      console.error("[LureTokenSource] Error fetching tokens:", error);
      throw error;
    }
  }

  createDataSource(): IDataSource {
    return {
      name: "lure",
      type: "api",
      url: this.mongoUri,
      metadata: {
        description: "Lure token data source",
        version: "1.0.0",
      },
    };
  }
}
