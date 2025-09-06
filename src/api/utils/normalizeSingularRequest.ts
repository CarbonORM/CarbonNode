import { C6Constants as C6C } from "../C6Constants";
import { C6RestfulModel, iRestMethods, RequestQueryBody } from "../types/ormInterfaces";

/**
 * Converts a singular T-shaped request into complex ORM format for GET/PUT/DELETE
 * Enforces that all primary keys are present for singular syntax and that the table has PKs.
 * Optionally accepts a previously removed primary key (key/value) to reconstruct WHERE.
 */
export function normalizeSingularRequest<
  Method extends iRestMethods,
  T extends Record<string, any>,
  Custom extends Record<string, any> = {},
  Overrides extends Record<string, any> = {}
> (
  requestMethod: Method,
  request: RequestQueryBody<Method, T, Custom, Overrides>,
  restModel: C6RestfulModel<string, T, any>,
  removedPrimary?: { key: string; value: any }
): RequestQueryBody<Method, T, Custom, Overrides> {
  if (request == null || typeof request !== 'object') return request;

  const specialKeys = new Set([
    C6C.SELECT,
    C6C.UPDATE,
    C6C.DELETE,
    C6C.WHERE,
    C6C.JOIN,
    C6C.PAGINATION,
  ]);

  // Determine if the request is already complex (has any special key besides PAGINATION)
  const keys = Object.keys(request as any);
  const hasComplexKeys = keys.some(k => k !== C6C.PAGINATION && specialKeys.has(k));
  if (hasComplexKeys) return request; // already complex

  // We treat it as singular when it's not complex.
  // For GET, PUT, DELETE only
  if (!(requestMethod === C6C.GET || requestMethod === C6C.PUT || requestMethod === C6C.DELETE)) {
    return request;
  }

  const pkShorts: string[] = Array.isArray(restModel.PRIMARY_SHORT) ? [...restModel.PRIMARY_SHORT] : [];
  const pkFulls: string[] = Array.isArray((restModel as any).PRIMARY) ? [...(restModel as any).PRIMARY] : [];
  const resolveShortKey = (key: string): string => {
    const cols = (restModel as any).COLUMNS || {};
    return (cols as any)[key] ?? key;
  };
  if (!pkShorts.length) {
    // For GET requests, do not enforce primary key presence; treat as a collection query.
    if (requestMethod === C6C.GET) return request;
    throw new Error(`Table (${restModel.TABLE_NAME}) has no primary key; singular request syntax is not allowed.`);
  }

  // Build pk map from request + possibly removed primary key (accept short or fully-qualified keys)
  const pkValues: Record<string, any> = {};
  const requestObj = request as any;
  for (const pkShort of pkShorts) {
    // 1) direct short key
    let value = requestObj[pkShort];
    if (value === undefined) {
      // 2) fully-qualified key matching this short key (from PRIMARY list or by concatenation)
      const fqCandidate = `${restModel.TABLE_NAME}.${pkShort}`;
      const fqKey = pkFulls.find(
        fq => fq === fqCandidate || fq.endsWith(`.${pkShort}`)
      ) ?? fqCandidate;
      value = requestObj[fqKey];
    }
    if (value === undefined && removedPrimary) {
      // 3) removedPrimary may provide either short or fully-qualified key
      const removedKeyShort = resolveShortKey(removedPrimary.key);
      if (removedKeyShort === pkShort) value = removedPrimary.value;
    }
    if (value !== undefined && value !== null) {
      pkValues[pkShort] = value;
    }
  }

  const missing = pkShorts.filter(pk => !(pk in pkValues));
  if (missing.length) {
    // For GET requests, if not all PKs are provided, treat as a collection query and leave as-is.
    if (requestMethod === C6C.GET) {
      return request;
    }
    throw new Error(`Singular request requires all primary key(s) [${pkShorts.join(', ')}] for table (${restModel.TABLE_NAME}). Missing: [${missing.join(', ')}]`);
  }

  // Strip API metadata that should remain at root
  const {
    dataInsertMultipleRows,
    cacheResults,
    fetchDependencies,
    debug,
    success,
    error,
    ...rest
  } = request as any;

  // Map short primary keys to fully-qualified column names
  const shortToFull: Record<string, string> = {};
  for (const [full, short] of Object.entries(restModel.COLUMNS || {})) {
    shortToFull[short as string] = full;
  }
  const pkFullValues = Object.fromEntries(
    Object.entries(pkValues).map(([k, v]) => [shortToFull[k] ?? k, v])
  );

  if (requestMethod === C6C.GET) {
    const normalized: any = {
      WHERE: { ...pkFullValues },
    };
    // Preserve pagination if any was added previously
    if ((request as any)[C6C.PAGINATION]) {
      normalized[C6C.PAGINATION] = (request as any)[C6C.PAGINATION];
    }
    return {
      ...normalized,
      dataInsertMultipleRows,
      cacheResults,
      fetchDependencies,
      debug,
      success,
      error,
    } as any;
  }

  if (requestMethod === C6C.DELETE) {
    const normalized: any = {
      [C6C.DELETE]: true,
      WHERE: { ...pkFullValues },
    };
    return {
      ...normalized,
      dataInsertMultipleRows,
      cacheResults,
      fetchDependencies,
      debug,
      success,
      error,
    } as any;
  }

  // PUT
  const updateBody: Record<string, any> = {};
  for (const k of Object.keys(rest)) {
    // Skip special request keys if any slipped through
    if (specialKeys.has(k)) continue;
    const shortKey = resolveShortKey(k);
    if (pkShorts.includes(shortKey)) continue; // don't update PK columns (short or fully qualified)
    updateBody[shortKey] = (rest as any)[k];
  }
  if (Object.keys(updateBody).length === 0) {
    throw new Error(`Singular PUT request for table (${restModel.TABLE_NAME}) must include at least one non-primary field to update.`);
  }

  const normalized: any = {
    [C6C.UPDATE]: updateBody,
    WHERE: { ...pkFullValues },
  };

  return {
    ...normalized,
    dataInsertMultipleRows,
    cacheResults,
    fetchDependencies,
    debug,
    success,
    error,
  } as any;
}
