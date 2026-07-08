# ─── Stage 1: dependencies ────────────────────────────────────────────────────
FROM node:18-alpine AS deps

WORKDIR /app

COPY package*.json ./
COPY prisma ./prisma/

RUN npm ci --omit=dev && npx prisma generate

# ─── Stage 2: production image ────────────────────────────────────────────────
FROM node:18-alpine AS production

# Run as non-root user for security
RUN addgroup -S appgroup && adduser -S appuser -G appgroup

WORKDIR /app

# Copy only production artefacts from the deps stage
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/prisma ./prisma

# Copy application source — no devDependencies, no tests
COPY src ./src
COPY package.json ./

# Create a startup script that runs migrations then starts the app
RUN printf '#!/bin/sh\nset -e\necho "Running database migrations..."\nnpx prisma migrate deploy\necho "Starting server..."\nexec node src/server.js\n' > /app/entrypoint.sh \
  && chmod +x /app/entrypoint.sh

USER appuser

EXPOSE 3000

ENTRYPOINT ["/app/entrypoint.sh"]
