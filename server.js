// server.js
// Forex-Telegram-Bot
// Node.js Telegram bot with OpenAI analysis placeholder and Pocket Option API placeholders.
// NOTE: Replace environment variables in Render or your host before running.

import TelegramBot from "node-telegram-bot-api";
import axios from "axios";
import dotenv from "dotenv";
import OpenAI from "openai";
dotenv.config();

const TELEGRAM_TOKEN = process.env.TELEGRAM_BOT_TOKEN || "";
const POCKET_API_KEY = process.env.POCKET_OPTION_API_KEY || "";
const OPENAI_API_KEY = process.env.OPENAI_API_KEY || "";
const MODE = (process.env.MODE || "demo").toLowerCase(); // demo or real

if (!TELEGRAM_TOKEN) {
  console.error("ERROR: TELEGRAM_BOT_TOKEN is not set in environment.");
  process.exit(1);
}

const bot = new TelegramBot(TELEGRAM_TOKEN, { polling: true });
const openai = OPENAI_API_KEY ? new OpenAI({ apiKey: OPENAI_API_KEY }) : null;

console.log("Bot starting... mode:", MODE);

// Simple in-memory session
let session = {
  active: false,
  maxSignals: 10,
  sent: 0,
  lastSignal: null,
  mode: MODE
};

// Helper: mock analyze function (replace with real data fetch when you connect PocketOption)
async function analyzeMarketOne() {
  // This function returns a mock signal object.
  // If OPENAI_API_KEY provided, we will call OpenAI to "confirm" the reasoning (optional).
  const pairs = [
    "EURUSD","GBPUSD","USDJPY","AUDUSD","USDCAD",
    "EURJPY","GBPJPY","BTCUSD","ETHUSD","XAUUSD"
  ];
  const asset = pairs[Math.floor(Math.random()*pairs.length)];
  const direction = Math.random() > 0.5 ? "BUY" : "SELL";
  const confidence = Math.floor(Math.random()*21) + 75; // 75-95%
  const timeframe = [3,5,10][Math.floor(Math.random()*3)];
  const suggestedStake = (() => {
    if (confidence >= 98) return 2000;
    if (confidence >= 95) return 1500;
    if (confidence >= 90) return 1000;
    if (confidence >= 80) return 500;
    return 100;
  })();

  let notes = [
    "EMA(9)>EMA(21)",
    "MACD bullish crossover",
    "RSI rising",
    "Price near support",
    "Volume spike",
  ];
  // pick subset of notes
  notes = notes.sort(()=>0.5-Math.random()).slice(0,3);

  const signal = {
    asset, direction, confidence, timeframe, suggestedStake, notes
  };

  // Optional: call OpenAI to get a short confirmation summary
  if (openai) {
    try {
      const prompt = `You are an assistant that confirms a trading signal. Asset: ${asset}, direction: ${direction}, timeframe: ${timeframe}m, indicators: ${notes.join(", ")}. Return a one-line summary stating confidence and whether to recommend.`;
      const resp = await openai.responses.create({
        model: "gpt-4o-mini", // use available model in your account
        input: prompt,
        max_tokens: 60
      });
      const text = resp.output && resp.output[0] && resp.output[0].content && resp.output[0].content[0] && resp.output[0].content[0].text
        ? resp.output[0].content[0].text
        : null;
      if (text) signal.ai_summary = text.trim();
    } catch (e) {
      console.warn("OpenAI confirm failed:", e.message || e);
    }
  }

  return signal;
}

// Pocket Option API placeholders - implement real calls after you have a supported wrapper
async function placePocketOptionOrder(signal) {
  // This is a placeholder. DO NOT use until you implement API safely and ensure compliance.
  // The function demonstrates how to structure the request.
  const url = session.mode === "real"
    ? "https://api.pocketoption.com/v1/trade"   // hypothetical
    : "https://api-demo.pocketoption.com/v1/trade"; // hypothetical
  // For now we return a mock success
  return {
    ok: true,
    id: Math.floor(Math.random()*1000000),
    executed: false,
    note: "This is a simulated response. Implement actual API calls here."
  };
}

// Telegram command handlers
bot.onText(/\/start/, (msg) => {
  bot.sendMessage(msg.chat.id, "👋 Forex-Telegram-Bot ready. Use /activate to start a session (10 signals max). Use /help for commands.");
});

bot.onText(/\/help/, (msg) => {
  const help = `
Commands:
/activate - start a new session (demo by default)
/next - analyze and return the next single trade signal
/confirm - confirm the last suggested trade (places it if MODE=real and POCKET key present)
/switch demo - switch to demo mode
/switch real - switch to real mode (requires confirmation)
/status - show session status
/rules - show brief rules
/help - this message
  `;
  bot.sendMessage(msg.chat.id, help);
});

bot.onText(/\/activate/, (msg) => {
  session.active = true;
  session.sent = 0;
  session.lastSignal = null;
  session.mode = process.env.MODE || "demo";
  bot.sendMessage(msg.chat.id, `✅ Session started in ${session.mode.toUpperCase()} mode. Send /next to get the first signal.`);
});

bot.onText(/\/next/, async (msg) => {
  if (!session.active) {
    return bot.sendMessage(msg.chat.id, "⚠️ No active session. Use /activate to start.");
  }
  if (session.sent >= session.maxSignals) {
    session.active = false;
    return bot.sendMessage(msg.chat.id, "✅ Session complete: max signals reached. Use /activate to start again.");
  }
  bot.sendMessage(msg.chat.id, "Analyzing market, please wait...");
  try {
    const signal = await analyzeMarketOne();
    session.lastSignal = signal;
    session.sent += 1;
    const payload = {
      PAIR: signal.asset,
      DIRECTION: signal.direction,
      CONFIDENCE: `${signal.confidence}%`,
      TIMEFRAME: `${signal.timeframe}m`,
      SUGGESTED_STAKE: `$${signal.suggestedStake}`,
      NOTES: signal.notes,
      AI_SUMMARY: signal.ai_summary || null,
      SIGNAL_NUMBER: `${session.sent} of ${session.maxSignals}`
    };
    // Send summary only (user requested)
    let human = `📊 Signal ${session.sent}/${session.maxSignals}\nPair: ${payload.PAIR}\nDirection: ${payload.DIRECTION}\nConfidence: ${payload.CONFIDENCE}\nTimeframe: ${payload.TIMEFRAME}\nSuggested demo stake: ${payload.SUGGESTED_STAKE}\nNotes: ${payload.NOTES.join(", ")}\n`;
    if (payload.AI_SUMMARY) human += `AI: ${payload.AI_SUMMARY}\n`;
    human += `\nReply with /confirm to place (simulated unless MODE=real and API enabled).`;
    bot.sendMessage(msg.chat.id, human);
    // also send machine-readable JSON
    bot.sendMessage(msg.chat.id, "```json\n" + JSON.stringify(payload, null, 2) + "\n```", { parse_mode: "Markdown" });
    // log to console
    console.log("Signal:", payload);
  } catch (e) {
    console.error("Analyze error:", e);
    bot.sendMessage(msg.chat.id, "Error during analysis. Try again.");
  }
});

bot.onText(/\/confirm/, async (msg) => {
  if (!session.lastSignal) return bot.sendMessage(msg.chat.id, "No signal to confirm. Use /next first.");
  // If in demo mode, do not place real orders; just simulate
  if (session.mode === "demo" || !POCKET_API_KEY) {
    const s = session.lastSignal;
    bot.sendMessage(msg.chat.id, `✅ Demo confirmed: ${s.direction} ${s.asset} for ${s.timeframe}m at suggested stake $${s.suggestedStake} (simulation only).`);
    return;
  }
  // Real mode + API key present - attempt to place order (placeholder)
  try {
    const r = await placePocketOptionOrder(session.lastSignal);
    bot.sendMessage(msg.chat.id, `Order placed: ${JSON.stringify(r)}`);
  } catch (e) {
    bot.sendMessage(msg.chat.id, "Failed to place order: " + (e.message || e));
  }
});

bot.onText(/\/switch\s+(.+)/, (msg, match) => {
  const to = (match[1] || "").toLowerCase();
  if (to !== "real" && to !== "demo") {
    return bot.sendMessage(msg.chat.id, "Usage: /switch demo OR /switch real");
  }
  if (to === "real") {
    bot.sendMessage(msg.chat.id, "⚠️ Switching to REAL mode requires confirmation. Reply with /confirm_switch_real to proceed.");
    // store pending request
    session.pending_switch = "real";
    return;
  }
  // immediate switch to demo
  session.mode = "demo";
  bot.sendMessage(msg.chat.id, "Switched to DEMO mode.");
});

bot.onText(/\/confirm_switch_real/, (msg) => {
  if (session.pending_switch !== "real") return bot.sendMessage(msg.chat.id, "No pending real switch.");
  if (!POCKET_API_KEY) return bot.sendMessage(msg.chat.id, "No Pocket Option API key configured. Add POCKET_OPTION_API_KEY in env to enable real mode.");
  session.mode = "real";
  session.pending_switch = null;
  bot.sendMessage(msg.chat.id, "✅ Switched to REAL mode. Be careful: real trades may execute if /confirm is used.");
});

bot.onText(/\/status/, (msg) => {
  bot.sendMessage(msg.chat.id, JSON.stringify({
    active: session.active,
    sent: session.sent,
    maxSignals: session.maxSignals,
    mode: session.mode
  }, null, 2));
});

bot.onText(/\/rules/, (msg) => {
  const rules = {
    maxSignalsPerSession: 10,
    stakeDemoRange: [100,2000],
    confirmationRequiredPercent: 80,
    markets: ["Forex","Crypto","Commodities","OTC"]
  };
  bot.sendMessage(msg.chat.id, "Rules:\n" + JSON.stringify(rules, null, 2));
});

console.log("Bot is running.");
