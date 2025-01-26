export type SocialPlatform = "twitter" | "telegram";

export interface MediaItem {
  url: string;
  type: "photo" | "video";
}

export interface SocialPost {
  content: string;
  platform: SocialPlatform;
  media?: MediaItem[];
  metadata?: {
    hashtags?: string[];
    mentions?: string[];
  };
}

export interface PlatformConfig {
  postingRules: {
    maxPostLength: number;
    rateLimit: {
      posts: number;
      timeWindow: number; // in minutes
    };
  };
}
