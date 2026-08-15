FROM oven/bun:1 AS builder

WORKDIR /app

# Accept build args for Vite environment variables
ARG VITE_API_URL
ARG VITE_GOOGLE_CLIENT_ID
ARG VITE_POSTHOG_ENABLED
ARG VITE_POSTHOG_PROJECT_TOKEN
ARG VITE_POSTHOG_HOST
ARG VITE_POSTHOG_UI_HOST
ARG VITE_POSTHOG_REQUIRE_CONSENT
ARG VITE_POSTHOG_SESSION_REPLAY_ENABLED
ARG VITE_APP_ENV
ARG VITE_APP_VERSION
ARG VITE_UMAMI_ENABLED
ARG VITE_UMAMI_SCRIPT_URL
ARG VITE_UMAMI_WEBSITE_ID

# Export as env vars so Vite can embed them during build
ENV VITE_API_URL=$VITE_API_URL
ENV VITE_GOOGLE_CLIENT_ID=$VITE_GOOGLE_CLIENT_ID
ENV VITE_POSTHOG_ENABLED=$VITE_POSTHOG_ENABLED
ENV VITE_POSTHOG_PROJECT_TOKEN=$VITE_POSTHOG_PROJECT_TOKEN
ENV VITE_POSTHOG_HOST=$VITE_POSTHOG_HOST
ENV VITE_POSTHOG_UI_HOST=$VITE_POSTHOG_UI_HOST
ENV VITE_POSTHOG_REQUIRE_CONSENT=$VITE_POSTHOG_REQUIRE_CONSENT
ENV VITE_POSTHOG_SESSION_REPLAY_ENABLED=$VITE_POSTHOG_SESSION_REPLAY_ENABLED
ENV VITE_APP_ENV=$VITE_APP_ENV
ENV VITE_APP_VERSION=$VITE_APP_VERSION
ENV VITE_UMAMI_ENABLED=$VITE_UMAMI_ENABLED
ENV VITE_UMAMI_SCRIPT_URL=$VITE_UMAMI_SCRIPT_URL
ENV VITE_UMAMI_WEBSITE_ID=$VITE_UMAMI_WEBSITE_ID

# Build stage should always have devDependencies (vite/typescript) available
ENV NODE_ENV=development

# Copy package files
COPY package.json bun.lock* ./

# Install dependencies (including devDependencies for build tooling)
# Force NODE_ENV=development to ensure build tools (vite, typescript) are installed
# even if the deployment platform injects NODE_ENV=production as a build arg
RUN NODE_ENV=development bun install --frozen-lockfile

# Copy source code
COPY . .

# Build static assets (Vite build command already uses production mode)
RUN bun run build

# Production stage - use nginx to serve static files
FROM nginx:alpine

# Copy built files to nginx
COPY --from=builder /app/dist /usr/share/nginx/html

# Copy nginx config
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
