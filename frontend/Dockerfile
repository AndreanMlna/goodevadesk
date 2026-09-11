# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# Install dependencies first for Docker layer caching
COPY package*.json ./
RUN npm ci

# Copy source and build
COPY . .
RUN npm run build

# Production runtime stage
FROM nginx:1.25-alpine

# Copy custom nginx configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy built artifacts from builder stage
COPY --from=builder /app/dist /usr/share/nginx/html

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD wget --quiet --tries=1 --spider http://localhost/ || exit 1

CMD ["nginx", "-g", "daemon off;"]
