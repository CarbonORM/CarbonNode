import { describe, it, expect } from 'vitest';
import { SelectQueryBuilder } from '../api/orm/queries/SelectQueryBuilder';
import { PostQueryBuilder } from '../api/orm/queries/PostQueryBuilder';
import { UpdateQueryBuilder } from '../api/orm/queries/UpdateQueryBuilder';
import { DeleteQueryBuilder } from '../api/orm/queries/DeleteQueryBuilder';
import { buildTestConfig } from './fixtures/c6.fixture';
import { readdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

interface Fixture {
  description: string;
  method: string;
  table: string;
  rest: any;
  expected: {
    sqlIncludes: string[];
    params: any[];
  };
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const casesDir = path.join(__dirname, 'fixtures', 'sql');
const caseFiles = readdirSync(casesDir).filter(f => f.endsWith('.ts'));

const fixtures: Fixture[] = await Promise.all(
  caseFiles.map(async file => {
    const mod = await import(pathToFileURL(path.join(casesDir, file)).href);
    return mod.default as Fixture;
  })
);

describe('SQL Builder fixtures', () => {
  fixtures.forEach(fixture => {
    it(fixture.description, () => {
      const config = buildTestConfig();
      config.requestMethod = fixture.method as any;
      config.restModel = config.C6.TABLES[fixture.table];

      let builder;
      switch (fixture.method) {
        case 'POST':
          builder = new PostQueryBuilder(config as any, fixture.rest as any, false);
          break;
        case 'PUT':
          builder = new UpdateQueryBuilder(config as any, fixture.rest as any, false);
          break;
        case 'DELETE':
          builder = new DeleteQueryBuilder(config as any, fixture.rest as any, false);
          break;
        case 'GET':
        default:
          builder = new SelectQueryBuilder(config as any, fixture.rest as any, false);
          break;
      }

      const { sql, params } = builder.build(fixture.table);
      fixture.expected.sqlIncludes.forEach(fragment => {
        expect(sql).toContain(fragment);
      });
      expect(params).toEqual(fixture.expected.params);
    });
  });
});
