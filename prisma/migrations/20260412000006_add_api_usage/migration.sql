-- CreateTable: api_usage - tracks OpenAI token usage and cost per request
CREATE TABLE "api_usage" (
    "id"               SERIAL          NOT NULL,
    "userId"           TEXT            NOT NULL,
    "model"            TEXT            NOT NULL DEFAULT 'gpt-4o-mini',
    "promptTokens"     INTEGER         NOT NULL DEFAULT 0,
    "completionTokens" INTEGER         NOT NULL DEFAULT 0,
    "costUsd"          DECIMAL(10,6)   NOT NULL DEFAULT 0,
    "createdAt"        TIMESTAMP(3)    NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "api_usage_pkey" PRIMARY KEY ("id")
);

-- Indexes for fast monthly aggregation queries
CREATE INDEX "api_usage_userId_idx"    ON "api_usage"("userId");
CREATE INDEX "api_usage_createdAt_idx" ON "api_usage"("createdAt");
