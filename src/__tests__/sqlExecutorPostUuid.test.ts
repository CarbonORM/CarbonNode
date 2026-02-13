import { describe, expect, it, vi } from "vitest";
import { SqlExecutor } from "../executors/SqlExecutor";

function buildLifecycleHooks() {
  return { GET: {}, POST: {}, PUT: {}, DELETE: {} } as any;
}

function buildUuidPrimaryConfig(conn: any) {
  const restModel: any = {
    TABLE_NAME: "report_dashboards",
    PRIMARY: ["report_dashboards.dashboard_id"],
    PRIMARY_SHORT: ["dashboard_id"],
    COLUMNS: {
      "report_dashboards.dashboard_id": "dashboard_id",
      "report_dashboards.title": "title",
      "report_dashboards.created_by": "created_by",
    },
    TYPE_VALIDATION: {
      "report_dashboards.dashboard_id": {
        MYSQL_TYPE: "binary",
        MAX_LENGTH: "16",
        AUTO_INCREMENT: false,
        SKIP_COLUMN_IN_POST: false,
      },
      "report_dashboards.title": {
        MYSQL_TYPE: "varchar",
        MAX_LENGTH: "120",
        AUTO_INCREMENT: false,
        SKIP_COLUMN_IN_POST: false,
      },
      "report_dashboards.created_by": {
        MYSQL_TYPE: "varchar",
        MAX_LENGTH: "255",
        AUTO_INCREMENT: false,
        SKIP_COLUMN_IN_POST: false,
      },
    },
    LIFECYCLE_HOOKS: buildLifecycleHooks(),
  };

  return {
    requestMethod: "POST",
    mysqlPool: {
      getConnection: vi.fn(async () => conn),
    },
    C6: {
      PREFIX: "",
      TABLES: {
        report_dashboards: restModel,
      },
    },
    restModel,
  } as any;
}

function buildAutoIncrementConfig(conn: any) {
  const restModel: any = {
    TABLE_NAME: "widgets",
    PRIMARY: ["widgets.widget_id"],
    PRIMARY_SHORT: ["widget_id"],
    COLUMNS: {
      "widgets.widget_id": "widget_id",
      "widgets.name": "name",
    },
    TYPE_VALIDATION: {
      "widgets.widget_id": {
        MYSQL_TYPE: "int",
        MAX_LENGTH: "11",
        AUTO_INCREMENT: true,
        SKIP_COLUMN_IN_POST: false,
      },
      "widgets.name": {
        MYSQL_TYPE: "varchar",
        MAX_LENGTH: "120",
        AUTO_INCREMENT: false,
        SKIP_COLUMN_IN_POST: false,
      },
    },
    LIFECYCLE_HOOKS: buildLifecycleHooks(),
  };

  return {
    requestMethod: "POST",
    mysqlPool: {
      getConnection: vi.fn(async () => conn),
    },
    C6: {
      PREFIX: "",
      TABLES: {
        widgets: restModel,
      },
    },
    restModel,
  } as any;
}

function buildWriteConn(affectedRows = 1, insertId = 0) {
  return {
    beginTransaction: vi.fn(async () => undefined),
    query: vi.fn(async () => [{ affectedRows, insertId }, []]),
    commit: vi.fn(async () => undefined),
    rollback: vi.fn(async () => undefined),
    release: vi.fn(),
  };
}

function expectUuidV7Hex(value: unknown) {
  expect(typeof value).toBe("string");
  const hex = String(value).toUpperCase();
  expect(hex).toMatch(/^[0-9A-F]{32}$/);
  expect(hex[12]).toBe("7");
  expect(hex[16]).toMatch(/[89AB]/);
}

describe("SqlExecutor POST UUID synthesis", () => {
  it("generates missing UUID primary keys for POST and populates rest payload", async () => {
    const conn = buildWriteConn(1, 0);
    const config = buildUuidPrimaryConfig(conn);
    const request: any = {
      title: "Board One",
      created_by: "user-1",
    };

    const executor = new SqlExecutor<any>(config, request);
    const result: any = await executor.execute();

    expect(Array.isArray(result.rest)).toBe(true);
    expect(result.rest).toHaveLength(1);
    expect(result.rest[0]).toMatchObject({
      title: "Board One",
      created_by: "user-1",
    });
    expectUuidV7Hex(result.rest[0].dashboard_id);

    const [sql, values] = conn.query.mock.calls[0];
    expect(sql).toContain("INSERT INTO `report_dashboards`");
    const uuidBuffers = (values as any[]).filter((value) => Buffer.isBuffer(value));
    expect(uuidBuffers).toHaveLength(1);
    expect(uuidBuffers[0]).toHaveLength(16);
  });

  it("generates UUIDs for each multi-row insert payload row", async () => {
    const conn = buildWriteConn(2, 0);
    const config = buildUuidPrimaryConfig(conn);
    const request: any = {
      dataInsertMultipleRows: [
        { title: "One", created_by: "user-1" },
        { title: "Two", created_by: "user-1" },
      ],
    };

    const executor = new SqlExecutor<any>(config, request);
    const result: any = await executor.execute();

    expect(Array.isArray(result.rest)).toBe(true);
    expect(result.rest).toHaveLength(2);
    expectUuidV7Hex(result.rest[0].dashboard_id);
    expectUuidV7Hex(result.rest[1].dashboard_id);
    expect(result.rest[0].dashboard_id).not.toBe(result.rest[1].dashboard_id);

    const [, values] = conn.query.mock.calls[0];
    const uuidBuffers = (values as any[]).filter((value) => Buffer.isBuffer(value));
    expect(uuidBuffers).toHaveLength(2);
    expect(uuidBuffers[0]).toHaveLength(16);
    expect(uuidBuffers[1]).toHaveLength(16);
  });

  it("fills response rest primary key from insertId for autoincrement inserts", async () => {
    const conn = buildWriteConn(1, 42);
    const config = buildAutoIncrementConfig(conn);
    const request: any = {
      name: "Auto Row",
    };

    const executor = new SqlExecutor<any>(config, request);
    const result: any = await executor.execute();

    expect(Array.isArray(result.rest)).toBe(true);
    expect(result.rest).toHaveLength(1);
    expect(result.rest[0]).toMatchObject({
      widget_id: 42,
      name: "Auto Row",
    });
  });
});
