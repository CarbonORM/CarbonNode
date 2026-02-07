import { describe, expect, it, vi } from 'vitest';
import { SqlExecutor } from '../executors/SqlExecutor';
import { PostQueryBuilder } from '../orm/queries/PostQueryBuilder';

describe('SqlExecutor lifecycle hooks', () => {
  it('runs beforeExecution/afterExecution around query and afterCommit after commit', async () => {
    const hookOrder: string[] = [];
    let afterExecutionArgs: any;
    let afterCommitArgs: any;

    const conn: any = {
      beginTransaction: vi.fn(async () => {
        hookOrder.push('begin');
      }),
      query: vi.fn(async () => {
        hookOrder.push('query');
        return [{ affectedRows: 1, insertId: 42 }, []];
      }),
      commit: vi.fn(async () => {
        hookOrder.push('commit');
      }),
      rollback: vi.fn(async () => {
        hookOrder.push('rollback');
      }),
      release: vi.fn(),
    };

    const config: any = {
      requestMethod: 'POST',
      mysqlPool: {
        getConnection: vi.fn(async () => conn),
      },
      websocketBroadcast: vi.fn(async () => {
        hookOrder.push('broadcast');
      }),
      C6: {
        PREFIX: '',
      },
      restModel: {
        TABLE_NAME: 'widgets',
        PRIMARY: ['widgets.id'],
        PRIMARY_SHORT: ['id'],
        COLUMNS: {
          'widgets.id': 'id',
          'widgets.name': 'name',
        },
        LIFECYCLE_HOOKS: {
          GET: {},
          POST: {
            beforeProcessing: {
              first: async ({ request }: any) => {
                hookOrder.push('beforeProcessing');
                request.seed = 'from-before-processing';
              },
            },
            beforeExecution: {
              second: async ({ request }: any) => {
                hookOrder.push('beforeExecution');
                request.stage = 'from-before-execution';
              },
            },
            afterExecution: {
              third: async (args: any) => {
                hookOrder.push('afterExecution');
                afterExecutionArgs = args;
                expect(conn.commit).toHaveBeenCalledTimes(0);
              },
            },
            afterCommit: {
              fourth: async (args: any) => {
                hookOrder.push('afterCommit');
                afterCommitArgs = args;
                expect(conn.commit).toHaveBeenCalledTimes(1);
              },
            },
          },
          PUT: {},
          DELETE: {},
        },
      },
    };

    const request: any = { name: 'example' };

    vi.spyOn(PostQueryBuilder.prototype as any, 'build').mockReturnValue({
      sql: 'INSERT INTO widgets (name) VALUES (:name)',
      params: { name: 'example' },
    });

    const executor = new SqlExecutor<any>(config, request);

    const result = await executor.execute();

    expect(result).toMatchObject({
      affected: 1,
      insertId: 42,
    });
    expect(hookOrder).toEqual([
      'beforeProcessing',
      'begin',
      'beforeExecution',
      'query',
      'afterExecution',
      'commit',
      'afterCommit',
      'broadcast',
    ]);

    expect((executor as any).request.seed).toBe('from-before-processing');
    expect((executor as any).request.stage).toBe('from-before-execution');

    expect(afterExecutionArgs.response.data.success).toBe(true);
    expect(afterExecutionArgs.response.data.insertId).toBe(42);
    expect(afterExecutionArgs.response.data.affected).toBe(1);

    expect(afterCommitArgs.response.data.success).toBe(true);
    expect(afterCommitArgs.response.data.insertId).toBe(42);
    expect(afterCommitArgs.response.data.affected).toBe(1);

    expect(conn.rollback).not.toHaveBeenCalled();
  });
});
