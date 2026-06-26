# Telegram SuperBot

A production-grade, modular Telegram bot for crypto communities. Manages raids, buy alerts, X feed watching, moderation, rankings, and more — all in one bot.

---

## What This Bot Does

You add this bot to your Telegram group. It then handles everything automatically:

- Posts an alert every time someone buys your token on-chain
- Watches Twitter/X accounts and reposts their tweets to your group
- Lets your community do Twitter raids and earn XP rewards
- Automatically mutes spammers and blocks bad links
- Greets new members with a custom welcome message
- Tracks who's most active with an XP leaderboard
- Lets admins turn features on/off without restarting anything

---

## Before You Start

You need these installed on your computer or server:

- **Node.js** v18 or higher — [nodejs.org](https://nodejs.org)
- **PostgreSQL** — a running database ([download](https://www.postgresql.org/download))
- **Redis** *(optional)* — for better performance ([download](https://redis.io/download)). The bot works without it using memory instead.

You also need accounts/keys from:

- **Telegram** — create a bot via [@BotFather](https://t.me/BotFather), get your `BOT_TOKEN`
- **Twitter/X Developer** — get API credentials at [developer.twitter.com](https://developer.twitter.com)
- **Birdeye** — free API key at [birdeye.so](https://birdeye.so) for token price/volume data
- **Blockchain RPC** — free endpoints from [Helius](https://helius.dev) (Solana), [Infura](https://infura.io) (ETH), or use the public ones already in `.env.example`

---

## Setup (Step by Step)

### 1. Download the code

```bash
git clone https://github.com/yourname/telegram-superbot.git
cd telegram-superbot
```

### 2. Install dependencies

```bash
npm install
```

### 3. Set up your environment variables

```bash
cp .env.example .env
```

Open `.env` in any text editor and fill in your values:

```env
BOT_TOKEN=123456:ABC-your-telegram-token
BOT_USERNAME=YourBotUsername

DATABASE_URL=postgresql://postgres:password@localhost:5432/superbot

REDIS_URL=redis://localhost:6379

TWITTER_BEARER_TOKEN=your-bearer-token
TWITTER_API_KEY=...
TWITTER_API_SECRET=...
TWITTER_ACCESS_TOKEN=...
TWITTER_ACCESS_SECRET=...

SOLANA_RPC_URL=https://api.mainnet-beta.solana.com
SOLANA_WS_URL=wss://api.mainnet-beta.solana.com
ETH_RPC_URL=https://mainnet.infura.io/v3/your-key
ETH_WS_URL=wss://mainnet.infura.io/ws/v3/your-key
BSC_RPC_URL=https://bsc-dataseed.binance.org
BSC_WS_URL=wss://bsc-ws-node.nariox.org:443
BASE_RPC_URL=https://mainnet.base.org
BASE_WS_URL=wss://mainnet.base.org

BIRDEYE_API_KEY=your-birdeye-key

PRO_LICENSE_SECRET=make-up-any-long-secret-string
```

### 4. Create the database tables

```bash
npx prisma migrate dev --schema=src/db/schema.prisma --name init
```

This creates all the tables your bot needs automatically.

### 5. Run the bot

```bash
# Development (auto-restarts on code changes)
npm run dev

# Production
npm run build
npm start
```

You should see:
```
✅ Bot @YourBotUsername is live
```

---

## Adding the Bot to Your Group

1. Open Telegram, go to your group
2. Click the group name → Add Members
3. Search for your bot's username and add it
4. **Make the bot an admin** — it needs permission to delete messages, mute/ban users, and pin messages

---

## First Time Setup in Your Group

Once the bot is in your group, run these commands as an admin:

**Register your token:**
```
/settoken <contract_address> <chain> <symbol> <name>
```
Example:
```
/settoken So11111111111111111111111111111111111111112 solana SOL Solana
```

**Set a welcome message for new members:**
```
/setwelcome 👋 Welcome {name}! Read the rules and enjoy the community.
```
Placeholders you can use: `{name}`, `{username}`, `{first}`

**Check everything is working:**
```
/botstatus
```

---

## All Commands

### Token
| Command | What it does |
|---|---|
| `/settoken <address> <chain> <symbol> <name>` | Register your token (admin only) |
| `/token` | Show registered token info |
| `/removetoken` | Remove the token (admin only) |

Supported chains: `solana` `eth` `bsc` `base`

---

### Raids
| Command | What it does |
|---|---|
| `/raid <tweet_url>` | Start a Twitter raid (admin only) |
| `/verify` | Claim your XP after completing the raid |
| `/endraid` | Close the active raid (admin only) |
| `/raidstats` | Show how many people completed the raid |

---

### Rank & XP
| Command | What it does |
|---|---|
| `/rank` | See your XP, level, and position |
| `/leaderboard` | Top 10 most active members |

Members earn XP automatically by chatting, completing raids, and buying the token.

---

### Mentions
| Command | What it does |
|---|---|
| `/mention` | Tag random opted-in members |
| `/optin` | Join the mention pool |
| `/optout` | Leave the mention pool |

There's a cooldown between uses and a daily cap to prevent spam.

---

### X (Twitter) Feed
| Command | What it does |
|---|---|
| `/addfeed @username` | Watch a Twitter account and auto-post their tweets |
| `/removefeed @username` | Stop watching an account |
| `/listfeeds` | Show all watched accounts |
| `/togglefeed @username on\|off` | Pause/resume a feed |

The bot checks for new tweets every 5 minutes. It skips replies and retweets — originals only.

---

### Moderation
| Command | What it does |
|---|---|
| `/mute` | Mute the replied-to user for 10 minutes |
| `/ban` | Ban the replied-to user |
| `/unban <user_id>` | Unban a user |
| `/warn` | Issue a warning (tracked in DB) |
| `/modsettings` | Show current moderation settings |

The bot also automatically deletes spam and blocks external group links. Admins are never affected by auto-moderation.

---

### Content Filters
| Command | What it does |
|---|---|
| `/addfilter <type> <action> <value>` | Add a filter rule |
| `/removefilter <rule_id>` | Remove a rule |
| `/listfilters` | Show all active rules |
| `/exemptuser` | Reply to a message to exempt that user from filters |
| `/unexemptuser` | Remove a user's exemption |

Filter types: `keyword` `link` `regex`
Filter actions: `delete` `mute` `ban`

Examples:
```
/addfilter keyword delete buy more
/addfilter regex mute (giveaway|airdrop)
```

---

### Welcome
| Command | What it does |
|---|---|
| `/setwelcome <message>` | Set the welcome message |
| `/togglewelcome` | Turn welcome messages on or off |
| `/welcomeinfo` | Show current welcome settings |

---

### Global Listings
| Command | What it does |
|---|---|
| `/list <message>` | Submit your token to the global listings channel |
| `/mylistings` | See your recent listing submissions |

After running `/list`, you'll get a preview with a Confirm button before it's posted publicly.

---

### Admin
| Command | What it does |
|---|---|
| `/features` | Show all features and whether they're on/off |
| `/enable <feature>` | Turn a feature on |
| `/disable <feature>` | Turn a feature off |
| `/setpro <license_key>` | Activate PRO tier for this group |
| `/botstatus` | Health check — token, plan, online status |
| `/auditlog` | Show recent admin actions |

Feature names: `raid` `xfeed` `buyalert` `volume` `mention` `moderation` `rank` `welcome` `filters` `listing`

---

## PRO vs FREE

| Feature | FREE | PRO |
|---|---|---|
| Raids | ✅ | ✅ |
| Mentions | ✅ | ✅ |
| Moderation | ✅ | ✅ |
| Rank / XP | ✅ | ✅ |
| Welcome | ✅ | ✅ |
| Filters | ✅ | ✅ |
| X Feed Watcher | ❌ | ✅ |
| Buy Alerts | ❌ | ✅ |
| Volume Tracking | ❌ | ✅ |
| Global Listings | ❌ | ✅ |

Activate PRO with `/setpro <your_license_key>`. The license key is whatever you set as `PRO_LICENSE_SECRET` in your `.env` file.

---

## Running in Production

For a live server, use PM2 to keep the bot running:

```bash
npm install -g pm2
npm run build
pm2 start dist/index.js --name superbot
pm2 save
pm2 startup
```

To see logs:
```bash
pm2 logs superbot
```

---

## Project Structure (Quick Reference)

```
src/
├── index.ts              # Starts everything
├── bot.ts                # Wires all modules together
├── config/               # Env vars, permissions, limits, feature flags
├── modules/
│   ├── raid/             # Twitter raid system
│   ├── x-feed/           # Auto-post from watched X accounts
│   ├── buy-alert/        # On-chain buy notifications
│   ├── volume/           # Volume milestones
│   ├── mention/          # /mention command
│   ├── moderation/       # Spam, links, captcha, mute/ban
│   ├── rank/             # XP and leaderboard
│   ├── token/            # Token registration
│   ├── welcome/          # New member greetings
│   ├── filters/          # Custom content rules
│   ├── listing/          # Global listing channel
│   └── admin/            # Feature toggles, audit log
├── services/             # Twitter API, blockchain WS, cache, scheduler
├── db/                   # Prisma schema and database client
└── utils/                # Shared helpers
```

Each module is fully isolated. If one crashes, the rest keep running.

---

## Common Issues

**Bot doesn't respond to commands**
Make sure the bot is an admin in your group.

**Buy alerts not showing**
You need to register your token first with `/settoken`, and the group needs PRO enabled.

**Redis connection error on startup**
This is fine — the bot automatically uses in-memory cache instead. For production, set up Redis for better performance.

**Twitter feed not posting**
Check your `TWITTER_BEARER_TOKEN` is valid. The feed polls every 5 minutes so wait a bit after adding a feed.

**Database migration fails**
Make sure PostgreSQL is running and your `DATABASE_URL` in `.env` is correct.
