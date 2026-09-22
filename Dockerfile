# =============================================================================
# Stage 1 : Build React application
# =============================================================================
FROM node:22-alpine AS builder

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN npm run build

# =============================================================================
# Stage 2 : Serve with Nginx
# =============================================================================
FROM nginx:1.27-alpine

# Install OpenSSL for self-signed certificate generation
RUN apk add --no-cache openssl

# Copy Nginx configurations (prod + dev)
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY nginx.dev.conf /etc/nginx/conf.d/dev.conf

# Copy entrypoint script
COPY docker-entrypoint.sh /docker-entrypoint.sh
RUN chmod +x /docker-entrypoint.sh

# Copy built frontend from builder stage
COPY --from=builder /app/dist /usr/share/nginx/html

EXPOSE 80 443

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- http://localhost/health || wget --no-check-certificate -qO- https://localhost/health || exit 1

ENTRYPOINT ["/docker-entrypoint.sh"]
