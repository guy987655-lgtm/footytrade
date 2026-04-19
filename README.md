# FootyTrade

A gamified trading platform where users buy and sell virtual shares of real-world football players. Player prices fluctuate based on real-world statistics and in-platform demand, mimicking a stock market.

## Architecture

```
footytrade/
├── backend/          NestJS + Prisma + PostgreSQL + Redis + Socket.io
├── frontend/         Next.js 16 (App Router) + Tailwind CSS + Recharts
├── docker-compose.yml   Postgres 16 + Redis 7
└── README.md
```

- **Frontend** (`:3000`): Next.js with App Router, Tailwind dark GameFi theme, Recharts for charts, Zustand + React Query for state, Socket.io-client for live prices
- **Backend** (`:4000`): NestJS with 11 modules (auth, users, players, data-pipeline, pricing, trading, orders, market-maker, referrals, admin, realtime)
- **Database**: PostgreSQL via Prisma ORM (10 models)
- **Cache/Pub-Sub**: Redis for order book, price broadcasting, session locks

## Quick Start

### Prerequisites

- Node.js 20+
- Docker & Docker Compose (for Postgres + Redis)

### 1. Start Infrastructure

```bash
docker-compose up -d
```

### 2. Backend

```bash
cd backend
cp .env.example .env       # edit API_FOOTBALL_KEY if you have one
npm install
npx prisma migrate dev     # creates tables
npm run seed               # seeds 50 players + admin settings
npm run start:dev          # runs on :4000
```

### 3. Frontend

```bash
cd frontend
cp .env.example .env.local
npm install
npm run dev                # runs on :3000
```

### 4. Open the App

Visit `http://localhost:3000`. Click **Quick Demo Login** to start trading immediately (no Google OAuth setup needed for development).

## Environment Variables

### Backend (`backend/.env`)

| Variable | Description | Default |
|---|---|---|
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://footytrade:footytrade_secret@localhost:5432/footytrade` |
| `REDIS_URL` | Redis connection string | `redis://localhost:6379` |
| `JWT_SECRET` | Secret for signing JWTs | (change in production) |
| `GOOGLE_CLIENT_ID` | Google OAuth client ID | (optional for dev) |
| `GOOGLE_CLIENT_SECRET` | Google OAuth client secret | (optional for dev) |
| `GOOGLE_CALLBACK_URL` | OAuth callback URL | `http://localhost:4000/auth/google/callback` |
| `API_FOOTBALL_KEY` | API-Football key | (optional, falls back to seed data) |
| `FEE_PERCENT` | Trade fee percentage | `1.5` |
| `INITIAL_CREDITS` | Starting credits for new users | `10000` |
| `FRONTEND_URL` | Frontend URL for redirects | `http://localhost:3000` |

### Frontend (`frontend/.env.local`)

| Variable | Description | Default |
|---|---|---|
| `NEXT_PUBLIC_API_URL` | Backend REST API URL | `http://localhost:4000` |
| `NEXT_PUBLIC_WS_URL` | Backend WebSocket URL | `http://localhost:4000` |

## API Reference

### Auth
| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET | `/auth/google` | - | Initiate Google OAuth |
| GET | `/auth/google/callback` | - | OAuth callback (redirects to frontend) |
| POST | `/auth/dev-login` | - | Dev-only login `{ email, name }` → `{ access_token }` |
| GET | `/auth/me` | JWT | Get current user |

### Players
| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET | `/players` | - | List players (query: position, team, league, search, sortBy, order, page, limit) |
| GET | `/players/movers` | - | Top 5 gainers & losers (24h) |
| GET | `/players/:id` | - | Player detail with stats + price history |

### Trading
| Method | Endpoint | Auth | Description |
|---|---|---|---|
| POST | `/trading/buy` | JWT | Market buy `{ playerId, shares }` |
| POST | `/trading/sell` | JWT | Market sell `{ playerId, shares }` |
| GET | `/trading/history` | JWT | Transaction history (query: page, limit) |

### Orders
| Method | Endpoint | Auth | Description |
|---|---|---|---|
| POST | `/orders/limit` | JWT | Place limit order `{ playerId, side, shares, limitPrice }` |
| DELETE | `/orders/:id` | JWT | Cancel order |
| GET | `/orders/book/:playerId` | - | Order book for a player |
| GET | `/orders/mine` | JWT | User's orders (query: status) |

### Users
| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET | `/users/wallet` | JWT | Wallet balance + portfolio value |
| GET | `/users/portfolio` | JWT | Holdings with P&L |
| GET | `/users/watchlist` | JWT | Watchlist items |
| POST | `/users/watchlist/:playerId` | JWT | Add to watchlist |
| DELETE | `/users/watchlist/:playerId` | JWT | Remove from watchlist |
| GET | `/users/leaderboard` | - | Global leaderboard |
| GET | `/users/leaderboard/friends` | JWT | Friends leaderboard |

### Referrals
| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET | `/referrals` | JWT | Referral info + invitee status |
| GET | `/referrals/link` | JWT | Full referral URL |

### Admin (requires ADMIN role)
| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET | `/admin/health` | JWT+Admin | System health metrics |
| GET | `/admin/settings` | JWT+Admin | All admin settings |
| PUT | `/admin/settings/:key` | JWT+Admin | Update setting `{ value }` |
| POST | `/admin/liquidity/inject` | JWT+Admin | Inject bot shares `{ playerId, shares }` |
| POST | `/admin/liquidity/remove` | JWT+Admin | Remove bot shares `{ playerId, shares }` |

## Core Mechanics

- **Starting Balance**: 10,000 Credits
- **Portfolio Limit**: 15 unique players
- **Trade Fee**: 1.5% burned (deflationary)
- **Fractional Shares**: Buy/sell 0.01+ shares
- **Price Algorithm**: 70% real-world rating changes + 30% order book pressure × admin demand multiplier
- **Market Maker Bot**: Provides liquidity every 30s when no human counterparty exists
- **Referrals**: Invite friends → both get 500 Credits after invitee completes 5 trades in 7 days

## WebSocket Events

Connect to the backend WebSocket at the same port (`:4000`).

| Event | Direction | Payload | Description |
|---|---|---|---|
| `priceUpdate` | Server → Client | `{ playerId, price, timestamp }` | Broadcast on every price change |
| `subscribePlayers` | Client → Server | `string[]` (player IDs) | Join rooms for targeted updates |

## Database Models

`User`, `Player`, `PlayerStats`, `PriceHistory`, `PortfolioItem`, `Transaction`, `Order`, `ReferralBonus`, `WatchlistItem`, `AdminSetting`

See `backend/prisma/schema.prisma` for full schema.

## Scheduled Jobs

| Schedule | Job | Description |
|---|---|---|
| Daily 6:00 AM | `syncAllPlayers` | Fetch stats from API-Football, update ratings |
| Every 30s | `provideLiquidity` | Market maker bot places counter-orders |
| Every 6h | `checkAndAwardBonuses` | Check referral conditions and award credits |
