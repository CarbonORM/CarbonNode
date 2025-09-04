import {Request, Response, NextFunction} from "express";
import {Pool} from "mysql2/promise";
import {C6C} from "../C6Constants";
import restRequest from "../restRequest"; // adjust path as needed
import {iC6Object, iRestMethods} from "../types/ormInterfaces";


// TODO - WE MUST make this a generic - optional, but helpful
// note sure how it would help anyone actually...
export function ExpressHandler({C6, mysqlPool}: { C6: iC6Object, mysqlPool: Pool }) {

    return async (req: Request, res: Response, next: NextFunction) => {
        try {
            const method = req.method.toUpperCase() as iRestMethods;
            const table = req.params.table;
            const primary = req.params.primary;
            const payload = method === 'GET' ? req.query : req.body;

            if (!(table in C6.TABLES)) {
                res.status(400).json({error: `Invalid table: ${table}`});
                return;
            }

            const primaryKeys = C6.TABLES[table].PRIMARY;

            if (primary && primaryKeys.length !== 1) {
                if (primaryKeys.length > 1) {
                    res.status(400).json({error: `Table ${table} has multiple primary keys. Cannot implicitly determine key.`});
                    return;
                }
                res.status(400).json({
                    error: `Table ${table} has no primary keys. Please specify one.`
                });
                return;
            }

            const primaryKeyName = primaryKeys[0];

            if (!(payload[C6C.WHERE]?.[primaryKeyName] ?? undefined)) {
                // 👇 Call restRequest for the resolved method
                switch (method) {
                    case 'GET':
                        if (primary) {
                            payload[C6C.WHERE][primaryKeyName] = primary;
                        }
                        break;
                    case 'PUT':
                    case 'DELETE':
                        if (primary) {
                            payload[C6C.WHERE][primaryKeyName] = primary;
                        } else {
                            res.status(400).json({error: `Invalid request: ${method} requires a primary key (${primaryKeyName}).`});
                        }
                        break;
                    case 'POST':
                        break;
                    default:
                        res.status(405).json({error: `Method ${method} not allowed`});
                        return;
                }
            }

            const response = await restRequest({
                C6,
                mysqlPool,
                requestMethod: method,
                restModel: C6.TABLES[table]
            })(payload);

            res.status(200).json({success: true, ...response});

        } catch (err) {
            res.status(500).json({success: false, error: err});
            next(err);
        }
    };
}
