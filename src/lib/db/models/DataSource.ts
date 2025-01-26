import mongoose from "mongoose";

export interface IDataSource {
  name: string;
  type: "rss" | "api" | "webhook";
  url: string;
  method?: string;
  headers?: Record<string, string>;
  params?: Record<string, string>;
  lastFetched?: Date;
  isActive: boolean;
  metadata?: Record<string, any>;
}

const DataSourceSchema = new mongoose.Schema<IDataSource>(
  {
    name: { type: String, required: true, unique: true },
    type: { type: String, required: true, enum: ["rss", "api", "webhook"] },
    url: { type: String, required: true },
    method: { type: String, default: "GET" },
    headers: { type: Map, of: String },
    params: { type: Map, of: String },
    lastFetched: { type: Date },
    isActive: { type: Boolean, default: true },
    metadata: { type: Map, of: mongoose.Schema.Types.Mixed },
  },
  {
    timestamps: true,
  }
);

export const DataSource =
  mongoose.models.DataSource ||
  mongoose.model<IDataSource>("DataSource", DataSourceSchema);
