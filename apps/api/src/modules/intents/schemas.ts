// ──────────────────────────────────────────
// VowGrid — Intent Schemas (Zod)
// ──────────────────────────────────────────

import { z } from 'zod';
import { INTENT_STATES } from './state-machine.js';

export const createIntentSchema = z.object({
  title: z.string().min(1).max(255),
  description: z.string().max(2000).optional(),
  action: z.string().min(1).max(100),
  connectorId: z.string().cuid().optional(),
  agentId: z.string().cuid(),
  parameters: z.record(z.unknown()).optional(),
  environment: z.enum(['production', 'staging', 'sandbox']).default('production'),
  idempotencyKey: z.string().max(255).optional(),
});

export type CreateIntentInput = z.infer<typeof createIntentSchema>;

export const listIntentsSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  status: z.enum(INTENT_STATES).optional(),
  agentId: z.string().cuid().optional(),
  connectorId: z.string().cuid().optional(),
});

export type ListIntentsInput = z.infer<typeof listIntentsSchema>;
