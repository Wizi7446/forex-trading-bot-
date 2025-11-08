forex-telegram-bot
================

This project is a ready-to-deploy Telegram bot that analyzes markets (Forex, Crypto, Commodities, OTC)
and suggests trade signals based on multiple indicators and optional OpenAI confirmation.
It supports demo mode and a manual switch to real mode (requires Pocket Option API and caution).

Files:
- server.js        : main Node.js bot (Telegram + OpenAI + PocketOption placeholders)
- package.json     : dependencies and start script
- .env.example     : template for required environment variables
- README.txt       : this file

SETUP (Render):
1. Create a GitHub repository and upload these files.
2. Sign in to Render.com and create a new Web Service.
3. Connect your GitHub repo, select the repo and branch.
4. Set Build Command: npm install
   Set Start Command: npm start
5. Add Environment Variables in Render settings:
   - TELEGRAM_BOT_TOKEN (required)
   - POCKET_OPTION_API_KEY (optional; required for real trading)
   - OPENAI_API_KEY (optional; required for AI confirmations)
   - MODE (demo or real) - default 'demo'
6. Deploy. The bot will start and listen to Telegram commands.

LOCAL TEST (Node):
- Install Node.js >= 18
- npm install
- Create a .env file (or export environment vars)
- npm start

SECURITY & COMPLIANCE:
- Bot does NOT auto-execute trades unless you switch to real mode and confirm.
- Always test in demo mode extensively before moving to real.
- Keep your API keys private; never share your .env.