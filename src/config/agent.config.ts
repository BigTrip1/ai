import { CharacterState } from "@/types/character";
import { PlatformConfig } from "@/types/social";

export const defaultCharacterState: CharacterState = {
  name: "AI Agent",
  avatar: {
    model: "/models/default.glb",
    animations: ["idle", "talking"],
    currentAnimation: "idle",
  },
  emotion: {
    name: "neutral",
    intensity: 0.5,
    expression: "default",
  },
  personality: {
    traits: ["helpful", "friendly"],
    tone: "professional",
    responseStyle: "concise",
  },
  status: {
    isActive: true,
    currentTask: null,
    lastUpdate: new Date(),
  },
  customization: {
    appearance: {},
    behavior: {},
  },
};

export const defaultPlatformConfigs: Record<string, PlatformConfig> = {
  twitter: {
    platform: "twitter",
    enabled: true,
    credentials: {
      apiKey: process.env.TWITTER_API_KEY || "",
      apiSecret: process.env.TWITTER_API_SECRET || "",
      token: process.env.TWITTER_ACCESS_TOKEN || "",
    },
    postingRules: {
      maxPostLength: 280,
      allowedMediaTypes: ["image", "video", "gif"],
      rateLimit: {
        posts: 300,
        timeWindow: 180, // 3 hours in minutes
      },
    },
  },
  discord: {
    platform: "discord",
    enabled: true,
    credentials: {
      token: process.env.DISCORD_BOT_TOKEN || "",
    },
    postingRules: {
      maxPostLength: 2000,
      allowedMediaTypes: ["image", "video", "gif"],
      rateLimit: {
        posts: 5,
        timeWindow: 1, // 1 minute
      },
    },
  },
  telegram: {
    platform: "telegram",
    enabled: true,
    credentials: {
      token: process.env.TELEGRAM_BOT_TOKEN || "",
    },
    postingRules: {
      maxPostLength: 4096,
      allowedMediaTypes: ["image", "video", "gif"],
      rateLimit: {
        posts: 20,
        timeWindow: 60, // 1 hour in minutes
      },
    },
  },
};
