"use client";

import React from "react";

interface TweetPreviewProps {
  tweets?: string[];
}

export function TweetPreview({ tweets = [] }: TweetPreviewProps) {
  if (!tweets || tweets.length === 0) {
    return (
      <div className="text-gray-500 text-sm">
        No tweets generated yet
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {tweets.map((tweet, index) => (
        <div key={index} className="text-gray-300 text-sm">
          {tweet}
        </div>
      ))}
    </div>
  );
}
