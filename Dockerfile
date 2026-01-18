# Multi-stage build untuk ukuran image yang lebih kecil

# Stage 1: Build dependencies
FROM node:20-alpine AS dependencies

WORKDIR /app

# Copy package files
COPY package.json package-lock.json ./

# Install dependencies (production only)
RUN npm ci --only=production && \
    npm cache clean --force

# Stage 2: Build stage (untuk generate Prisma Client)
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY package.json package-lock.json ./

# Install all dependencies (including devDependencies for Prisma)
RUN npm ci

# Copy prisma schema and config
COPY prisma ./prisma
COPY prisma.config.ts ./

# Generate Prisma Client
RUN npx prisma generate

# Stage 3: Production image
FROM node:20-alpine AS production

# Install dumb-init untuk proper signal handling
RUN apk add --no-cache dumb-init

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

WORKDIR /app

# Copy production dependencies from dependencies stage
COPY --from=dependencies --chown=nodejs:nodejs /app/node_modules ./node_modules

# Copy generated Prisma Client from builder stage
COPY --from=builder --chown=nodejs:nodejs /app/generated ./generated

# Copy application source code
COPY --chown=nodejs:nodejs src ./src
COPY --chown=nodejs:nodejs package.json ./

# Copy prisma files (needed for migrations)
COPY --chown=nodejs:nodejs prisma ./prisma
COPY --chown=nodejs:nodejs prisma.config.ts ./

# Switch to non-root user
USER nodejs

# Expose port
EXPOSE 8080

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
    CMD node -e "require('http').get('http://localhost:8080/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Use dumb-init to handle signals properly
ENTRYPOINT ["dumb-init", "--"]

# Start application
CMD ["node", "src/main.js"]