import { afterEach, describe, expect, it, vi } from 'vitest';
import { GitHubConnector } from '../github.connector.js';
import { HttpConnector } from '../http.connector.js';

const runtimeContext = {
  intentId: 'intent_test',
  workspaceId: 'workspace_test',
  connectorId: 'connector_test',
  connectorName: 'Runtime connector',
  connectorType: 'http',
  config: {},
};

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('runtime connector implementations', () => {
  it('executes and rolls back the HTTP connector against configured endpoints', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ accepted: true }), {
          status: 200,
          headers: {
            'content-type': 'application/json',
          },
        }),
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ reverted: true }), {
          status: 200,
          headers: {
            'content-type': 'application/json',
          },
        }),
      );
    vi.stubGlobal('fetch', fetchMock);

    const connector = new HttpConnector();
    const config = {
      url: 'https://example.com/hooks/intent',
      rollbackUrl: 'https://example.com/hooks/intent/rollback',
      headers: {
        'X-VowGrid-Test': 'runtime',
      },
    };

    const executed = await connector.execute(
      'notify',
      {
        payload: {
          intentId: 'intent_test',
        },
      },
      {
        ...runtimeContext,
        connectorType: 'http',
        config,
      },
    );

    expect(executed.success).toBe(true);
    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      'https://example.com/hooks/intent',
      expect.objectContaining({
        method: 'POST',
      }),
    );

    const rolledBack = await connector.rollback(
      'notify',
      {
        rollbackPayload: {
          reason: 'test',
        },
      },
      executed.data ?? {},
      {
        ...runtimeContext,
        connectorType: 'http',
        config,
      },
    );

    expect(rolledBack.success).toBe(true);
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      'https://example.com/hooks/intent/rollback',
      expect.objectContaining({
        method: 'POST',
      }),
    );
  });

  it('executes GitHub issue actions and rolls back created issue comments', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            id: 991,
            html_url: 'https://github.com/octo/test/issues/42/comments/991',
            body: 'Looks good',
          }),
          {
            status: 201,
            headers: {
              'content-type': 'application/json',
            },
          },
        ),
      )
      .mockResolvedValueOnce(new Response(null, { status: 204 }));
    vi.stubGlobal('fetch', fetchMock);

    const connector = new GitHubConnector();
    const config = {
      owner: 'octo',
      repo: 'test',
      token: 'ghp_test_token',
    };

    const executed = await connector.execute(
      'add_issue_comment',
      {
        issueNumber: 42,
        body: 'Looks good',
      },
      {
        ...runtimeContext,
        connectorType: 'github',
        config,
      },
    );

    expect(executed.success).toBe(true);
    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      'https://api.github.com/repos/octo/test/issues/42/comments',
      expect.objectContaining({
        method: 'POST',
      }),
    );

    const rolledBack = await connector.rollback('add_issue_comment', {}, executed.data ?? {}, {
      ...runtimeContext,
      connectorType: 'github',
      config,
    });

    expect(rolledBack.success).toBe(true);
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      'https://api.github.com/repos/octo/test/issues/comments/991',
      expect.objectContaining({
        method: 'DELETE',
      }),
    );
  });
});
