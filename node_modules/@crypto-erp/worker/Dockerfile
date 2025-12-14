# Stage 1: Build
FROM node:20-alpine AS builder

WORKDIR /app

# Install dependencies for native modules
RUN apk add --no-cache python3 make g++

# Copy workspace files
COPY package*.json ./
COPY turbo.json ./
COPY apps/worker/package*.json ./apps/worker/
COPY libs/database/package*.json ./libs/database/

# Install dependencies with optimizations
RUN npm ci --prefer-offline --no-audit

# Copy source code
COPY apps/worker ./apps/worker
COPY libs/database ./libs/database

# Generate Prisma client
RUN npm run db:generate

# Build worker
RUN npm run build --workspace=@crypto-erp/worker

# Remove dev dependencies and cache
RUN npm prune --production && npm cache clean --force

# Stage 2: Production
FROM node:20-alpine AS runner

# Install dumb-init for proper signal handling
RUN apk add --no-cache dumb-init

# Create non-root user
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 worker

WORKDIR /app

# Copy necessary files with proper ownership
COPY --from=builder --chown=worker:nodejs /app/package*.json ./
COPY --from=builder --chown=worker:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=worker:nodejs /app/apps/worker/dist ./apps/worker/dist
COPY --from=builder --chown=worker:nodejs /app/apps/worker/package.json ./apps/worker/
COPY --from=builder --chown=worker:nodejs /app/libs/database ./libs/database

# Switch to non-root user
USER worker

# Set environment
ENV NODE_ENV=production

# Change to worker directory
WORKDIR /app/apps/worker

# Health check (optional for workers, but useful for monitoring)
HEALTHCHECK --interval=60s --timeout=5s --start-period=30s --retries=3 \
  CMD node -e "process.exit(0);"

# Use dumb-init to handle signals properly
ENTRYPOINT ["dumb-init", "--"]

# Start the worker
CMD ["node", "dist/main.js"]
