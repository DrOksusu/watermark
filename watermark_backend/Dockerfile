# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# Install dependencies for native modules (sharp)
# node-addon-api is required for building sharp from source
RUN apk add --no-cache python3 make g++ vips-dev pkgconfig

# Copy package files
COPY package*.json ./
COPY prisma ./prisma/

# Add node-addon-api for sharp build and install dependencies
RUN npm install node-addon-api && npm ci

# Generate Prisma client
RUN npx prisma generate

# Copy source code
COPY . .

# Build TypeScript
RUN npm run build

# Prune dev dependencies after build
RUN npm prune --production

# Production stage
FROM node:20-alpine AS production

WORKDIR /app

# Install runtime dependencies for sharp (vips)
RUN apk add --no-cache vips

# Copy package files
COPY package*.json ./
COPY prisma ./prisma/

# Copy node_modules from builder (already pruned to production only)
COPY --from=builder /app/node_modules ./node_modules

# Generate Prisma client for production
RUN npx prisma generate

# Copy built files from builder
COPY --from=builder /app/dist ./dist

# Create uploads directory
RUN mkdir -p uploads/images uploads/logos uploads/processed

# Set environment
ENV NODE_ENV=production
ENV PORT=4000

# Expose port
EXPOSE 4000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:4000/health || exit 1

# Start server
CMD ["node", "dist/index.js"]
