FROM node:20-alpine

WORKDIR /app

# Install dependencies (build context is repo root)
COPY backend/package.json ./
RUN npm install

# Copy all backend source
COPY backend/ .

# Generate Prisma client
RUN npx prisma generate

# Build NestJS
RUN npm run build

# Run migrations, seed, start
CMD npx prisma migrate deploy && npx prisma db seed && node dist/main
