-- CreateTable
CREATE TABLE "billing_customers" (
    "id" TEXT NOT NULL,
    "workspace_id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "legal_name" TEXT,
    "mercado_pago_customer_id" TEXT,
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "billing_customers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "workspace_subscriptions" (
    "id" TEXT NOT NULL,
    "workspace_id" TEXT NOT NULL,
    "billing_customer_id" TEXT,
    "provider" TEXT NOT NULL DEFAULT 'mercado_pago',
    "plan_key" TEXT,
    "billing_cycle" TEXT,
    "status" TEXT NOT NULL DEFAULT 'incomplete',
    "mercado_pago_preapproval_id" TEXT,
    "mercado_pago_plan_id" TEXT,
    "checkout_url" TEXT,
    "external_reference" TEXT,
    "current_period_start" TIMESTAMP(3),
    "current_period_end" TIMESTAMP(3),
    "started_at" TIMESTAMP(3),
    "canceled_at" TIMESTAMP(3),
    "cancel_at_period_end" BOOLEAN NOT NULL DEFAULT false,
    "last_provider_sync_at" TIMESTAMP(3),
    "provider_metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "workspace_subscriptions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "billing_events" (
    "id" TEXT NOT NULL,
    "workspace_id" TEXT,
    "subscription_id" TEXT,
    "source" TEXT NOT NULL DEFAULT 'mercado_pago',
    "event_key" TEXT NOT NULL,
    "event_type" TEXT NOT NULL,
    "provider_reference" TEXT,
    "status" TEXT NOT NULL DEFAULT 'received',
    "payload" JSONB NOT NULL,
    "processed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "billing_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "usage_counters" (
    "id" TEXT NOT NULL,
    "workspace_id" TEXT NOT NULL,
    "metric" TEXT NOT NULL,
    "period_start" TIMESTAMP(3) NOT NULL,
    "period_end" TIMESTAMP(3) NOT NULL,
    "count" INTEGER NOT NULL DEFAULT 0,
    "warning_triggered_at" TIMESTAMP(3),
    "limit_reached_at" TIMESTAMP(3),
    "last_increment_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "usage_counters_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "trial_states" (
    "id" TEXT NOT NULL,
    "workspace_id" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'active',
    "starts_at" TIMESTAMP(3) NOT NULL,
    "ends_at" TIMESTAMP(3) NOT NULL,
    "converted_at" TIMESTAMP(3),
    "expired_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "trial_states_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "billing_customers_workspace_id_key" ON "billing_customers"("workspace_id");

-- CreateIndex
CREATE UNIQUE INDEX "billing_customers_mercado_pago_customer_id_key" ON "billing_customers"("mercado_pago_customer_id");

-- CreateIndex
CREATE UNIQUE INDEX "workspace_subscriptions_workspace_id_key" ON "workspace_subscriptions"("workspace_id");

-- CreateIndex
CREATE UNIQUE INDEX "workspace_subscriptions_billing_customer_id_key" ON "workspace_subscriptions"("billing_customer_id");

-- CreateIndex
CREATE UNIQUE INDEX "workspace_subscriptions_mercado_pago_preapproval_id_key" ON "workspace_subscriptions"("mercado_pago_preapproval_id");

-- CreateIndex
CREATE INDEX "workspace_subscriptions_status_idx" ON "workspace_subscriptions"("status");

-- CreateIndex
CREATE INDEX "workspace_subscriptions_plan_key_idx" ON "workspace_subscriptions"("plan_key");

-- CreateIndex
CREATE UNIQUE INDEX "billing_events_event_key_key" ON "billing_events"("event_key");

-- CreateIndex
CREATE INDEX "billing_events_workspace_id_idx" ON "billing_events"("workspace_id");

-- CreateIndex
CREATE INDEX "billing_events_subscription_id_idx" ON "billing_events"("subscription_id");

-- CreateIndex
CREATE INDEX "billing_events_source_event_type_idx" ON "billing_events"("source", "event_type");

-- CreateIndex
CREATE INDEX "usage_counters_workspace_id_metric_idx" ON "usage_counters"("workspace_id", "metric");

-- CreateIndex
CREATE UNIQUE INDEX "usage_counters_workspace_id_metric_period_start_key" ON "usage_counters"("workspace_id", "metric", "period_start");

-- CreateIndex
CREATE UNIQUE INDEX "trial_states_workspace_id_key" ON "trial_states"("workspace_id");

-- CreateIndex
CREATE INDEX "trial_states_status_idx" ON "trial_states"("status");

-- AddForeignKey
ALTER TABLE "billing_customers" ADD CONSTRAINT "billing_customers_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workspace_subscriptions" ADD CONSTRAINT "workspace_subscriptions_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workspace_subscriptions" ADD CONSTRAINT "workspace_subscriptions_billing_customer_id_fkey" FOREIGN KEY ("billing_customer_id") REFERENCES "billing_customers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "billing_events" ADD CONSTRAINT "billing_events_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "billing_events" ADD CONSTRAINT "billing_events_subscription_id_fkey" FOREIGN KEY ("subscription_id") REFERENCES "workspace_subscriptions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "usage_counters" ADD CONSTRAINT "usage_counters_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trial_states" ADD CONSTRAINT "trial_states_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;
