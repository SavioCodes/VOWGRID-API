import {
  approvalStageSchema,
  type ApprovalDecisionResponse,
  type ApprovalFlowMode,
  type ApprovalRequestResponse,
  type ApprovalReviewerRole,
  type ApprovalStageResponse,
  type ApprovalStageStatus,
  type SubmitForApprovalInput,
} from '@vowgrid/contracts';

export type ApprovalStageDefinition = {
  label: string;
  requiredCount: number;
  reviewerRoles: ApprovalReviewerRole[];
};

type ApprovalDecisionRecord = {
  id: string;
  approvalRequestId: string;
  userId: string;
  decision: string;
  rationale: string | null;
  stageIndex?: number | null;
  stageLabel?: string | null;
  createdAt: Date;
};

type ApprovalRequestRecord = {
  id: string;
  intentId: string;
  status: string;
  requiredCount: number;
  currentCount: number;
  currentStageIndex?: number | null;
  mode?: string | null;
  stageDefinitions?: unknown;
  expiresAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

const FALLBACK_STAGE_LABEL = 'Final approval';
const DEFAULT_REVIEWER_ROLES: ApprovalReviewerRole[] = ['owner', 'admin', 'member', 'viewer'];

function buildFallbackStage(requiredCount: number): ApprovalStageDefinition {
  return {
    label: FALLBACK_STAGE_LABEL,
    requiredCount,
    reviewerRoles: DEFAULT_REVIEWER_ROLES,
  };
}

export function normalizeApprovalStages(input: SubmitForApprovalInput): ApprovalStageDefinition[] {
  if (input.stages && input.stages.length > 0) {
    return input.stages.map((stage) => ({
      label: stage.label.trim(),
      requiredCount: stage.requiredCount,
      reviewerRoles: [...stage.reviewerRoles],
    }));
  }

  return [buildFallbackStage(input.requiredCount ?? 1)];
}

export function parseApprovalStages(
  raw: unknown,
  fallbackRequiredCount: number,
): ApprovalStageDefinition[] {
  if (!Array.isArray(raw)) {
    return [buildFallbackStage(fallbackRequiredCount)];
  }

  const parsedStages = raw
    .map((entry) => approvalStageSchema.safeParse(entry))
    .filter((entry) => entry.success)
    .map((entry) => entry.data);

  if (parsedStages.length === 0) {
    return [buildFallbackStage(fallbackRequiredCount)];
  }

  return parsedStages.map((stage) => ({
    label: stage.label.trim(),
    requiredCount: stage.requiredCount,
    reviewerRoles: [...stage.reviewerRoles],
  }));
}

function getStageStatus(input: {
  requestStatus: string;
  currentStageIndex: number;
  stageIndex: number;
  stage: ApprovalStageDefinition;
  decisions: ApprovalDecisionRecord[];
}): ApprovalStageStatus {
  const approvedCount = input.decisions.filter(
    (decision) =>
      decision.decision === 'approved' && (decision.stageIndex ?? 0) === input.stageIndex,
  ).length;
  const hasRejected = input.decisions.some(
    (decision) =>
      decision.decision === 'rejected' && (decision.stageIndex ?? 0) === input.stageIndex,
  );

  if (
    hasRejected ||
    (input.requestStatus === 'rejected' && input.stageIndex === input.currentStageIndex)
  ) {
    return 'rejected';
  }

  if (approvedCount >= input.stage.requiredCount) {
    return 'approved';
  }

  if (input.requestStatus === 'approved' && input.stageIndex === input.currentStageIndex) {
    return 'approved';
  }

  if (input.stageIndex === input.currentStageIndex) {
    return 'active';
  }

  return input.stageIndex < input.currentStageIndex ? 'approved' : 'pending';
}

export function serializeApprovalDecision(
  decision: ApprovalDecisionRecord,
): ApprovalDecisionResponse {
  return {
    id: decision.id,
    approvalRequestId: decision.approvalRequestId,
    userId: decision.userId,
    decision: decision.decision as ApprovalDecisionResponse['decision'],
    rationale: decision.rationale,
    stageIndex: decision.stageIndex ?? null,
    stageLabel: decision.stageLabel ?? null,
    createdAt: decision.createdAt.toISOString(),
  };
}

export function serializeApprovalRequest(input: {
  request: ApprovalRequestRecord;
  decisions?: ApprovalDecisionRecord[];
}): ApprovalRequestResponse & { decisions?: ApprovalDecisionResponse[] } {
  const decisions = input.decisions ?? [];
  const stages = parseApprovalStages(input.request.stageDefinitions, input.request.requiredCount);
  const currentStageIndex = Math.min(
    Math.max(input.request.currentStageIndex ?? 0, 0),
    Math.max(stages.length - 1, 0),
  );

  const stageResponses: ApprovalStageResponse[] = stages.map((stage, index) => ({
    index,
    label: stage.label,
    requiredCount: stage.requiredCount,
    currentCount: decisions.filter(
      (decision) => decision.decision === 'approved' && (decision.stageIndex ?? 0) === index,
    ).length,
    reviewerRoles: stage.reviewerRoles,
    status: getStageStatus({
      requestStatus: input.request.status,
      currentStageIndex,
      stageIndex: index,
      stage,
      decisions,
    }),
  }));

  const response: ApprovalRequestResponse & { decisions?: ApprovalDecisionResponse[] } = {
    id: input.request.id,
    intentId: input.request.intentId,
    status: input.request.status as ApprovalRequestResponse['status'],
    mode:
      (input.request.mode as ApprovalFlowMode | null | undefined) ??
      (stages.length > 1 ? 'multi_step' : 'single_step'),
    requiredCount: input.request.requiredCount,
    currentCount: input.request.currentCount,
    currentStageIndex,
    stages: stageResponses,
    expiresAt: input.request.expiresAt?.toISOString() ?? null,
    createdAt: input.request.createdAt.toISOString(),
    updatedAt: input.request.updatedAt.toISOString(),
  };

  if (input.decisions) {
    response.decisions = input.decisions.map(serializeApprovalDecision);
  }

  return response;
}
