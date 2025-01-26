import { TwitterApi } from "twitter-api-v2";
import { Telegraf } from "telegraf";
import { SocialPost, PlatformConfig } from "@/types/social";
import { Client as DiscordClient } from "discord.js";

export class SocialMediaManager {
  private discordClient: DiscordClient | null;
  private twitterClient: TwitterApi | null;
  private telegramBot: Telegraf;
  private platformConfigs: Record<string, PlatformConfig>;
  private postHistory: Map<string, { timestamp: Date; count: number }> =
    new Map();
  private isDevelopmentMode: boolean;

  constructor(
    discordClient: DiscordClient | null,
    twitterClient: TwitterApi | null,
    telegramBot: Telegraf,
    platformConfigs: Record<string, PlatformConfig>
  ) {
    this.discordClient = discordClient;
    this.twitterClient = twitterClient;
    this.telegramBot = telegramBot;
    this.platformConfigs = platformConfigs;
    this.isDevelopmentMode = process.env.NODE_ENV === "development";
  }

  private async checkRateLimit(platform: string): Promise<boolean> {
    const config = this.platformConfigs[platform];
    if (!config?.postingRules) return true;

    const history = this.postHistory.get(platform);
    if (!history) return true;

    const { posts, timeWindow } = config.postingRules.rateLimit;
    const windowStart = new Date(Date.now() - timeWindow * 60 * 1000);

    return history.timestamp < windowStart || history.count < posts;
  }

  private updatePostHistory(platform: string) {
    const history = this.postHistory.get(platform);
    if (history) {
      history.count++;
    } else {
      this.postHistory.set(platform, { timestamp: new Date(), count: 1 });
    }
  }

  private validateContent(content: string, platform: string): string {
    const config = this.platformConfigs[platform];
    if (!config?.postingRules?.maxPostLength) return content;

    return content.slice(0, config.postingRules.maxPostLength);
  }

  async post(post: SocialPost): Promise<boolean> {
    try {
      const canPost = await this.checkRateLimit(post.platform);
      if (!canPost) {
        throw new Error(`Rate limit exceeded for ${post.platform}`);
      }

      const validatedContent = this.validateContent(
        post.content,
        post.platform
      );

      switch (post.platform) {
        case "twitter":
          await this.postToTwitter(validatedContent, post.media);
          break;
        case "telegram":
          await this.postToTelegram(validatedContent, post.media);
          break;
        case "discord":
          await this.postToDiscord(validatedContent, post.channelId);
          break;
        default:
          throw new Error(`Unsupported platform: ${post.platform}`);
      }

      this.updatePostHistory(post.platform);
      return true;
    } catch (error) {
      console.error(`Error posting to ${post.platform}:`, error);
      return false;
    }
  }

  private async postToTwitter(content: string, media?: SocialPost["media"]) {
    if (media?.length) {
      // Handle media upload and posting
      const mediaIds = await Promise.all(
        media.map((m) => this.twitterClient!.v1.uploadMedia(m.url))
      );
      await this.twitterClient!.v2.tweet({
        text: content,
        media: { media_ids: mediaIds },
      });
    } else {
      await this.twitterClient!.v2.tweet(content);
    }
  }

  private async postToTelegram(content: string, media?: SocialPost["media"]) {
    const chatId = process.env.TELEGRAM_CHAT_ID as string;

    if (media?.length) {
      // Handle different media types
      const firstMedia = media[0];
      switch (firstMedia.type) {
        case "photo":
          await this.telegramBot.telegram.sendPhoto(chatId, firstMedia.url, {
            caption: content,
          });
          break;
        case "video":
          await this.telegramBot.telegram.sendVideo(chatId, firstMedia.url, {
            caption: content,
          });
          break;
        default:
          await this.telegramBot.telegram.sendMessage(chatId, content);
      }
    } else {
      await this.telegramBot.telegram.sendMessage(chatId, content);
    }
  }

  private async postToDiscord(
    content: string,
    channelId: string
  ): Promise<void> {
    if (!this.discordClient) {
      console.warn("Discord client not initialized");
      return;
    }

    try {
      const channel = await this.discordClient.channels.fetch(channelId);
      if (channel?.isTextBased()) {
        await channel.send(content);
      }
    } catch (error) {
      console.error("Error posting to Discord:", error);
      throw error;
    }
  }

  // Public method for tweeting
  async tweet(content: string): Promise<void> {
    if (this.isDevelopmentMode) {
      console.log("Development mode - Tweet preview:", content);
      return;
    }

    if (!this.twitterClient) {
      console.warn("Twitter client not initialized");
      return;
    }

    try {
      await this.twitterClient.v2.tweet(content);
    } catch (error) {
      console.error("Error posting to Twitter:", error);
      throw error;
    }
  }
}
