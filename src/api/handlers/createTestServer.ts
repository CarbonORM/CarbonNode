import express, {Express} from "express";
import {Pool} from "mysql2/promise";
import {iC6Object} from "api/types/ormInterfaces";
import {ExpressHandler} from "./ExpressHandler";

export function createTestServer({C6, mysqlPool}: {C6: iC6Object; mysqlPool: Pool;}): Express {
    const app = express();
    app.use(express.json());
    app.all("/rest/:table", ExpressHandler({C6, mysqlPool}));
    app.all("/rest/:table/:primary", ExpressHandler({C6, mysqlPool}));
    return app;
}

export default createTestServer;
