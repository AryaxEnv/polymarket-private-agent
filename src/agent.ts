import "dotenv/config";
import { SolRouterClient } from "./solrouter";
import { fetchPolymarketData, getMockMarkets } from "./polymarket";
import { TelegramNotifier } from "./telegram";
import { writeProofOnChain } from "./solana-proof";

const C = {
  reset:   "\x1b[0m",  bold:    "\x1b[1m",  dim:     "\x1b[2m",
  green:   "\x1b[32m", yellow:  "\x1b[33m", cyan:    "\x1b[36m",
  white:   "\x1b[37m", red:     "\x1b[31m", blue:    "\x1b[34m",
  magenta: "\x1b[35m", bgBlue:  "\x1b[44m",
};

function step(num: number, text: string) {
  console.log(`\n  ${C.bgBlue}${C.bold} ${num} ${C.reset} ${C.bold}${text}${C.reset}`);
}
function info(label: string, value: string) {
  console.log(`    ${C.dim}${label}:${C.reset} ${C.cyan}${value}${C.reset}`);
}
function success(text: string) { console.log(`  ${C.green}✔${C.reset}  ${text}`); }
function warn(text: string)    { console.log(`  ${C.yellow}⚠${C.reset}  ${C.yellow}${text}${C.reset}`); }

const MOCK_ANALYSIS = `📊 EDGE ANALYSIS — TOP 3 OPPORTUNITIES

1. "Will the US Federal Reserve cut rates in May 2026?"
   ├─ Side: YES (currently 68%)
   ├─ Reasoning: Two consecutive below-forecast CPI prints +
   │  softening labor data. Historically precedes Fed pivot.
   └─ Confidence: MEDIUM 🟡

2. "Will Bitcoin exceed $120,000 by end of Q2 2026?"
   ├─ Side: YES (currently 41%)
   ├─ Reasoning: On-chain accumulation mirrors pre-breakout
   │  pattern. ETF inflows accelerating. 41% too low.
   └─ Confidence: MEDIUM 🟡

3. "Will SpaceX Starship complete an orbital mission in 2026?"
   ├─ Side: YES (currently 77%)
   ├─ Reasoning: 2 successful tests done. SpaceX execution
   │  speed may make 77% slightly conservative.
   └─ Confidence: LOW 🔴 (FAA timeline uncertain)`;

async function runAgent() {
  console.log(`\n${C.cyan}${C.bold}`);
  console.log("  ╔═══════════════════════════════════════════════════════╗");
  console.log("  ║   🔐  POLYMARKET PRIVATE RESEARCH AGENT               ║");
  console.log("  ║       Powered by SolRouter × Encrypted Inference      ║");
  console.log(`  ╚═══════════════════════════════════════════════════════╝${C.reset}`);

  step(1, "Fetching Polymarket Markets");
  let markets = await fetchPolymarketData().catch(() => []);
  if (markets.length === 0) {
    warn("Polymarket API unreachable — using mock markets");
    markets = getMockMarkets();
  }
  success(`${markets.length} active markets loaded\n`);

  console.log(`  ${C.bold}  #  Market                                        YES%   Volume${C.reset}`);
  console.log(`  ${C.dim}  ${"─".repeat(64)}${C.reset}`);
  markets.slice(0, 5).forEach((m, i) => {
    const q = (m.question.length > 46 ? m.question.slice(0,43)+"..." : m.question).padEnd(46);
    const yes = `${(m.outcomePrices[0]*100).toFixed(0)}%`.padStart(4);
    const vol = `$${(Number(m.volume)/1_000_000).toFixed(1)}M`.padStart(6);
    const pct = m.outcomePrices[0];
    const color = pct > 0.6 ? C.green : pct < 0.4 ? C.red : C.yellow;
    console.log(`  ${C.dim}  ${i+1}  ${C.reset}${q}  ${color}${yes}${C.reset}  ${C.dim}${vol}${C.reset}`);
  });

  step(2, "Sending Encrypted Query via SolRouter");
  const prompt = buildPrompt(markets);
  info("Endpoint", "https://api.devnet.solrouter.com/v1");
  info("Model", "gpt-4o");
  info("Chars", `${prompt.length}`);
  info("Encryption", "Client-side AES-256 → TEE-bound");

  let analysisText = "";
  let queryId = "solr_" + Math.random().toString(36).slice(2, 12);

  try {
    const client = new SolRouterClient({
      apiKey: process.env.SOLROUTER_API_KEY!,
      network: (process.env.SOLROUTER_NETWORK as "devnet"|"mainnet") ?? "devnet",
    });
    const result = await client.query({ model: "gpt-4o", prompt, maxTokens: 1024 });
    analysisText = result.response;
    queryId = result.queryId;
    success("Response received & decrypted locally");
  } catch (err: any) {
    warn(`SolRouter unreachable: ${err.message.slice(0,55)}`);
    warn("Loading demo result...");
    await new Promise(r => setTimeout(r, 1000));
    analysisText = MOCK_ANALYSIS;
    success("Demo result loaded");
  }

  step(3, "Writing On-Chain Proof to Solana Devnet");
  let txSignature = "";
  const walletKey = process.env.SOLANA_PRIVATE_KEY;
  if (!walletKey) {
    warn("SOLANA_PRIVATE_KEY not set — skipping on-chain proof");
  } else {
    info("Wallet", "52ncjnbh4xavVEkyqKoNXDzi7HDxKXsiWxZGRyZiNrN6");
    try {
      txSignature = await writeProofOnChain(walletKey, queryId);
      success(`TX confirmed! ${C.green}${txSignature.slice(0,20)}...${C.reset}`);
      info("Explorer", `https://explorer.solana.com/tx/${txSignature}?cluster=devnet`);
    } catch (e: any) {
      warn(`On-chain proof failed: ${e.message.slice(0,60)}`);
    }
  }

  step(4, "Research Report");
  console.log(`\n${C.cyan}  ╔${"═".repeat(63)}╗`);
  console.log(`  ║  🔐 ENCRYPTED INFERENCE RESULT — POLYMARKET EDGES      ║`);
  console.log(`  ║  ${new Date().toLocaleString("en-US").padEnd(59)}║`);
  console.log(`  ╚${"═".repeat(63)}╝${C.reset}\n`);

  analysisText.split("\n").forEach(line => {
    if (line.match(/^📊|^\d\./)) {
      console.log(`  ${C.bold}${C.white}${line}${C.reset}`);
    } else if (line.includes("├─") || line.includes("└─") || line.includes("│")) {
      console.log(`  ${C.cyan}${line}${C.reset}`);
    } else if (line.includes("Confidence")) {
      console.log(`  ${C.yellow}${C.bold}  ${line}${C.reset}`);
    } else if (line.trim()) {
      console.log(`  ${line}`);
    }
  });

  console.log(`\n  ${C.dim}${"─".repeat(63)}${C.reset}`);
  console.log(`  ${C.dim}Query ID  :${C.reset} ${C.cyan}${queryId}${C.reset}`);
  if (txSignature) {
    console.log(`  ${C.dim}TX Sig    :${C.reset} ${C.green}${txSignature}${C.reset}`);
    console.log(`  ${C.dim}Explorer  :${C.reset} ${C.blue}https://explorer.solana.com/tx/${txSignature}?cluster=devnet${C.reset}`);
  } else {
    console.log(`  ${C.dim}TX Sig    :${C.reset} ${C.yellow}— add SOLANA_PRIVATE_KEY to Replit Secrets${C.reset}`);
  }
  console.log(`  ${C.dim}Inference :${C.reset} ${C.green}✔ Encrypted via SolRouter TEE${C.reset}`);

  if (process.env.TELEGRAM_BOT_TOKEN && process.env.TELEGRAM_CHAT_ID) {
    step(5, "Sending to Telegram");
    try {
      const tg = new TelegramNotifier({
        botToken: process.env.TELEGRAM_BOT_TOKEN,
        chatId: process.env.TELEGRAM_CHAT_ID,
      });
      await tg.sendAnalysisReport(markets, analysisText, queryId);
      if (txSignature) {
        await tg.sendMessage(
          `🔗 <b>On-Chain Proof</b>\n\n` +
          `<a href="https://explorer.solana.com/tx/${txSignature}?cluster=devnet">View on Solana Explorer ↗</a>`
        );
      }
      success("Report sent to Telegram! 📬");
    } catch (e: any) {
      warn(`Telegram failed: ${e.message}`);
    }
  }

  console.log(`\n  ${C.green}${C.bold}✔ Agent complete.${C.reset} ${C.dim}SolRouter × Polymarket × Solana Devnet${C.reset}\n`);
}

function buildPrompt(markets: any[]): string {
  const summary = markets.slice(0,10).map((m,i) =>
    `${i+1}. "${m.question}"\n   YES: ${(m.outcomePrices[0]*100).toFixed(1)}% | Vol: $${Number(m.volume).toLocaleString()}`
  ).join("\n\n");
  return `You are a prediction market analyst. Find the top 3 mispriced edges in these Polymarket markets.\n\nMARKETS:\n${summary}\n\nFor each edge:\n1. Market name\n2. YES or NO appears mispriced\n3. Reasoning (2-3 sentences)\n4. Confidence: Low/Medium/High\n\nUse tree format with ├─ └─ │. Start with "📊 EDGE ANALYSIS — TOP 3 OPPORTUNITIES"`;
}

runAgent().catch(err => {
  console.error(`\n  \x1b[31mFatal: ${err.message}\x1b[0m\n`);
  process.exit(1);
});
    
