"use client";

import { useState } from "react";

export function TweetForm() {
  const [tweet, setTweet] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const response = await fetch("/api/twitter/tweet", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ content: tweet }),
      });
      
      if (!response.ok) {
        throw new Error("Failed to post tweet");
      }
      
      setTweet("");
    } catch (error) {
      console.error("Error posting tweet:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="relative">
        <div className="absolute inset-0 bg-gradient-to-r from-[#00ff95] to-[#ff6b00] rounded-lg opacity-20 blur-lg"></div>
        <textarea
          id="tweet"
          name="tweet"
          rows={4}
          className="w-full bg-[#1a1a1a] text-gray-200 rounded-lg border border-gray-800 shadow-sm focus:border-[#00ff95] focus:ring-2 focus:ring-[#00ff95]/20 transition-all duration-200 p-4 placeholder-gray-600 relative z-10"
          value={tweet}
          onChange={(e) => setTweet(e.target.value)}
          placeholder="Enter your tweet..."
          maxLength={280}
        />
        <div className="absolute bottom-4 right-4 text-sm text-gray-500">
          {tweet.length}/280
        </div>
      </div>
      <button
        type="submit"
        disabled={loading || !tweet}
        className="cyber-button w-full disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {loading ? (
          <span className="flex items-center justify-center gap-2">
            <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            Posting...
          </span>
        ) : (
          "Post Tweet"
        )}
      </button>
    </form>
  );
}
