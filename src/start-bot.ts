import "dotenv/config";
import { NyawitBot } from "./bot";

const token = process.env.TELEGRAM_BOT_TOKEN;

if (!token) {
  console.error("❌ TELEGRAM_BOT_TOKEN not found in .env / Replit Secrets.");
  process.exit(1);
}

const bot = new NyawitBot(token);
bot.start().catch(console.error);
