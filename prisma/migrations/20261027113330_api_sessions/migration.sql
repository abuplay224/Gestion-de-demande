-- CreateTable
CREATE TABLE "api_sessions" (
    "id" UUID NOT NULL,
    "user_id" TEXT NOT NULL,
    "access_token_hash" TEXT NOT NULL,
    "access_expires_at" TIMESTAMPTZ(3) NOT NULL,
    "refresh_token_hash" TEXT NOT NULL,
    "previous_refresh_hash" TEXT,
    "refresh_expires_at" TIMESTAMPTZ(3) NOT NULL,
    "device_name" VARCHAR(100),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_used_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revoked_at" TIMESTAMPTZ(3),

    CONSTRAINT "api_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "api_sessions_access_token_hash_key" ON "api_sessions"("access_token_hash");

-- CreateIndex
CREATE UNIQUE INDEX "api_sessions_refresh_token_hash_key" ON "api_sessions"("refresh_token_hash");

-- CreateIndex
CREATE UNIQUE INDEX "api_sessions_previous_refresh_hash_key" ON "api_sessions"("previous_refresh_hash");

-- CreateIndex
CREATE INDEX "api_sessions_user_id_idx" ON "api_sessions"("user_id");

-- AddForeignKey
ALTER TABLE "api_sessions" ADD CONSTRAINT "api_sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
