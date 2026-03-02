FROM oven/bun:1 AS builder

WORKDIR /app

# Copy package files
COPY package.json bun.lock* ./
COPY prisma ./prisma/

# Install dependencies
# Ensure devDependencies (like Prisma) are installed even if Coolify sets NODE_ENV=production
RUN NODE_ENV=development bun install --frozen-lockfile

# Run prisma generate with a dummy DATABASE_URL to override any ARG injected by Coolify
RUN DATABASE_URL="postgresql://dummy:dummy@localhost:5432/dummy" bunx prisma generate


# Copy source code
COPY . .

# Production stage
FROM oven/bun:1-slim

WORKDIR /app

# Copy from builder
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/src ./src
COPY --from=builder /app/entrypoint.sh ./entrypoint.sh

# Make entrypoint executable
RUN chmod +x ./entrypoint.sh

# Set environment
ENV NODE_ENV=production
ENV PORT=3001

EXPOSE 3001

# Health check using bun instead of curl (curl not available in slim images)
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
  CMD bun -e "fetch('http://localhost:3001/health').then(r => r.ok ? process.exit(0) : process.exit(1)).catch(() => process.exit(1))"

# Use entrypoint script (runs migrations then starts server)
ENTRYPOINT ["./entrypoint.sh"]
