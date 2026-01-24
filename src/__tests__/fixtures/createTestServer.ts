import express, {Express} from "express";
import {Pool} from "mysql2/promise";
import {iC6Object} from "../../types/ormInterfaces";
import {ExpressHandler} from "../../handlers/ExpressHandler";

export function createTestServer({
    C6,
    mysqlPool,
    sqlAllowListPath,
}: {
    C6: iC6Object;
    mysqlPool: Pool;
    sqlAllowListPath?: string;
}): Express {
    const app = express();
    app.set('query parser', 'extended');
    app.use(express.json());
    app.all("/rest/:table", ExpressHandler({C6, mysqlPool, sqlAllowListPath}));
    app.all("/rest/:table/:primary", ExpressHandler({C6, mysqlPool, sqlAllowListPath}));
    return app;
}

export default createTestServer;
