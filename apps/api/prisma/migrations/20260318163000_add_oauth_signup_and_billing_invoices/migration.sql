CREATE TABLE "oauth_signup_tokens" (
  "id" TEXT NOT NULL,
  "provider" TEXT NOT NULL,
  "provider_account_id" TEXT NOT NULL,
  "email" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "token_hash" TEXT NOT NULL,
  "expires_at" TIMESTAMP(3) NOT NULL,
  "used_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "oauth_signup_tokens_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "oauth_signup_tokens_token_hash_key" ON "oauth_signup_tokens"("token_hash");
CREATE INDEX "oauth_signup_tokens_email_used_at_idx" ON "oauth_signup_tokens"("email", "used_at");

CREATE TABLE "billing_invoices" (
  "id" TEXT NOT NULL,
  "workspace_id" TEXT NOT NULL,
  "subscription_id" TEXT,
  "status" TEXT NOT NULL DEFAULT 'open',
  "currency" TEXT NOT NULL DEFAULT 'BRL',
  "subtotal_brl_cents" INTEGER NOT NULL DEFAULT 0,
  "tax_rate_bps" INTEGER NOT NULL DEFAULT 0,
  "tax_amount_brl_cents" INTEGER NOT NULL DEFAULT 0,
  "total_brl_cents" INTEGER NOT NULL DEFAULT 0,
  "mercado_pago_preference_id" TEXT,
  "payment_url" TEXT,
  "period_start" TIMESTAMP(3),
  "period_end" TIMESTAMP(3),
  "due_at" TIMESTAMP(3),
  "issued_at" TIMESTAMP(3),
  "paid_at" TIMESTAMP(3),
  "metadata" JSONB,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "billing_invoices_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "billing_invoices_mercado_pago_preference_id_key" ON "billing_invoices"("mercado_pago_preference_id");
CREATE INDEX "billing_invoices_workspace_id_status_idx" ON "billing_invoices"("workspace_id", "status");
CREATE INDEX "billing_invoices_subscription_id_idx" ON "billing_invoices"("subscription_id");

CREATE TABLE "billing_invoice_line_items" (
  "id" TEXT NOT NULL,
  "invoice_id" TEXT NOT NULL,
  "type" TEXT NOT NULL,
  "metric" TEXT,
  "label" TEXT NOT NULL,
  "quantity" INTEGER NOT NULL DEFAULT 1,
  "unit_amount_brl_cents" INTEGER NOT NULL,
  "subtotal_brl_cents" INTEGER NOT NULL,
  "metadata" JSONB,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "billing_invoice_line_items_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "billing_invoice_line_items_invoice_id_idx" ON "billing_invoice_line_items"("invoice_id");
CREATE UNIQUE INDEX "billing_invoice_line_items_invoice_id_type_metric_key"
ON "billing_invoice_line_items"("invoice_id", "type", "metric");

ALTER TABLE "billing_invoices"
ADD CONSTRAINT "billing_invoices_workspace_id_fkey"
FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "billing_invoices"
ADD CONSTRAINT "billing_invoices_subscription_id_fkey"
FOREIGN KEY ("subscription_id") REFERENCES "workspace_subscriptions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "billing_invoice_line_items"
ADD CONSTRAINT "billing_invoice_line_items_invoice_id_fkey"
FOREIGN KEY ("invoice_id") REFERENCES "billing_invoices"("id") ON DELETE CASCADE ON UPDATE CASCADE;
