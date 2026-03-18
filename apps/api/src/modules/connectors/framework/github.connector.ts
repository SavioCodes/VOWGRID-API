import type {
  ConnectorExecuteResult,
  ConnectorRollbackResult,
  ConnectorRuntimeContext,
  ConnectorSimulateResult,
  ConnectorValidateResult,
  IConnector,
  RollbackSupport,
} from './connector.interface.js';

type GithubConnectorConfig = {
  owner: string;
  repo: string;
  token: string;
  apiBaseUrl: string;
  defaultLabels: string[];
};

function parseConfig(config: Record<string, unknown>): GithubConnectorConfig {
  return {
    owner: typeof config.owner === 'string' ? config.owner.trim() : '',
    repo: typeof config.repo === 'string' ? config.repo.trim() : '',
    token: typeof config.token === 'string' ? config.token.trim() : '',
    apiBaseUrl:
      typeof config.apiBaseUrl === 'string' && config.apiBaseUrl.trim().length > 0
        ? config.apiBaseUrl.trim().replace(/\/$/, '')
        : 'https://api.github.com',
    defaultLabels: Array.isArray(config.defaultLabels)
      ? config.defaultLabels.filter(
          (value): value is string => typeof value === 'string' && value.trim().length > 0,
        )
      : [],
  };
}

function buildHeaders(config: GithubConnectorConfig) {
  return {
    Authorization: `Bearer ${config.token}`,
    Accept: 'application/vnd.github+json',
    'Content-Type': 'application/json',
    'User-Agent': 'VowGrid',
    'X-GitHub-Api-Version': '2022-11-28',
  };
}

async function githubRequest<T>(
  config: GithubConnectorConfig,
  path: string,
  init?: RequestInit,
): Promise<T> {
  const response = await fetch(`${config.apiBaseUrl}${path}`, {
    ...init,
    headers: {
      ...buildHeaders(config),
      ...(init?.headers ?? {}),
    },
  });
  const json = (await response.json().catch(() => ({}))) as {
    message?: string;
    html_url?: string;
    id?: number;
    number?: number;
  };

  if (!response.ok) {
    throw new Error(
      json.message ?? `GitHub request to ${path} failed with status ${response.status}.`,
    );
  }

  return json as T;
}

function getIssueNumber(parameters: Record<string, unknown>) {
  return typeof parameters.issueNumber === 'number'
    ? parameters.issueNumber
    : typeof parameters.issueNumber === 'string' && /^\d+$/.test(parameters.issueNumber)
      ? Number(parameters.issueNumber)
      : null;
}

export class GitHubConnector implements IConnector {
  readonly type = 'github';
  readonly rollbackSupport: RollbackSupport = 'partial';

  async validateConfig(config: Record<string, unknown>): Promise<ConnectorValidateResult> {
    const parsed = parseConfig(config);
    const errors: string[] = [];

    if (!parsed.owner) {
      errors.push('GitHub connector config requires "owner".');
    }

    if (!parsed.repo) {
      errors.push('GitHub connector config requires "repo".');
    }

    if (!parsed.token) {
      errors.push('GitHub connector config requires "token".');
    }

    return {
      valid: errors.length === 0,
      errors: errors.length > 0 ? errors : undefined,
    };
  }

  async validate(
    action: string,
    parameters: Record<string, unknown>,
    context: ConnectorRuntimeContext,
  ): Promise<ConnectorValidateResult> {
    const configValidation = await this.validateConfig?.(context.config);
    const errors = [...(configValidation?.errors ?? [])];

    if (!['create_issue', 'add_issue_comment', 'close_issue'].includes(action)) {
      errors.push('GitHub connector supports create_issue, add_issue_comment, and close_issue.');
    }

    if (action === 'create_issue' && typeof parameters.title !== 'string') {
      errors.push('create_issue requires a string "title".');
    }

    if (action === 'add_issue_comment') {
      if (getIssueNumber(parameters) === null) {
        errors.push('add_issue_comment requires "issueNumber".');
      }

      if (typeof parameters.body !== 'string' || parameters.body.trim().length === 0) {
        errors.push('add_issue_comment requires a non-empty "body".');
      }
    }

    if (action === 'close_issue' && getIssueNumber(parameters) === null) {
      errors.push('close_issue requires "issueNumber".');
    }

    return {
      valid: errors.length === 0,
      errors: errors.length > 0 ? errors : undefined,
    };
  }

  async simulate(
    action: string,
    parameters: Record<string, unknown>,
    context: ConnectorRuntimeContext,
  ): Promise<ConnectorSimulateResult> {
    const config = parseConfig(context.config);
    const issueNumber = getIssueNumber(parameters);

    return {
      summary: `GitHub connector will ${action.replaceAll('_', ' ')} in ${config.owner}/${config.repo}.`,
      estimatedImpact: action === 'close_issue' ? 'medium' : 'low',
      riskLevel: action === 'close_issue' ? 'medium' : 'low',
      reversibility:
        action === 'create_issue' || action === 'add_issue_comment' ? 'partial' : 'none',
      affectedResources: [
        {
          type: 'github_repository',
          id: `${config.owner}/${config.repo}`,
          name: context.connectorName,
        },
        ...(issueNumber !== null
          ? [
              {
                type: 'github_issue',
                id: `${config.owner}/${config.repo}#${issueNumber}`,
                name: `Issue #${issueNumber}`,
              },
            ]
          : []),
      ],
      diffPreview: {
        repository: `${config.owner}/${config.repo}`,
        action,
        issueNumber,
      },
      warnings:
        action === 'close_issue'
          ? ['Closing an issue is treated as a forward change and is not automatically reversible.']
          : ['GitHub rollback is partial and depends on the action type.'],
    };
  }

  async execute(
    action: string,
    parameters: Record<string, unknown>,
    context: ConnectorRuntimeContext,
  ): Promise<ConnectorExecuteResult> {
    const config = parseConfig(context.config);
    const startedAt = Date.now();

    if (action === 'create_issue') {
      const labels = Array.isArray(parameters.labels)
        ? parameters.labels.filter(
            (value): value is string => typeof value === 'string' && value.trim().length > 0,
          )
        : [];
      const response = await githubRequest<{
        id: number;
        number: number;
        html_url: string;
        state: string;
      }>(config, `/repos/${config.owner}/${config.repo}/issues`, {
        method: 'POST',
        body: JSON.stringify({
          title: parameters.title,
          body: typeof parameters.body === 'string' ? parameters.body : undefined,
          labels: [...config.defaultLabels, ...labels],
        }),
      });

      return {
        success: true,
        duration: Date.now() - startedAt,
        data: {
          repository: `${config.owner}/${config.repo}`,
          issueId: response.id,
          issueNumber: response.number,
          issueUrl: response.html_url,
          state: response.state,
        },
      };
    }

    if (action === 'add_issue_comment') {
      const issueNumber = getIssueNumber(parameters);

      if (issueNumber === null) {
        throw new Error('add_issue_comment requires issueNumber.');
      }

      const response = await githubRequest<{
        id: number;
        html_url: string;
        body: string;
      }>(config, `/repos/${config.owner}/${config.repo}/issues/${issueNumber}/comments`, {
        method: 'POST',
        body: JSON.stringify({
          body: parameters.body,
        }),
      });

      return {
        success: true,
        duration: Date.now() - startedAt,
        data: {
          repository: `${config.owner}/${config.repo}`,
          issueNumber,
          commentId: response.id,
          commentUrl: response.html_url,
          body: response.body,
        },
      };
    }

    if (action === 'close_issue') {
      const issueNumber = getIssueNumber(parameters);

      if (issueNumber === null) {
        throw new Error('close_issue requires issueNumber.');
      }

      const response = await githubRequest<{
        id: number;
        number: number;
        html_url: string;
        state: string;
      }>(config, `/repos/${config.owner}/${config.repo}/issues/${issueNumber}`, {
        method: 'PATCH',
        body: JSON.stringify({
          state: 'closed',
        }),
      });

      return {
        success: true,
        duration: Date.now() - startedAt,
        data: {
          repository: `${config.owner}/${config.repo}`,
          issueId: response.id,
          issueNumber: response.number,
          issueUrl: response.html_url,
          state: response.state,
        },
      };
    }

    throw new Error(`Unsupported GitHub connector action "${action}".`);
  }

  async rollback(
    action: string,
    _parameters: Record<string, unknown>,
    executionData: Record<string, unknown>,
    context: ConnectorRuntimeContext,
  ): Promise<ConnectorRollbackResult> {
    const config = parseConfig(context.config);

    if (action === 'create_issue') {
      const issueNumber =
        typeof executionData.issueNumber === 'number'
          ? executionData.issueNumber
          : typeof executionData.issueNumber === 'string' && /^\d+$/.test(executionData.issueNumber)
            ? Number(executionData.issueNumber)
            : null;

      if (issueNumber === null) {
        throw new Error('GitHub rollback could not resolve the created issue number.');
      }

      const response = await githubRequest<{
        html_url: string;
        state: string;
      }>(config, `/repos/${config.owner}/${config.repo}/issues/${issueNumber}`, {
        method: 'PATCH',
        body: JSON.stringify({
          state: 'closed',
        }),
      });

      return {
        success: true,
        data: {
          issueNumber,
          issueUrl: response.html_url,
          state: response.state,
        },
      };
    }

    if (action === 'add_issue_comment') {
      const commentId =
        typeof executionData.commentId === 'number'
          ? executionData.commentId
          : typeof executionData.commentId === 'string' && /^\d+$/.test(executionData.commentId)
            ? Number(executionData.commentId)
            : null;

      if (commentId === null) {
        throw new Error('GitHub rollback could not resolve the created comment id.');
      }

      await githubRequest<Record<string, never>>(
        config,
        `/repos/${config.owner}/${config.repo}/issues/comments/${commentId}`,
        {
          method: 'DELETE',
        },
      );

      return {
        success: true,
        data: {
          commentId,
          deleted: true,
        },
      };
    }

    throw new Error(`GitHub rollback is not available for "${action}".`);
  }
}
