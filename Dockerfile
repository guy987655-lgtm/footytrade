FROM node:20-slim

RUN apt-get update -y && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy and install ALL deps (including devDeps needed for build)
COPY backend/package.json ./
RUN npm install

# Copy all backend source
COPY backend/ .

# Generate Prisma client and build NestJS
RUN npx prisma generate
RUN npm run build

# Remove devDependencies after build
RUN npm prune --production

# Runtime env vars (can be overridden in Railway Variables)
ENV DATABASE_URL="file:./dev.db"
ENV JWT_SECRET="footytrade-super-secret-jwt-key-2024"
ENV INITIAL_CREDITS="10000"
ENV FEE_PERCENT="1.5"
ENV NODE_ENV="production"

# Run migrations, seed, then start
CMD npx prisma migrate deploy && (npx prisma db seed || true) && node dist/main
