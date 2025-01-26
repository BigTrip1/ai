import mongoose from "mongoose";

export interface ICollectedData {
  sourceId: mongoose.Types.ObjectId;
  sourceName: string;
  content: string;
  rawData: any;
  processed: boolean;
  processedContent?: {
    summary: string;
    keywords: string[];
    sentiment: "positive" | "negative" | "neutral";
    relevanceScore: number;
  };
  posted: boolean;
  postDate?: Date;
  metadata?: Record<string, any>;
}

const CollectedDataSchema = new mongoose.Schema<ICollectedData>(
  {
    sourceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "DataSource",
      required: true,
    },
    sourceName: { type: String, required: true },
    content: { type: String, required: true },
    rawData: { type: mongoose.Schema.Types.Mixed },
    processed: { type: Boolean, default: false },
    processedContent: {
      summary: String,
      keywords: [String],
      sentiment: { type: String, enum: ["positive", "negative", "neutral"] },
      relevanceScore: { type: Number, min: 0, max: 1 },
    },
    posted: { type: Boolean, default: false },
    postDate: { type: Date },
    metadata: { type: Map, of: mongoose.Schema.Types.Mixed },
  },
  {
    timestamps: true,
  }
);

// Index for efficient queries
CollectedDataSchema.index({ sourceId: 1, processed: 1 });
CollectedDataSchema.index({ posted: 1, processedContent: 1 });

export const CollectedData =
  mongoose.models.CollectedData ||
  mongoose.model<ICollectedData>("CollectedData", CollectedDataSchema);
