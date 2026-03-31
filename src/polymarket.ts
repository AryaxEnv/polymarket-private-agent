/**
 * Polymarket Data Fetcher
 *
 * Pulls live market data from Polymarket's public CLOB API.
 * This data becomes the INPUT to our encrypted SolRouter query.
 *
 * Why does privacy matter here?
 * → If you send "which Polymarket markets am I researching?"
 *   to a regular AI API, that provider knows your strategy.
 * → With SolRouter, the query is encrypted before it leaves
 *   your machine. Nobody knows what you're researching.
 */

export interface PolymarketData {
  id: string;
  question: string;
  outcomePrices: number[]; // [YES_price, NO_price] as 0-1 fractions
  volume: string;          // lifetime volume in USD
  volume24h: string;       // 24h volume in USD
  endDate: string;         // ISO date string
  active: boolean;
  category?: string;
}

const POLYMARKET_GAMMA_API = "https://gamma-api.polymarket.com";
const POLYMARKET_CLOB_API  = "https://clob.polymarket.com";

/**
 * Fetch top active markets by volume.
 * Uses Polymarket's public Gamma API (no auth needed).
 */
export async function fetchPolymarketData(limit = 20): Promise<PolymarketData[]> {
  try {
    // Gamma API returns market metadata including odds
    const res = await fetch(
      `${POLYMARKET_GAMMA_API}/markets?active=true&closed=false&limit=${limit}&order=volume&ascending=false`,
      {
        headers: {
          Accept: "application/json",
          "User-Agent": "polymarket-private-agent/1.0",
        },
      }
    );

    if (!res.ok) {
      throw new Error(`Polymarket Gamma API returned ${res.status}`);
    }

    const raw = await res.json();

    // Normalise into our PolymarketData shape
    return raw
      .filter((m: any) => m.active && m.outcomePrices)
      .map((m: any) => ({
        id: m.id,
        question: m.question,
        outcomePrices: parseOutcomePrices(m.outcomePrices),
        volume: m.volume ?? "0",
        volume24h: m.volume24hr ?? "0",
        endDate: m.endDate ?? m.end_date_iso ?? "",
        active: m.active,
        category: m.category ?? "",
      }));
  } catch (err: any) {
    console.warn(`⚠️  Could not reach Polymarket API: ${err.message}`);
    console.warn("   Using mock data for demonstration...\n");
    return getMockMarkets();
  }
}

/** Parse Polymarket's string-encoded prices like "[\"0.72\",\"0.28\"]" */
function parseOutcomePrices(raw: string | number[]): number[] {
  try {
    if (Array.isArray(raw)) return raw.map(Number);
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.map(Number) : [0.5, 0.5];
  } catch {
    return [0.5, 0.5];
  }
}

/** Mock markets used as fallback (for testing without internet) */
export function getMockMarkets(): PolymarketData[] {
  return [
    {
      id: "mock-1",
      question: "Will Bitcoin exceed $120,000 by end of Q2 2026?",
      outcomePrices: [0.41, 0.59],
      volume: "4200000",
      volume24h: "320000",
      endDate: "2026-06-30",
      active: true,
      category: "Crypto",
    },
    {
      id: "mock-2",
      question: "Will the US Federal Reserve cut rates in May 2026?",
      outcomePrices: [0.68, 0.32],
      volume: "8900000",
      volume24h: "510000",
      endDate: "2026-05-31",
      active: true,
      category: "Economics",
    },
    {
      id: "mock-3",
      question: "Will SpaceX Starship complete an orbital mission in 2026?",
      outcomePrices: [0.77, 0.23],
      volume: "2100000",
      volume24h: "180000",
      endDate: "2026-12-31",
      active: true,
      category: "Science",
    },
    {
      id: "mock-4",
      question: "Will Solana's SOL token reach $500 before July 2026?",
      outcomePrices: [0.29, 0.71],
      volume: "3400000",
      volume24h: "290000",
      endDate: "2026-07-01",
      active: true,
      category: "Crypto",
    },
    {
      id: "mock-5",
      question: "Will there be a major AI regulation law passed in the EU in 2026?",
      outcomePrices: [0.55, 0.45],
      volume: "1200000",
      volume24h: "95000",
      endDate: "2026-12-31",
      active: true,
      category: "Politics",
    },
  ];
}
