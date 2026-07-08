-- CreateTable
CREATE TABLE "log_entries" (
    "id" TEXT NOT NULL,
    "actor" VARCHAR(255) NOT NULL,
    "action" VARCHAR(500) NOT NULL,
    "payload" JSONB,
    "previousHash" TEXT,
    "currentHash" VARCHAR(128) NOT NULL,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "log_entries_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "log_entries_currentHash_key" ON "log_entries"("currentHash");

-- CreateIndex
CREATE INDEX "log_entries_createdAt_idx" ON "log_entries"("createdAt");
