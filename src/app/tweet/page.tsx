"use client";

import { useState } from "react";
import Link from "next/link";

interface TokenData {
  tokenSymbol?: string;
  tokenName?: string;
  price?: number;
  volume24h?: number;
  marketCap?: number;
  change24h?: string;
  holders?: number;
  sentiment?: string;
  generatedTweet?: string;
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

export default function TweetPage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tokenList, setTokenList] = useState<TokenData[]>([]);

  const analyzeTokens = async () => {
    setLoading(true);
    setError(null);
    try {
      console.log("[Frontend] Starting token analysis");
      const dataResponse = await fetch("/api/tokens/analyze");
      if (!dataResponse.ok) {
        throw new Error("Failed to fetch token data");
      }
      const data = await dataResponse.json();
      console.log("[Frontend] Received token data:", data);

      // Extract tokens from the response structure
      let tokens: TokenData[] = [];
      if (data.success && data.tokenData) {
        // Extract the token data directly
        tokens = [data.tokenData];
      }
      console.log("[Frontend] Processing tokens:", tokens.length, tokens);

      // Generate tweets for each token
      const tokensWithTweets = await Promise.all(
        tokens.map(async (token: TokenData) => {
          try {
            console.log(
              "[Frontend] Processing token:",
              token.tokenSymbol || "Unknown",
              token
            );

            // Ensure we have at least some data to work with
            if (!token || typeof token !== "object") {
              console.error(
                "[Frontend] Invalid token data - not an object:",
                token
              );
              throw new Error("Invalid token data structure - not an object");
            }

            // Enhanced data validation
            const requiredFields = [
              "tokenSymbol",
              "tokenName",
              "price",
              "volume24h",
              "marketCap",
            ] as const;
            const missingFields = requiredFields.filter(
              (field) => !token[field as keyof TokenData]
            );
            if (missingFields.length > 0) {
              console.error(
                `[Frontend] Missing required fields: ${missingFields.join(
                  ", "
                )}`,
                token
              );
              throw new Error(
                `Missing required fields: ${missingFields.join(", ")}`
              );
            }

            // If we already have tweets from the analysis, use those
            if (data.tweets && data.tweets.length > 0) {
              console.log(
                "[Frontend] Using pre-generated tweets:",
                data.tweets
              );
              return {
                ...token,
                generatedTweet: data.tweets[0],
              };
            }

            // Otherwise, generate a new tweet
            console.log(
              "[Frontend] Generating new tweet with data:",
              JSON.stringify(token, null, 2)
            );

            const tweetResponse = await fetch("/api/generate-tweet", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                prompt: `Analyze this token data and provide a tweet under 15 words in the format:
$${token.tokenSymbol}: Analysis + action?

Token Symbol: ${token.tokenSymbol}
Token Name: ${token.tokenName}
Analysis: ${JSON.stringify(token.analysis || {})}
Summary: ${token.tldr || ""}
Market Cap: ${token.marketCap ? `$${formatNumber(token.marketCap)}` : "N/A"}
Price: ${token.price ? `$${token.price.toFixed(8)}` : "N/A"}
Volume 24h: ${token.volume24h ? `$${formatNumber(token.volume24h)}` : "N/A"}
Sentiment: ${token.sentiment || "neutral"}
Events: ${token.events?.join(", ") || "none"}

Keep it cool, no caps for emotion, mix up the final actions like 'ape?', 'fomo?', 'stack?'`,
                tokenData: token,
              }),
            });

            if (!tweetResponse.ok) {
              const errorData = await tweetResponse.json();
              console.error(
                `[Frontend] Tweet generation failed for ${token.tokenSymbol}:`,
                {
                  status: tweetResponse.status,
                  statusText: tweetResponse.statusText,
                  error: errorData,
                }
              );
              throw new Error(
                errorData.error ||
                  errorData.details ||
                  `Failed to generate tweet (Status: ${tweetResponse.status})`
              );
            }

            const tweetData = await tweetResponse.json();
            console.log(
              "[Frontend] Successfully generated tweet for token:",
              token.tokenSymbol,
              tweetData
            );

            if (!tweetData.tweet) {
              console.error(
                "[Frontend] No tweet content in response:",
                tweetData
              );
              throw new Error("API response missing tweet content");
            }

            return {
              ...token,
              generatedTweet: tweetData.tweet,
            };
          } catch (err) {
            console.error(
              `[Frontend] Error generating tweet for ${token.tokenSymbol}:`,
              err
            );
            return {
              ...token,
              generatedTweet: `Error: ${
                err instanceof Error ? err.message : String(err)
              }`,
            };
          }
        })
      );

      console.log("[Frontend] Setting token list with tweets");
      setTokenList(tokensWithTweets);
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "An error occurred";
      console.error("[Frontend] Error in analyzeTokens:", err);
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const formatNumber = (num: number) => {
    if (num >= 1e6) return (num / 1e6).toFixed(2) + "M";
    if (num >= 1e3) return (num / 1e3).toFixed(2) + "K";
    return num.toFixed(2);
  };

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Navigation Bar */}
      <nav className="border-b border-[#1a1a1a] px-6 py-4">
        <div className="max-w-[1400px] mx-auto">
          <div className="flex items-center justify-between">
            <span className="text-2xl font-bold bg-gradient-to-r from-[#00ff95] to-[#00ff95]/50 text-transparent bg-clip-text">
              LURE
            </span>
            <div className="flex gap-8">
              <Link
                href="/dashboard"
                className="text-gray-400 hover:text-[#00ff95] transition-colors"
              >
                DASHBOARD
              </Link>
              <Link
                href="/tokens"
                className="text-gray-400 hover:text-[#00ff95] transition-colors"
              >
                TOKENS
              </Link>
              <Link
                href="/graduation"
                className="text-gray-400 hover:text-[#00ff95] transition-colors"
              >
                GRADUATION
              </Link>
              <Link
                href="/scan"
                className="text-gray-400 hover:text-[#00ff95] transition-colors"
              >
                SCAN
              </Link>
              <Link
                href="/agents"
                className="text-gray-400 hover:text-[#00ff95] transition-colors"
              >
                AGENTS
              </Link>
              <Link
                href="/system"
                className="text-gray-400 hover:text-[#00ff95] transition-colors"
              >
                SYSTEM
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="p-6">
        <div className="max-w-[1400px] mx-auto space-y-6">
          {/* Header */}
          <div className="flex justify-between items-center">
            <h1 className="text-xl font-medium">Token Explorer</h1>
            <button
              onClick={analyzeTokens}
              disabled={loading}
              className="bg-[#1a1a1a] hover:bg-[#2a2a2a] text-[#00ff95] px-4 py-2 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {loading ? (
                <>
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                      fill="none"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    />
                  </svg>
                  <span>Analyzing...</span>
                </>
              ) : (
                "Analyze Latest Tokens"
              )}
            </button>
          </div>

          {/* Search Bar */}
          <div className="relative">
            <input
              type="text"
              placeholder="Search by name or symbol..."
              className="w-full bg-[#1a1a1a] border border-[#333] rounded px-4 py-2 text-gray-300 focus:outline-none focus:border-[#00ff95]"
            />
          </div>

          {/* Token Table */}
          <div className="overflow-x-auto rounded-lg border border-[#1a1a1a]">
            <table className="w-full border-collapse">
              <thead>
                <tr className="text-gray-400 text-xs border-b border-[#1a1a1a]">
                  <th className="bg-[#0a0a0a] px-4 py-3 text-left font-medium">
                    TOKEN
                  </th>
                  <th className="bg-[#0a0a0a] px-4 py-3 text-right font-medium">
                    PRICE
                  </th>
                  <th className="bg-[#0a0a0a] px-4 py-3 text-right font-medium">
                    24H CHANGE
                  </th>
                  <th className="bg-[#0a0a0a] px-4 py-3 text-right font-medium">
                    24H VOLUME
                  </th>
                  <th className="bg-[#0a0a0a] px-4 py-3 text-right font-medium">
                    MARKET CAP
                  </th>
                  <th className="bg-[#0a0a0a] px-4 py-3 text-right font-medium">
                    HOLDERS
                  </th>
                  <th className="bg-[#0a0a0a] px-4 py-3 text-left font-medium">
                    GENERATED TWEET
                  </th>
                </tr>
              </thead>
              <tbody>
                {tokenList.length === 0 ? (
                  <tr>
                    <td
                      colSpan={7}
                      className="px-4 py-8 text-center text-gray-500 text-sm"
                    >
                      {loading
                        ? "Loading tokens..."
                        : "No tokens to display. Click 'Analyze Latest Tokens' to begin."}
                    </td>
                  </tr>
                ) : (
                  tokenList.map((token, index) => (
                    <tr
                      key={index}
                      className="border-b border-[#1a1a1a] hover:bg-[#1a1a1a] transition-colors"
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-full bg-[#1a1a1a] flex items-center justify-center">
                            <span className="text-[#00ff95]">
                              {token.tokenSymbol?.charAt(0) || "?"}
                            </span>
                          </div>
                          <span className="text-[#00ff95]">
                            {token.tokenSymbol || "Unknown"}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right font-mono">
                        $
                        {typeof token.price === "number"
                          ? token.price.toFixed(8)
                          : parseFloat(token.price || "0").toFixed(8)}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span
                          className={
                            token.change24h?.startsWith("-")
                              ? "text-red-400"
                              : "text-green-400"
                          }
                        >
                          {token.change24h || "0.00%"}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right font-mono">
                        $
                        {formatNumber(
                          typeof token.volume24h === "number"
                            ? token.volume24h
                            : parseFloat(token.volume24h || "0")
                        )}
                      </td>
                      <td className="px-4 py-3 text-right font-mono">
                        $
                        {formatNumber(
                          typeof token.marketCap === "number"
                            ? token.marketCap
                            : parseFloat(token.marketCap || "0")
                        )}
                      </td>
                      <td className="px-4 py-3 text-right font-mono">
                        {formatNumber(token.holders || 0)}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-300 max-w-md">
                        {token.generatedTweet || "Analyzing..."}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {error && (
            <div className="mt-4 bg-red-900/20 border border-red-500/50 text-red-400 px-4 py-3 rounded">
              <p className="text-sm">{error}</p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
