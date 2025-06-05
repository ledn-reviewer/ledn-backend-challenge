# Multi-stage build for Coruscant Bank OTC Service

# Build stage
FROM node:22.16.0-alpine AS builder

WORKDIR /app

# Copy root package files for workspace setup
COPY package.json package-lock.json ./
COPY apps/coruscant-bank-otc-service/package.json ./apps/coruscant-bank-otc-service/

# Install all dependencies (including dev dependencies)
RUN npm ci

# Copy source code and config files
COPY tsconfig.json ./
COPY apps/coruscant-bank-otc-service/tsconfig.json ./apps/coruscant-bank-otc-service/
COPY apps/coruscant-bank-otc-service/src ./apps/coruscant-bank-otc-service/src

# Build TypeScript
RUN npm run build -w apps/coruscant-bank-otc-service

# Production stage
FROM node:22.16.0-alpine AS production

WORKDIR /app

# Create a non-root user
RUN addgroup -S appgroup && adduser -S appuser -G appgroup

# Copy package files for workspace setup
COPY package.json package-lock.json ./
COPY apps/coruscant-bank-otc-service/package.json ./apps/coruscant-bank-otc-service/

# Install production dependencies only
RUN npm ci --only=production -w apps/coruscant-bank-otc-service

# Copy built files from builder stage
COPY --from=builder /app/apps/coruscant-bank-otc-service/dist ./apps/coruscant-bank-otc-service/dist

# Environment variables
ENV NODE_ENV=production
ENV PORT=3000
ENV ENABLE_SELF_PUBLISHING=false

# Change ownership to our non-root user
RUN chown -R appuser:appgroup /app
USER appuser

# Set working directory to the service folder
WORKDIR /app/apps/coruscant-bank-otc-service

# Expose port
EXPOSE 3000

# Start the service
CMD ["npm", "start"]
