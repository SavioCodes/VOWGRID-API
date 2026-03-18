import type {
  ConnectorExecuteResult,
  ConnectorRollbackResult,
  ConnectorRuntimeContext,
  ConnectorSimulateResult,
  ConnectorValidateResult,
  IConnector,
  RollbackSupport,
} from './connector.interface.js';

type HttpAuth =
  | { type: 'none' }
  | { type: 'bearer'; token: string }
  | { type: 'basic'; username: string; password: string };

type HttpConnectorConfig = {
  url: string;
  method: string;
  headers: Record<string, string>;
  timeoutMs: number;
  auth: HttpAuth;
  rollbackUrl: string | null;
  rollbackMethod: string;
};

function asRecord(value: unknown) {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function parseHeaders(value: unknown) {
  const headers = asRecord(value);
  return Object.fromEntries(
    Object.entries(headers).filter(
      (entry): entry is [string, string] =>
        typeof entry[1] === 'string' && entry[1].trim().length > 0,
    ),
  );
}

function parseConfig(config: Record<string, unknown>): HttpConnectorConfig {
  const auth = asRecord(config.auth);
  const authType = auth.type === 'basic' || auth.type === 'bearer' ? auth.type : 'none';

  return {
    url: typeof config.url === 'string' ? config.url.trim() : '',
    method:
      typeof config.method === 'string' && config.method.trim().length > 0
        ? config.method.trim().toUpperCase()
        : 'POST',
    headers: parseHeaders(config.headers),
    timeoutMs:
      typeof config.timeoutMs === 'number' && Number.isFinite(config.timeoutMs)
        ? Math.max(Math.trunc(config.timeoutMs), 1_000)
        : 10_000,
    auth:
      authType === 'bearer'
        ? {
            type: 'bearer',
            token: typeof auth.token === 'string' ? auth.token.trim() : '',
          }
        : authType === 'basic'
          ? {
              type: 'basic',
              username: typeof auth.username === 'string' ? auth.username.trim() : '',
              password: typeof auth.password === 'string' ? auth.password : '',
            }
          : { type: 'none' },
    rollbackUrl: typeof config.rollbackUrl === 'string' ? config.rollbackUrl.trim() : null,
    rollbackMethod:
      typeof config.rollbackMethod === 'string' && config.rollbackMethod.trim().length > 0
        ? config.rollbackMethod.trim().toUpperCase()
        : 'POST',
  };
}

function buildHeaders(config: HttpConnectorConfig) {
  const headers = new Headers(config.headers);
  headers.set('Accept', 'application/json, text/plain;q=0.9, */*;q=0.8');

  if (!headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  if (config.auth.type === 'bearer') {
    headers.set('Authorization', `Bearer ${config.auth.token}`);
  }

  if (config.auth.type === 'basic') {
    const encoded = Buffer.from(`${config.auth.username}:${config.auth.password}`).toString(
      'base64',
    );
    headers.set('Authorization', `Basic ${encoded}`);
  }

  return headers;
}

function validateUrl(value: string, label: string, errors: string[]) {
  if (!value) {
    errors.push(`${label} is required.`);
    return;
  }

  try {
    const parsed = new URL(value);

    if (!['http:', 'https:'].includes(parsed.protocol)) {
      errors.push(`${label} must use http or https.`);
    }
  } catch {
    errors.push(`${label} must be a valid absolute URL.`);
  }
}

async function parseResponse(response: Response) {
  const contentType = response.headers.get('content-type') ?? '';
  const raw = await response.text();

  if (!raw) {
    return null;
  }

  if (contentType.includes('application/json')) {
    try {
      return JSON.parse(raw) as unknown;
    } catch {
      return raw;
    }
  }

  return raw;
}

function buildRequestBody(action: string, parameters: Record<string, unknown>) {
  if (typeof parameters.body === 'string') {
    return parameters.body;
  }

  if ('payload' in parameters) {
    return JSON.stringify(parameters.payload);
  }

  return JSON.stringify({
    action,
    parameters,
  });
}

export class HttpConnector implements IConnector {
  readonly type = 'http';
  readonly rollbackSupport: RollbackSupport = 'partial';

  async validateConfig(config: Record<string, unknown>): Promise<ConnectorValidateResult> {
    const parsed = parseConfig(config);
    const errors: string[] = [];

    validateUrl(parsed.url, 'Connector url', errors);

    if (parsed.auth.type === 'bearer' && !parsed.auth.token) {
      errors.push('Bearer authentication requires a token.');
    }

    if (parsed.auth.type === 'basic' && (!parsed.auth.username || !parsed.auth.password)) {
      errors.push('Basic authentication requires both username and password.');
    }

    if (parsed.rollbackUrl) {
      validateUrl(parsed.rollbackUrl, 'Rollback url', errors);
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

    if (!action.trim()) {
      errors.push('Action is required.');
    }

    const method =
      typeof parameters.method === 'string' ? parameters.method.trim().toUpperCase() : null;
    const allowed = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'];

    if (method && !allowed.includes(method)) {
      errors.push(`Unsupported HTTP method "${method}".`);
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
    const method =
      typeof parameters.method === 'string' && parameters.method.trim().length > 0
        ? parameters.method.trim().toUpperCase()
        : config.method;

    return {
      summary: `HTTP connector will ${method} ${config.url} for "${action}".`,
      estimatedImpact: method === 'GET' ? 'low' : 'medium',
      riskLevel: method === 'DELETE' ? 'high' : method === 'PATCH' ? 'medium' : 'low',
      reversibility: config.rollbackUrl ? 'partial' : 'none',
      affectedResources: [
        {
          type: 'http_endpoint',
          id: config.url,
          name: context.connectorName,
        },
      ],
      diffPreview: {
        method,
        url: config.url,
        action,
        payloadKeys: Object.keys(parameters),
      },
      warnings: config.rollbackUrl
        ? ['Rollback will call the configured rollback URL with the recorded execution context.']
        : ['No rollback URL is configured, so HTTP delivery is treated as forward-only.'],
    };
  }

  async execute(
    action: string,
    parameters: Record<string, unknown>,
    context: ConnectorRuntimeContext,
  ): Promise<ConnectorExecuteResult> {
    const config = parseConfig(context.config);
    const method =
      typeof parameters.method === 'string' && parameters.method.trim().length > 0
        ? parameters.method.trim().toUpperCase()
        : config.method;
    const headers = buildHeaders(config);
    const body = ['GET', 'DELETE'].includes(method)
      ? undefined
      : buildRequestBody(action, parameters);
    const startedAt = Date.now();
    const response = await fetch(config.url, {
      method,
      headers,
      body,
      signal: AbortSignal.timeout(config.timeoutMs),
    });
    const parsed = await parseResponse(response);

    if (!response.ok) {
      throw new Error(`HTTP connector request failed with status ${response.status}.`);
    }

    return {
      success: true,
      duration: Date.now() - startedAt,
      data: {
        request: {
          url: config.url,
          method,
        },
        response: {
          status: response.status,
          body: parsed,
        },
        rollbackUrl: config.rollbackUrl,
      },
    };
  }

  async rollback(
    action: string,
    parameters: Record<string, unknown>,
    executionData: Record<string, unknown>,
    context: ConnectorRuntimeContext,
  ): Promise<ConnectorRollbackResult> {
    const config = parseConfig(context.config);

    if (!config.rollbackUrl) {
      throw new Error('HTTP connector rollback requires rollbackUrl in connector config.');
    }

    const response = await fetch(config.rollbackUrl, {
      method: config.rollbackMethod,
      headers: buildHeaders(config),
      body: JSON.stringify({
        action,
        parameters,
        executionData,
        rollbackPayload:
          (parameters.rollbackPayload as Record<string, unknown> | undefined) ?? null,
      }),
      signal: AbortSignal.timeout(config.timeoutMs),
    });

    const parsed = await parseResponse(response);

    if (!response.ok) {
      throw new Error(`HTTP connector rollback failed with status ${response.status}.`);
    }

    return {
      success: true,
      data: {
        rollbackUrl: config.rollbackUrl,
        rollbackMethod: config.rollbackMethod,
        response: parsed,
      },
    };
  }
}
