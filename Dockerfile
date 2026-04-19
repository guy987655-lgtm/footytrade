FROM node:20-slim

RUN apt-get update -y && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy and install ALL deps (including devDeps needed for nest build)
COPY backend/package.json ./
RUN npm install

# Copy all backend source
COPY backend/ .

# Generate Prisma client
RUN npx prisma generate

# Build NestJS — verify output exists
RUN npm run build && ls -la dist/ && echo "✓ dist/main.js found" && ls dist/main.js

# Runtime env vars (override in Railway Variables)
ENV DATABASE_URL="file:./dev.db"
ENV JWT_SECRET="footytrade-super-secret-jwt-key-2024"
ENV INITIAL_CREDITS="10000"
ENV FEE_PERCENT="1.5"
ENV NODE_ENV="production"

# Copy startup script
COPY start.sh /start.sh
RUN chmod +x /start.sh

CMD ["/start.sh"]
