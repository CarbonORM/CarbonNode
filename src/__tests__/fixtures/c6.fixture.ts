import type { iRest, C6RestfulModel } from "../../api/types/ormInterfaces";

// Minimal C6 table descriptor for tests
function tableModel<T extends Record<string, any>>(name: string, columns: Record<string, keyof T>): C6RestfulModel<string, T, keyof T & string> {
  const TYPE_VALIDATION: any = {};
  const COLUMNS: any = {};
  Object.entries(columns).forEach(([fq, short]) => {
    COLUMNS[fq] = short;
    TYPE_VALIDATION[short as string] = {
      MYSQL_TYPE: 'VARCHAR(255)',
      MAX_LENGTH: '255',
      AUTO_INCREMENT: false,
      SKIP_COLUMN_IN_POST: false,
    };
  });

  // Derive primary keys: any short column ending with '_id'
  const pkShorts = Object.values(columns)
    .map(v => String(v))
    .filter(v => v.toLowerCase().endsWith('_id')) as any[];
  const pkFull = Object.entries(columns)
    .filter(([, short]) => String(short).toLowerCase().endsWith('_id'))
    .map(([fq]) => fq as any);

  return {
    TABLE_NAME: name,
    PRIMARY: pkFull,
    PRIMARY_SHORT: pkShorts as any,
    COLUMNS,
    TYPE_VALIDATION,
    REGEX_VALIDATION: {},
    LIFECYCLE_HOOKS: { GET: {}, POST: {}, PUT: {}, DELETE: {} } as any,
    TABLE_REFERENCES: {},
    TABLE_REFERENCED_BY: {},
    // Uppercase fields — not used by builders but required by type
    ID: undefined as any,
  } as any;
}

export function buildTestConfig() {
  const actorCols = {
    'actor.actor_id': 'actor_id',
    'actor.first_name': 'first_name',
    'actor.last_name': 'last_name',
    'actor.binarycol': 'binarycol',
  } as const;

  const filmActorCols = {
    'film_actor.actor_id': 'actor_id',
    'film_actor.film_id': 'film_id',
  } as const;

  const C6 = {
    C6VERSION: 'test',
    TABLES: {
      actor: tableModel<'actor' & any>('actor', actorCols as any),
      film_actor: tableModel<'film_actor' & any>('film_actor', filmActorCols as any),
    },
    PREFIX: '',
    ORM: {} as any,
  } as any;

  // Special-case: mark binary column as BINARY to test conversion
  C6.TABLES.actor.TYPE_VALIDATION['binarycol'].MYSQL_TYPE = 'BINARY(16)';

  const baseConfig: iRest<any, any, any> = {
    C6,
    restModel: C6.TABLES.actor,
    requestMethod: 'GET',
    verbose: false,
  } as any;

  return baseConfig;
}

export function buildBinaryTestConfig() {
  const binaryCols = {
    'binary_test.id': 'id',
    'binary_test.bin_col': 'bin_col',
  } as const;

  const C6 = {
    C6VERSION: 'test',
    TABLES: {
      binary_test: tableModel<'binary_test' & any>('binary_test', binaryCols as any),
    },
    PREFIX: '',
    ORM: {} as any,
  } as any;

  C6.TABLES.binary_test.TYPE_VALIDATION['bin_col'].MYSQL_TYPE = 'BINARY(16)';

  const baseConfig: iRest<any, any, any> = {
    C6,
    restModel: C6.TABLES.binary_test,
    requestMethod: 'POST',
    verbose: false,
  } as any;

  return baseConfig;
}

export function buildBinaryTestConfigFqn() {
  const binaryCols = {
    'binary_test.id': 'id',
    'binary_test.bin_col': 'bin_col',
  } as const;

  const C6 = {
    C6VERSION: 'test',
    TABLES: {
      binary_test: tableModel<'binary_test' & any>('binary_test', binaryCols as any),
    },
    PREFIX: '',
    ORM: {} as any,
  } as any;

  // Re-key TYPE_VALIDATION to fully-qualified key and set BINARY(16)
  const tv = C6.TABLES.binary_test.TYPE_VALIDATION as any;
  tv['binary_test.bin_col'] = { ...(tv['bin_col'] || {}), MYSQL_TYPE: 'BINARY(16)' };
  delete tv['bin_col'];

  const baseConfig: iRest<any, any, any> = {
    C6,
    restModel: C6.TABLES.binary_test,
    requestMethod: 'POST',
    verbose: false,
  } as any;

  return baseConfig;
}

export function buildParcelConfig() {
  const propertyUnitsCols = {
    'property_units.unit_id': 'unit_id',
    'property_units.location': 'location',
    'property_units.parcel_id': 'parcel_id',
    'property_units.county_id': 'county_id',
  } as const;

  const parcelSalesCols = {
    'parcel_sales.parcel_id': 'parcel_id',
    'parcel_sales.sale_price': 'sale_price',
    'parcel_sales.sale_type': 'sale_type',
    'parcel_sales.sale_date': 'sale_date',
  } as const;

  const parcelBuildingCols = {
    'parcel_building_details.parcel_id': 'parcel_id',
    'parcel_building_details.year_built': 'year_built',
    'parcel_building_details.gla': 'gla',
  } as const;

  const C6 = {
    C6VERSION: 'test',
    TABLES: {
      property_units: tableModel<'property_units' & any>('property_units', propertyUnitsCols as any),
      parcel_sales: tableModel<'parcel_sales' & any>('parcel_sales', parcelSalesCols as any),
      parcel_building_details: tableModel<'parcel_building_details' & any>('parcel_building_details', parcelBuildingCols as any),
    },
    PREFIX: '',
    ORM: {} as any,
  } as any;

  const baseConfig: iRest<any, any, any> = {
    C6,
    restModel: C6.TABLES.property_units,
    requestMethod: 'GET',
    verbose: false,
  } as any;

  return baseConfig;
}
