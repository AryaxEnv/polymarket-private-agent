/**
 * Telegram Notifier
 *
 * Sends Polymarket research reports to your Telegram bot.
 *
 * Setup:
 *   1. Chat @BotFather on Telegram → /newbot → copy token
 *   2. Chat @userinfobot on Telegram → copy your Chat ID
 *   3. Add TELEGRAM_BOT_TOKEN and TELEGRAM_CHAT_ID to .env
 */

export interface TelegramConfig {
  botToken: string;
  chatId: string;
}

export class TelegramNotifier {
  private readonly botToken: string;
  private readonly chatId: string;
  private readonly baseUrl: string;

  constructor(config: TelegramConfig) {
    if (!config.botToken || !config.chatId) {
      throw new Error("TELEGRAM_BOT_TOKEN and TELEGRAM_CHAT_ID must be set in .env");
    }
    this.botToken = config.botToken;
    this.chatId = config.chatId;
    this.baseUrl = `https://api.telegram.org/bot${this.botToken}`;
  }

  async sendMessage(text: string): Promise<void> {
    await this.post("sendMessage", {
      chat_id: this.chatId,
      text,
      parse_mode: "HTML",
    });
  }

  async sendAnalysisReport(
    markets: { question: string; outcomePrices: number[]; volume: string }[],
    llmAnalysis: string,
    queryId: string
  ): Promise<void> {
    const topMarkets = markets.slice(0, 3).map(m =>
      `• <b>${m.question.slice(0, 60)}${m.question.length > 60 ? "…" : ""}</b>\n` +
      `  YES: ${(m.outcomePrices[0] * 100).toFixed(1)}% | Vol: $${(Number(m.volume) / 1_000_000).toFixed(1)}M`
    ).join("\n\n");

    const shortAnalysis = llmAnalysis.length > 800
      ? llmAnalysis.slice(0, 800) + "…\n\n<i>(see terminal for full report)</i>"
      : llmAnalysis;

    const message =
      `🔐 <b>Polymarket Private Research Report</b>\n` +
      `🕐 ${new Date().toLocaleString("en-US")}\n` +
      `🔑 Query ID: <code>${queryId}</code>\n\n` +
      `━━━━━━━━━━━━━━━━━━━━━━\n` +
      `📊 <b>Top Markets Analyzed:</b>\n\n` +
      `${topMarkets}\n\n` +
      `━━━━━━━━━━━━━━━━━━━━━━\n` +
      `🧠 <b>AI Analysis (via SolRouter TEE):</b>\n\n` +
      `${shortAnalysis}\n\n` +
      `━━━━━━━━━━━━━━━━━━━━━━\n` +
      `<i>Inference processed via SolRouter encrypted TEE</i>`;

    await this.sendMessage(message);
  }

  async sendError(errorMessage: string): Promise<void> {
    await this.sendMessage(`❌ <b>Agent Error</b>\n\n<code>${errorMessage}</code>`);
  }

  async testConnection(): Promise<string> {
    const res = await this.post("getMe", {});
    return `✅ Bot connected: @${res.result.username}`;
  }

  private async post(method: string, body: object): Promise<any> {
    const res = await fetch(`${this.baseUrl}/${method}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    if (!data.ok) throw new Error(`Telegram API error: ${data.description}`);
    return data;
  }
}
