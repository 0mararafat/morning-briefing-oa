-- CreateEnum
CREATE TYPE "GenerationMode" AS ENUM ('API_KEY', 'CLAUDE_ROUTINE');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "name" TEXT,
    "email" TEXT,
    "emailVerified" TIMESTAMP(3),
    "image" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Account" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "providerAccountId" TEXT NOT NULL,
    "refresh_token" TEXT,
    "access_token" TEXT,
    "expires_at" INTEGER,
    "token_type" TEXT,
    "scope" TEXT,
    "id_token" TEXT,
    "session_state" TEXT,

    CONSTRAINT "Account_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL,
    "sessionToken" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VerificationToken" (
    "identifier" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL
);

-- CreateTable
CREATE TABLE "UserConfig" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "topics" JSONB NOT NULL DEFAULT '[]',
    "sources" JSONB NOT NULL DEFAULT '{}',
    "sections" JSONB NOT NULL DEFAULT '{}',
    "voices" JSONB NOT NULL DEFAULT '[]',
    "signalScanFrequency" TEXT NOT NULL DEFAULT 'weekly',
    "cron" TEXT NOT NULL DEFAULT '30 5 * * 1-5',
    "timezone" TEXT NOT NULL DEFAULT 'Europe/London',
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "mode" "GenerationMode" NOT NULL DEFAULT 'API_KEY',
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserConfig_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Briefing" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "date" TEXT NOT NULL,
    "data" JSONB NOT NULL,
    "html" TEXT NOT NULL,
    "source" "GenerationMode" NOT NULL,
    "shareToken" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Briefing_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserState" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "wildcardHistory" JSONB NOT NULL DEFAULT '[]',
    "signalCache" JSONB,

    CONSTRAINT "UserState_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserSecret" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "anthropicKeyCt" TEXT,
    "anthropicKeyIv" TEXT,
    "anthropicKeyTag" TEXT,
    "keyVersion" INTEGER NOT NULL DEFAULT 1,
    "keyLast4" TEXT,

    CONSTRAINT "UserSecret_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IngestToken" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastUsed" TIMESTAMP(3),

    CONSTRAINT "IngestToken_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Account_provider_providerAccountId_key" ON "Account"("provider", "providerAccountId");

-- CreateIndex
CREATE UNIQUE INDEX "Session_sessionToken_key" ON "Session"("sessionToken");

-- CreateIndex
CREATE UNIQUE INDEX "VerificationToken_identifier_token_key" ON "VerificationToken"("identifier", "token");

-- CreateIndex
CREATE UNIQUE INDEX "UserConfig_userId_key" ON "UserConfig"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Briefing_shareToken_key" ON "Briefing"("shareToken");

-- CreateIndex
CREATE INDEX "Briefing_userId_createdAt_idx" ON "Briefing"("userId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Briefing_userId_date_key" ON "Briefing"("userId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "UserState_userId_key" ON "UserState"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "UserSecret_userId_key" ON "UserSecret"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "IngestToken_userId_key" ON "IngestToken"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "IngestToken_tokenHash_key" ON "IngestToken"("tokenHash");

-- AddForeignKey
ALTER TABLE "Account" ADD CONSTRAINT "Account_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserConfig" ADD CONSTRAINT "UserConfig_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Briefing" ADD CONSTRAINT "Briefing_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserState" ADD CONSTRAINT "UserState_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserSecret" ADD CONSTRAINT "UserSecret_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IngestToken" ADD CONSTRAINT "IngestToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
