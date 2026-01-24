import type { iRest, C6RestfulModel } from "../../types/ormInterfaces";

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
    ID: undefined as any,
  } as any;
}

export function buildPuSalesConfig() {
  const propertyUnitsCols = {
    'property_units.unit_id': 'unit_id',
    'property_units.parcel_id': 'parcel_id',
    'property_units.location': 'location',
  } as const;
  const parcelSalesCols = {
    'parcel_sales.parcel_id': 'parcel_id',
    'parcel_sales.sale_price': 'sale_price',
    'parcel_sales.sale_type': 'sale_type',
    'parcel_sales.sale_date': 'sale_date',
  } as const;
  const parcelBuildingDetailsCols = {
    'parcel_building_details.parcel_id': 'parcel_id',
  } as const;

  const C6 = {
    C6VERSION: 'test',
    TABLES: {
      property_units: tableModel<'property_units' & any>('property_units', propertyUnitsCols as any),
      parcel_sales: tableModel<'parcel_sales' & any>('parcel_sales', parcelSalesCols as any),
      parcel_building_details: tableModel<'parcel_building_details' & any>('parcel_building_details', parcelBuildingDetailsCols as any),
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
