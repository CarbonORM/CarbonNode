import {responseByteLimit, QuerySafetyConfig, MySqlCancellation} from './querySafety';

/** Count wire chunks before mysql2/pg packet parsers accumulate complete rows. */
export async function withSqlWireBudget<T>(connection: any, config: QuerySafetyConfig,
    run: () => Promise<T>, retire: () => void): Promise<T> {
    const stream = config.sqlResponseStream?.(connection) ?? connection.connection?.stream ?? connection.stream;
    const max = responseByteLimit(config);
    if (connection.connection?.config?.compress && !config.sqlResponseStream) {
        throw new Error('Compressed SQL transport requires a bounded decoded response stream.');
    }
    if (!stream?.prependListener || !stream?.removeListener || !stream?.destroy) {
        if (config.enforceSqlTransportBudget) throw new Error('SQL driver lacks a bounded response transport.');
        return run(); // Trusted custom executors may supply an externally bounded transport.
    }
    let bytes = 0, exceeded = false;
    let rejectBudget!: (reason: Error) => void;
    const budget = new Promise<never>((_resolve, reject) => {rejectBudget = reject;});
    const onData = (chunk: Uint8Array | string) => {
        bytes += typeof chunk === 'string' ? new TextEncoder().encode(chunk).length : chunk.byteLength;
        if (bytes <= max || exceeded) return;
        exceeded = true;
        const error = new Error('SQL response transport byte budget exceeded.');
        retire(); stream.pause?.(); stream.destroy(error); connection.destroy?.();
        rejectBudget(error);
    };
    stream.prependListener('data', onData);
    try {return await Promise.race([Promise.resolve().then(run), budget]);}
    finally {stream.removeListener('data', onData);}
}

async function reserveMySqlCancellation(connection: any, timeout: number, config: QuerySafetyConfig): Promise<MySqlCancellation> {
    if (config.mysqlCancellation) return config.mysqlCancellation(connection);
    const native = connection.connection ?? connection;
    const cfg = native.config, id = native.threadId;
    if (!cfg || !Number.isSafeInteger(id) || id < 1) throw new Error('MySQL mutation deadline requires a server cancellation channel.');
    const driver = await import('mysql2/promise');
    // An independent connection is reserved before DML; pool saturation cannot block cancellation.
    const control = await driver.createConnection({host: cfg.host, port: cfg.port, user: cfg.user,
        password: cfg.password, passwordSha1: cfg.passwordSha1, socketPath: cfg.socketPath,
        ssl: cfg.ssl, authPlugins: cfg.authPlugins, connectTimeout: Math.min(timeout, 5000)});
    return {
        cancel: async () => {await control.query({sql: 'KILL CONNECTION ?', timeout: Math.min(timeout, 5000)}, [id]);},
        close: async () => {control.destroy();},
    };
}

export async function withMySqlMutationDeadline<T>(connection: any, timeout: number, config: QuerySafetyConfig,
    run: () => Promise<T>, retire: () => void): Promise<T> {
    const control = await reserveMySqlCancellation(connection, timeout, config);
    let timedOut = false, cancellation: Promise<void> | undefined;
    let rejectDeadline!: (reason: Error) => void;
    const deadline = new Promise<never>((_resolve, reject) => {rejectDeadline = reject;});
    const timer = setTimeout(() => {
        timedOut = true;
        cancellation = (async () => {
            try {await control.cancel();}
            finally {retire(); connection.destroy?.();}
        })();
        void cancellation.then(() => rejectDeadline(new Error('MySQL statement deadline exceeded.')),
            () => rejectDeadline(new Error('Unable to cancel timed out MySQL statement.')));
    }, timeout);
    try {
        const result = await Promise.race([Promise.resolve().then(run), deadline]);
        if (timedOut) {await cancellation; throw new Error('MySQL statement deadline exceeded.');}
        return result;
    } catch (error) {
        if (timedOut) {
            try {await cancellation;} catch {throw new Error('Unable to cancel timed out MySQL statement.');}
            throw new Error('MySQL statement deadline exceeded.');
        }
        throw error;
    } finally {
        clearTimeout(timer);
        try {await cancellation?.catch(() => {});} finally {await control.close();}
    }
}
