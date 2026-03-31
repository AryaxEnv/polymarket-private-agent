import { SolRouterClient } from "./solrouter";
import { fetchPolymarketData } from "./polymarket";
import { formatAnalysis } from "./utils";

/**
 * Polymarket Private Research Agent
 *
 * Fetches prediction market data from Polymarket, then routes
 * the analysis query through SolRouter's encrypted inference —
 * so your research strategy never touches a public server.
 */
async function runAgent() {
  console.log("🔐 Starting Polymarket Private Research Agent...\n");

  // ── 1. Fetch live market data from Polymarket ──────────────────
  console.log("📡 Fetching Polymarket data...");
  const markets = await fetchPolymarketData();

  if (markets.length === 0) {
    console.error("❌ No market data returned. Check your internet connection.");
    process.exit(1);
  }

  console.log(`✅ Fetched ${markets.length} active markets\n`);

  // ── 2. Build encrypted query for SolRouter ────────────────────
  const prompt = buildResearchPrompt(markets);

  // ── 3. Send via SolRouter (encrypted inference) ───────────────
  console.log("🔒 Sending encrypted query via SolRouter...");
  const client = new SolRouterClient({
    apiKey: process.env.SOLROUTER_API_KEY!,
    network: "devnet",
  });

  const result = await client.query({
    model: "gpt-4o",       // or whichever model SolRouter supports
    prompt,
    maxTokens: 1024,
  });

  // ── 4. Display results ────────────────────────────────────────
  const analysis = formatAnalysis(result.response, markets);
  console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("📊 PRIVATE RESEARCH REPORT");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");
  console.log(analysis);
  console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log(`\n✅ Query ID: ${result.queryId}`);
  console.log(`🔑 Inference verified on-chain: ${result.txSignature ?? "pending"}`);
}

/**
 * Build a structured research prompt from live Polymarket data.
 * This prompt is what gets ENCRYPTED before leaving your device.
 */
function buildResearchPrompt(markets: any[]): string {
  const marketSummary = markets
    .slice(0, 10)
    .map(
      (m, i) =>
        `${i + 1}. "${m.question}"
   - YES: ${(m.outcomePrices[0] * 100).toFixed(1)}%  |  NO: ${(m.outcomePrices[1] * 100).toFixed(1)}%
   - Volume: $${Number(m.volume).toLocaleString()}
   - Closes: ${new Date(m.endDate).toLocaleDateString()}`
    )
    .join("\n\n");

  return `You are a prediction market research analyst. Analyze the following Polymarket markets and identify the top 3 edges — markets where the current odds may be mispriced relative to available information.

ACTIVE MARKETS:
${marketSummary}

For each edge you find, provide:
1. The market name
2. Which side (YES/NO) appears mispriced
3. Your reasoning (2-3 sentences)
4. A confidence score (Low / Medium / High)

Be concise and specific. Focus on markets with high volume and near-term resolution.`;
}

runAgent().catch((err) => {
  console.error("Fatal error:", err.message);
  process.exit(1);
});
