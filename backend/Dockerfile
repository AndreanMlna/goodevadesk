# ==============================================================================
# Stage 1: Build Stage
# ==============================================================================
FROM node:20-alpine AS builder

WORKDIR /app

# Install OpenSSL for Prisma on Alpine
RUN apk add --no-cache openssl libc6-compat

# Copy package files and install dependencies
COPY package*.json ./
COPY prisma ./prisma/

RUN npm ci

# Generate Prisma Client
RUN npx prisma generate

# Copy source code and build
COPY tsconfig*.json nest-cli.json ./
COPY src ./src/

RUN npm run build

# ==============================================================================
# Stage 2: Production Runner
# ==============================================================================
FROM node:20-alpine AS runner

WORKDIR /app

# Install production dependencies & runtime OpenSSL
RUN apk add --no-cache openssl libc6-compat

ENV NODE_ENV=production
ENV PORT=3000

# Create non-root user
USER node

# Copy package and node_modules from builder
COPY --chown=node:node package*.json ./
COPY --chown=node:node --from=builder /app/node_modules ./node_modules
COPY --chown=node:node --from=builder /app/dist ./dist
COPY --chown=node:node --from=builder /app/prisma ./prisma

EXPOSE 3000

# Startup script: Push DB schema, seed if needed, and run server
CMD ["sh", "-c", "npx prisma db push --skip-generate && npx prisma db seed && node dist/src/main.js"]
