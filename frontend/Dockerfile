# Frontend Dockerfile - Multi-stage build with Bun
FROM oven/bun:1 AS builder

WORKDIR /app

# Accept build arguments for Vite env vars
ARG VITE_API_URL
ARG VITE_SUPABASE_URL
ARG VITE_SUPABASE_ANON_KEY
ARG VITE_DISCORD_FEEDBACK_WEBHOOK

# Set as environment variables for Vite build
ENV VITE_API_URL=$VITE_API_URL
ENV VITE_SUPABASE_URL=$VITE_SUPABASE_URL
ENV VITE_SUPABASE_ANON_KEY=$VITE_SUPABASE_ANON_KEY
ENV VITE_DISCORD_FEEDBACK_WEBHOOK=$VITE_DISCORD_FEEDBACK_WEBHOOK

# Copy package files (lockfile required for deterministic builds)
COPY package.json bun.lock ./

# Install dependencies (fail if lockfile missing or outdated)
RUN bun install --frozen-lockfile

# Copy source code
COPY . .

# Build for production
RUN bun run build

# Production image - nginx
FROM nginx:alpine

# Copy built files from builder
COPY --from=builder /app/dist /usr/share/nginx/html

# Copy nginx config
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Expose port
EXPOSE 80

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD wget --quiet --tries=1 --spider http://localhost/ || exit 1

# Start nginx
CMD ["nginx", "-g", "daemon off;"]
