-- CreateTable
CREATE TABLE "customer_requests" (
    "id" UUID NOT NULL,
    "customer_name" VARCHAR(150) NOT NULL,
    "customer_email" VARCHAR(254),
    "customer_phone" VARCHAR(30),
    "subject" VARCHAR(200) NOT NULL,
    "description" TEXT NOT NULL,
    "is_priority" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "customer_requests_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "idx_requests_list" ON "customer_requests"("is_priority" DESC, "created_at" DESC, "id" DESC);

-- Contraintes métier (ajoutées à la main : Prisma ne génère pas les CHECK).
-- La base est la dernière barrière ; la validation applicative ne la remplace pas.
ALTER TABLE "customer_requests"
  ADD CONSTRAINT "chk_customer_name_len" CHECK (char_length(btrim("customer_name")) BETWEEN 2 AND 150),
  ADD CONSTRAINT "chk_subject_len"       CHECK (char_length(btrim("subject")) BETWEEN 3 AND 200),
  ADD CONSTRAINT "chk_description_len"   CHECK (char_length(btrim("description")) BETWEEN 10 AND 5000),
  ADD CONSTRAINT "chk_email_len"         CHECK ("customer_email" IS NULL OR char_length(btrim("customer_email")) BETWEEN 1 AND 254),
  ADD CONSTRAINT "chk_phone_len"         CHECK ("customer_phone" IS NULL OR char_length(btrim("customer_phone")) BETWEEN 1 AND 30);
