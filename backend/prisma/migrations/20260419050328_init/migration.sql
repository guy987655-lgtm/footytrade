-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "googleId" TEXT,
    "role" TEXT NOT NULL DEFAULT 'USER',
    "credits" REAL NOT NULL DEFAULT 10000,
    "referralCode" TEXT NOT NULL,
    "referredById" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "User_referredById_fkey" FOREIGN KEY ("referredById") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Player" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "externalId" INTEGER,
    "name" TEXT NOT NULL,
    "position" TEXT NOT NULL,
    "team" TEXT NOT NULL,
    "league" TEXT NOT NULL DEFAULT '',
    "photoUrl" TEXT NOT NULL DEFAULT '',
    "footyRating" REAL NOT NULL DEFAULT 50,
    "currentPrice" REAL NOT NULL DEFAULT 100,
    "totalShares" REAL NOT NULL DEFAULT 1000,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "PlayerStats" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "playerId" TEXT NOT NULL,
    "date" DATETIME NOT NULL,
    "goals" INTEGER NOT NULL DEFAULT 0,
    "assists" INTEGER NOT NULL DEFAULT 0,
    "minutes" INTEGER NOT NULL DEFAULT 0,
    "keyPasses" INTEGER NOT NULL DEFAULT 0,
    "xG" REAL NOT NULL DEFAULT 0,
    "rating" REAL NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PlayerStats_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "PriceHistory" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "playerId" TEXT NOT NULL,
    "price" REAL NOT NULL,
    "timestamp" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PriceHistory_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "PortfolioItem" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "playerId" TEXT NOT NULL,
    "shares" REAL NOT NULL,
    "avgBuyPrice" REAL NOT NULL,
    CONSTRAINT "PortfolioItem_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "PortfolioItem_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Transaction" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "playerId" TEXT NOT NULL,
    "side" TEXT NOT NULL,
    "shares" REAL NOT NULL,
    "pricePerShare" REAL NOT NULL,
    "fee" REAL NOT NULL,
    "total" REAL NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Transaction_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Transaction_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Order" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "playerId" TEXT NOT NULL,
    "side" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "shares" REAL NOT NULL,
    "limitPrice" REAL,
    "filledQty" REAL NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Order_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Order_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ReferralBonus" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "referrerId" TEXT NOT NULL,
    "refereeId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "awardedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ReferralBonus_referrerId_fkey" FOREIGN KEY ("referrerId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "ReferralBonus_refereeId_fkey" FOREIGN KEY ("refereeId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "WatchlistItem" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "playerId" TEXT NOT NULL,
    CONSTRAINT "WatchlistItem_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "WatchlistItem_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "AdminSetting" (
    "key" TEXT NOT NULL PRIMARY KEY,
    "value" TEXT NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "User_googleId_key" ON "User"("googleId");

-- CreateIndex
CREATE UNIQUE INDEX "User_referralCode_key" ON "User"("referralCode");

-- CreateIndex
CREATE UNIQUE INDEX "Player_externalId_key" ON "Player"("externalId");

-- CreateIndex
CREATE UNIQUE INDEX "PlayerStats_playerId_date_key" ON "PlayerStats"("playerId", "date");

-- CreateIndex
CREATE INDEX "PriceHistory_playerId_timestamp_idx" ON "PriceHistory"("playerId", "timestamp");

-- CreateIndex
CREATE UNIQUE INDEX "PortfolioItem_userId_playerId_key" ON "PortfolioItem"("userId", "playerId");

-- CreateIndex
CREATE INDEX "Transaction_userId_createdAt_idx" ON "Transaction"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "Order_playerId_side_status_idx" ON "Order"("playerId", "side", "status");

-- CreateIndex
CREATE UNIQUE INDEX "ReferralBonus_referrerId_refereeId_key" ON "ReferralBonus"("referrerId", "refereeId");

-- CreateIndex
CREATE UNIQUE INDEX "WatchlistItem_userId_playerId_key" ON "WatchlistItem"("userId", "playerId");
