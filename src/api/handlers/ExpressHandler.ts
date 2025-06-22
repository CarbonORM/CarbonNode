import {Request, Response, NextFunction} from "express";
import {Pool} from "mysql2/promise";
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


            // 👇 Call restRequest for the resolved method
            // TODO - add primary conditionally based on method signature
            switch (method) {
                case 'GET':
                    if (primary) {
                        payload['primary'] = primary;
                    }
                    break;
                case 'POST':
                case 'PUT':
                case 'DELETE':
                    payload['primary'] = primary;
                    break;
                default:
                    res.status(405).json({error: `Method ${method} not allowed`});
                    return;
            }
            const response = await restRequest({
                C6,
                mysqlPool,
                requestMethod: method,
                restModel: C6.TABLES[table]
            })(payload);

            console.log('response', JSON.stringify(response));

            res.status(200).json({success: true, ...response});
        } catch (err) {
            next(err);
        }
    };
}
