# SaveKaro

A community-driven deal aggregation platform that helps Indians find the best discounts on electronics, fashion, gaming, and more — from Amazon, Myntra, and beyond.

## Features

- **Deal Aggregation**: Automatically scrapes deals from Reddit
- **Smart Filtering**: Filter by category, store, discount percentage, region
- **Community Voting**: Upvote/downvote the best deals
- **Comments**: Discuss deals with nested replies
- **Save Deals**: Bookmark deals for later
- **Price History**: Track price changes over time
- **Notifications**: Email alerts for hot deals
- **User Submissions**: Submit your own deals
- **Gamification**: Leaderboards, badges, and community challenges

## Tech Stack

### Backend

- **Runtime**: Bun.js
- **Framework**: Hono
- **Database**: PostgreSQL + Prisma ORM
- **Cache / Queues**: Redis (rate limiting, caching, BullMQ)
- **Auth**: Google OAuth (Arctic) + JWT (access + refresh tokens)
- **Email**: Resend
- **Logging**: Pino + request ID correlation

### Frontend

- **Framework**: React + TypeScript
- **Build**: Vite
- **Styling**: TailwindCSS v4 + shadcn/ui
- **State**: Zustand (in-memory auth, no localStorage tokens)
- **Data Fetching**: TanStack Query
- **Routing**: React Router (with protected routes)
- **UI**: lucide-react, react-masonry-css

## Project Structure

```
SaveKaro/
├── backend/
│   ├── prisma/
│   │   └── schema.prisma
│   ├── src/
│   │   ├── lib/          # prisma, redis, jwt, cache, logger
│   │   ├── middleware/   # auth, rateLimiter, validate, requireAdmin, requestId
│   │   ├── routes/       # auth, deals, users, categories, comments, notifications, gamification, alerts
│   │   ├── schemas/      # Zod validation schemas
│   │   ├── services/     # Reddit scraper, notifications, gamification, affiliate links, alert matching, job queues, title classifier, bootstrap
│   │   └── index.ts      # Entry point
│   ├── entrypoint.sh     # Migration + startup script
│   ├── Dockerfile
│   └── package.json
├── frontend/
│   ├── public/
│   │   ├── favicon.svg
│   │   └── manifest.json
│   ├── src/
│   │   ├── components/   # UI components, ErrorBoundary, ProtectedRoute
│   │   ├── hooks/        # React Query hooks
│   │   ├── lib/          # API client (auto-refresh tokens)
│   │   ├── pages/        # Home, Explore, DealDetail, Leaderboard, Admin, Notifications, PriceAlerts, SavedDeals, Settings, SubmitDeal, Categories
│   │   ├── store/        # Zustand stores (auth, filters)
│   │   └── App.tsx
│   ├── Dockerfile
│   ├── nginx.conf
│   └── package.json
├── docker-compose.yml
└── README.md
```

## Getting Started

### Prerequisites

- [Bun](https://bun.sh/) v1.0+
- PostgreSQL 16+
- Redis 7+ (optional for development)
- Google OAuth credentials
- Reddit API credentials
- Resend API key (optional, for emails)

### Environment Setup

```bash
# Backend
cp backend/.env.example backend/.env
# Frontend
cp frontend/.env.example frontend/.env
```

Fill in your credentials. **Critical**: `JWT_SECRET` and `REFRESH_SECRET` must be set in production (the app will crash without them).

### Development

```bash
# Start Postgres + Redis
docker compose up postgres redis -d

# Backend
cd backend
bun install
bunx prisma migrate dev
bun run dev

# Frontend (in a new terminal)
cd frontend
bun install
bun run dev
```

Open http://localhost:5173

### Production (Docker Compose)

```bash
# Set all env vars (see backend/.env.example)
docker compose up --build -d
```

## License

MIT
