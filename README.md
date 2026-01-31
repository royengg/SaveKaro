# DealHunt

A web application that aggregates high-discounted product deals from Reddit, targeting Indian users. Features a Pinterest-style masonry UI, Google OAuth authentication, community voting, and price tracking.

## Features

- 🔥 **Deal Aggregation**: Automatically scrapes deals from r/dealsforindia
- 🎯 **Smart Filtering**: Filter by category, store, discount percentage
- 📱 **Responsive Design**: Pinterest-style masonry grid with modern UI
- 🔐 **Google OAuth**: Simple and secure authentication
- ⬆️ **Community Voting**: Upvote/downvote the best deals
- 💬 **Comments**: Discuss deals with nested replies
- 💾 **Save Deals**: Bookmark deals for later
- 📈 **Price History**: Track price changes over time
- 🔔 **Notifications**: Get notified about hot deals
- 📝 **User Submissions**: Submit your own deals

## Tech Stack

### Backend
- **Runtime**: Bun.js
- **Framework**: Hono
- **Database**: PostgreSQL + Prisma ORM
- **Auth**: Google OAuth (Arctic library) + JWT
- **Email**: Resend
- **Logging**: Pino

### Frontend
- **Framework**: React + TypeScript
- **Build**: Vite
- **Styling**: TailwindCSS v4 + shadcn/ui
- **State**: Zustand
- **Data Fetching**: TanStack Query
- **Routing**: React Router
- **UI**: lucide-react, react-masonry-css

## Project Structure

```
DealHunt/
├── backend/
│   ├── prisma/
│   │   ├── schema.prisma
│   │   └── seed.ts
│   ├── src/
│   │   ├── lib/          # Utilities (prisma, logger, jwt)
│   │   ├── middleware/   # Auth, rate limiting, validation
│   │   ├── routes/       # API routes
│   │   ├── schemas/      # Zod validation schemas
│   │   ├── services/     # Reddit scraper, notifications
│   │   └── index.ts      # Main entry point
│   ├── Dockerfile
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── components/   # UI components
│   │   ├── hooks/        # React Query hooks
│   │   ├── lib/          # API client, utils
│   │   ├── pages/        # Page components
│   │   ├── store/        # Zustand stores
│   │   └── App.tsx
│   ├── Dockerfile
│   └── package.json
├── docker-compose.yml
└── README.md
```

## Getting Started

### Prerequisites

- [Bun](https://bun.sh/) v1.0+
- PostgreSQL 15+
- Google OAuth credentials
- Reddit API credentials
- Resend API key (optional)

### Environment Setup

1. Copy the example environment files:
   ```bash
   cp backend/.env.example backend/.env
   cp frontend/.env.example frontend/.env
   ```

2. Fill in your credentials in `.env` files.

### Development

1. Start the database:
   ```bash
   docker compose up postgres -d
   ```

2. Setup the backend:
   ```bash
   cd backend
   bun install
   bunx prisma migrate dev
   bunx prisma db seed
   bun run dev
   ```

3. Start the frontend:
   ```bash
   cd frontend
   bun install
   bun run dev
   ```

4. Open http://localhost:5173

### Production Deployment (Coolify)

1. Push to your Git repository
2. In Coolify, create a new Docker Compose project
3. Point to your repository
4. Set environment variables
5. Deploy!

## API Endpoints

### Authentication
- `GET /api/auth/google` - Initiate Google OAuth
- `GET /api/auth/google/callback` - OAuth callback
- `GET /api/auth/me` - Get current user

### Deals
- `GET /api/deals` - List deals (with filtering/pagination)
- `GET /api/deals/:id` - Get deal details
- `POST /api/deals` - Submit new deal (authenticated)
- `POST /api/deals/:id/vote` - Vote on deal
- `POST /api/deals/:id/save` - Save/unsave deal

### Categories
- `GET /api/categories` - List all categories
- `GET /api/categories/:slug` - Get category details

### Users
- `GET /api/users/me/saved` - Get saved deals
- `GET /api/users/me/submitted` - Get submitted deals
- `PUT /api/users/me/preferences` - Update preferences

### Comments
- `GET /api/comments/deal/:dealId` - Get deal comments
- `POST /api/comments/deal/:dealId` - Add comment

### Notifications
- `GET /api/notifications` - Get notifications
- `PUT /api/notifications/:id/read` - Mark as read

## License

MIT
