export interface TokenData {
  tokenSymbol: string;
  tokenName: string;
  marketCap?: string | number;
  price?: string | number;
  volume24h?: string | number;
  sentiment?: string;
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

export interface TokenAnalysisResult {
  success: boolean;
  token?: TokenData;
  message?: string;
  error?: string;
  details?: string;
  tweets?: string[];
} 