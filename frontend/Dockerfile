FROM oven/bun:1 AS builder

WORKDIR /app

# Accept build args for Vite environment variables
ARG VITE_API_URL
ARG VITE_GOOGLE_CLIENT_ID

# Export as env vars so Vite can embed them during build
ENV VITE_API_URL=$VITE_API_URL
ENV VITE_GOOGLE_CLIENT_ID=$VITE_GOOGLE_CLIENT_ID

# Copy package files
COPY package.json bun.lock* ./

# Install dependencies
# We ensure NODE_ENV is development here so that vite and other devDependencies are installed
RUN NODE_ENV=development bun install --frozen-lockfile

# Copy source code
COPY . .

# Build for production
RUN NODE_ENV=production bun run build

# Production stage - use nginx to serve static files
FROM nginx:alpine

# Enable Brotli module and CLI for static precompression
RUN apk add --no-cache nginx-mod-http-brotli brotli

# Copy built files to nginx
COPY --from=builder /app/dist /usr/share/nginx/html

# Precompress text assets for faster transfer on slow networks
RUN find /usr/share/nginx/html -type f \( -name "*.js" -o -name "*.mjs" -o -name "*.css" -o -name "*.html" -o -name "*.json" -o -name "*.svg" -o -name "*.xml" -o -name "*.txt" \) -exec gzip -f -k -9 {} \; \
    && find /usr/share/nginx/html -type f \( -name "*.js" -o -name "*.mjs" -o -name "*.css" -o -name "*.html" -o -name "*.json" -o -name "*.svg" -o -name "*.xml" -o -name "*.txt" \) -exec brotli --force --keep --quality=11 {} \;

# Copy nginx config
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
