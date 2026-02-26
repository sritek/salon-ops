-- CreateTable
CREATE TABLE "checkout_sessions" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "branch_id" TEXT NOT NULL,
    "session_data" JSONB NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "checkout_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "checkout_sessions_tenant_id_idx" ON "checkout_sessions"("tenant_id");

-- CreateIndex
CREATE INDEX "checkout_sessions_expires_at_idx" ON "checkout_sessions"("expires_at");
