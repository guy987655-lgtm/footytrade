FROM node:20-slim

RUN apt-get update -y && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Default env vars (can be overridden in Railway Variables)
ENV DATABASE_URL="file:./dev.db"
ENV JWT_SECRET="footytrade-super-secret-jwt-key-2024"
ENV INITIAL_CREDITS="10000"
ENV FEE_PERCENT="1.5"
ENV NODE_ENV="production"

# Install dependencies
COPY backend/package.json ./
RUN npm install

# Copy all backend source
COPY backend/ .

# Generate Prisma client
RUN npx prisma generate

# Build NestJS
RUN npm run build

# Run migrations, seed (ignore if already seeded), then start
CMD npx prisma migrate deploy && (npx prisma db seed || true) && node dist/main
