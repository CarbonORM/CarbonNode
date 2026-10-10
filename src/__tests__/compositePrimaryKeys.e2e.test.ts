import {afterAll, beforeAll, beforeEach, describe, expect, it, vi} from 'vitest';
import {randomBytes} from 'crypto';
import type {Server} from 'http';
import mysql from 'mysql2/promise';
import axios from 'axios';
import {C6C} from '../constants/C6Constants';
import {UpdateQueryBuilder} from '../orm/queries/UpdateQueryBuilder';
import {DeleteQueryBuilder} from '../orm/queries/DeleteQueryBuilder';
import express from 'express';
import {restExpressRequest, restOrm} from '@carbonorm/carbonnode';
import {C6, GLOBAL_REST_PARAMETERS, Group_Permissions, Actor} from './sakila-db/C6.js';
import type {PK_group_permissions} from './sakila-db/C6.generated/tables/Group_Permissions';

describe('composite BINARY primary keys against MySQL and REST', () => {
    let pool: mysql.Pool;
    let server: Server;
    let baseURL: string;
    let client: ReturnType<typeof restOrm>;
    const group_id = randomBytes(16);
    const permission_id = randomBytes(16);
    const sibling = randomBytes(16);
    const userId = randomBytes(16);
    const identity: PK_group_permissions = {group_id, permission_id};
    const hexIdentity = {group_id: group_id.toString('hex'), permission_id: permission_id.toString('hex')};
    const required = ['group_id', 'permission_id'];
    const where = {
        'group_permissions.group_id': group_id,
        'group_permissions.permission_id': permission_id,
    };

    beforeAll(async () => {
        pool = mysql.createPool({host: '127.0.0.1', user: 'root', password: 'password', database: 'sakila'});
        GLOBAL_REST_PARAMETERS.mysqlPool = pool;
        const app = express();
        app.set('query parser', 'extended');
        app.use(express.json());
        restExpressRequest({router: app, C6, mysqlPool: pool});
        server = app.listen(0, '127.0.0.1');
        await new Promise<void>(resolve => server.once('listening', resolve));
        baseURL = `http://127.0.0.1:${(server.address() as any).port}/rest/`;
        client = restOrm(() => ({C6, restModel: C6.TABLES.group_permissions, restURL: baseURL,
            axios: axios.create(), skipPrimaryCheck: false, logLevel: 'silent'} as any));
    });
    beforeEach(async () => {
        await pool.query('DELETE FROM group_permissions WHERE group_id = ?', [group_id]);
        await pool.query('INSERT INTO group_permissions (group_id, permission_id, effect, created_by) VALUES (?, ?, ?, ?), (?, ?, ?, ?)',
            [group_id, permission_id, 'ALLOW', userId, group_id, sibling, 'ALLOW', userId]);
    });
    afterAll(async () => {
        if (pool) {
            await pool.query('DELETE FROM group_permissions WHERE group_id = ?', [group_id]);
            await pool.end();
        }
        if (server) await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
        delete GLOBAL_REST_PARAMETERS.mysqlPool;
    });
    async function effects() {
        const [rows] = await pool.query<mysql.RowDataPacket[]>('SELECT HEX(permission_id) AS permission_id, effect FROM group_permissions WHERE group_id = ?', [group_id]);
        return Object.fromEntries(rows.map(row => [row.permission_id.toLowerCase(), row.effect]));
    }
    it('generates ordered metadata and reads the exact composite identity', async () => {
        expect(Group_Permissions.PRIMARY_SHORT).toEqual(required);
        expect(Group_Permissions.PRIMARY).toEqual(required.map(key => `group_permissions.${key}`));
        const response = await Group_Permissions.Get({group_permissions: identity});
        expect(response.rest).toHaveLength(1);
        expect(String(response.rest[0].group_id).toLowerCase()).toBe(hexIdentity.group_id);
    });
    it('PATCH/Update infers every key and leaves its sibling unchanged', async () => {
        const response = await Group_Permissions.Update({group_permissions: identity, effect: 'DENY'});
        expect(response.affected).toBe(1);
        expect(await effects()).toEqual({[permission_id.toString('hex')]: 'DENY', [sibling.toString('hex')]: 'ALLOW'});
    });
    it('supports explicit WHERE and SET with Buffer keys', async () => {
        await Group_Permissions.Update({[C6C.WHERE]: where, [C6C.SET]: {'group_permissions.effect': 'DENY'}} as any);
        expect(await effects()).toEqual({[permission_id.toString('hex')]: 'DENY', [sibling.toString('hex')]: 'ALLOW'});
    });
    it('PUT upserts the compound identity without replacing an existing row', async () => {
        const [before]: any = await pool.query('SELECT created_at FROM group_permissions WHERE group_id = ? AND permission_id = ?', [group_id, permission_id]);
        await Group_Permissions.Put({group_permissions: {...identity, effect: 'DENY', created_by: userId}});
        const [after]: any = await pool.query('SELECT created_at FROM group_permissions WHERE group_id = ? AND permission_id = ?', [group_id, permission_id]);
        expect(after[0].created_at).toEqual(before[0].created_at);
        expect(await effects()).toEqual({[permission_id.toString('hex')]: 'DENY', [sibling.toString('hex')]: 'ALLOW'});
        const other = randomBytes(16);
        await Group_Permissions.Put({group_permissions: {group_id, permission_id: other, effect: 'ALLOW', created_by: userId}});
        expect((await effects())[other.toString('hex')]).toBe('ALLOW');
    });
    it('DELETE infers every key and leaves its sibling intact', async () => {
        const result = await Group_Permissions.Delete({group_permissions: identity});
        expect(result.affected).toBe(1);
        expect(await effects()).toEqual({[sibling.toString('hex')]: 'ALLOW'});
    });
    it('direct builders bind both key columns in order', () => {
        const config: any = {C6, restModel: C6.TABLES.group_permissions, requestMethod: 'PATCH'};
        const update = new UpdateQueryBuilder(config, {group_permissions: identity, effect: 'DENY'} as any).build('group_permissions');
        expect(update.sql).toMatch(/WHERE.*group_id.*\?.*AND.*permission_id.*\?/s);
        expect(update.params).toEqual(['DENY', group_id, permission_id]);
        const remove = new DeleteQueryBuilder(config, {group_permissions: identity} as any).build('group_permissions');
        expect(remove.params).toEqual([group_id, permission_id]);
    });
    it('HTTP client preserves Buffer keys for GET/PATCH/PUT/DELETE', async () => {
        expect((await client.Get({group_permissions: identity})).rest).toHaveLength(1);
        await client.Update({group_permissions: identity, effect: 'DENY'});
        expect((await effects())[permission_id.toString('hex')]).toBe('DENY');
        await client.Update({[C6C.WHERE]: where, [C6C.SET]: {'group_permissions.effect': 'ALLOW'}} as any);
        expect((await effects())[permission_id.toString('hex')]).toBe('ALLOW');
        await client.Put({group_permissions: {...identity, effect: 'DENY', created_by: userId}});
        await client.Delete({group_permissions: identity});
        expect(await effects()).toEqual({[sibling.toString('hex')]: 'ALLOW'});
    });
    it('built REST handler infers complete nested keys without client preprocessing', async () => {
        const url = baseURL + 'group_permissions';
        const read = await axios.get(url, {params: {group_permissions: hexIdentity}});
        expect(read.data.rest).toHaveLength(1);
        await axios.patch(url, {group_permissions: hexIdentity, effect: 'DENY'});
        expect((await effects())[permission_id.toString('hex')]).toBe('DENY');
        await axios.put(url, {group_permissions: {...hexIdentity, effect: 'ALLOW', created_by: userId.toString('hex')}});
        expect((await effects())[permission_id.toString('hex')]).toBe('ALLOW');
        await axios.delete(url, {data: {group_permissions: hexIdentity}});
        expect(await effects()).toEqual({[sibling.toString('hex')]: 'ALLOW'});
    });
    it('keeps every key in client state updates and deletes after normalization', async () => {
        const state = {updateRestfulObjectArrays: vi.fn(), deleteRestfulObjectArrays: vi.fn()};
        const stateful = restOrm(() => ({C6, restModel: C6.TABLES.group_permissions, restURL: baseURL,
            axios: axios.create(), reactBootstrap: state, skipPrimaryCheck: false} as any));
        await stateful.Update({group_permissions: hexIdentity, effect: 'DENY'});
        expect(state.updateRestfulObjectArrays.mock.calls[0][0]).toMatchObject({
            uniqueObjectId: required, dataOrCallback: [{...hexIdentity, effect: 'DENY'}],
        });
        await stateful.Delete({group_permissions: hexIdentity});
        expect(state.deleteRestfulObjectArrays.mock.calls[0][0]).toMatchObject({
            uniqueObjectId: required, dataOrCallback: [hexIdentity],
        });
    });
    it('single-column PUT remains an update and supports the new PATCH method', async () => {
        const inserted = await Actor.Post({first_name: 'CompositeTest', last_name: 'Regression'});
        const actor_id = Number(inserted.insertId);
        try {
            const updated = await Actor.Put({actor_id, first_name: 'LegacyPut'});
            expect(updated.affected).toBe(1);
            const actorClient = restOrm(() => ({C6, restModel: C6.TABLES.actor, restURL: baseURL,
                axios: axios.create(), skipPrimaryCheck: false} as any));
            await actorClient.Update({actor_id, first_name: 'Patched'});
            const read = await Actor.Get({actor_id});
            expect(read.rest[0].first_name).toBe('Patched');
        } finally {
            await pool.query('DELETE FROM actor WHERE actor_id = ?', [actor_id]);
        }
    });
    it.each(['get', 'patch', 'put', 'delete'] as const)('raw REST %s returns 422 with the required columns for incomplete identities', async method => {
        const response = await axios.request({method, url: baseURL + 'group_permissions',
            ...(method === 'get' ? {params: {group_permissions: {group_id: hexIdentity.group_id}}}
                : {data: {group_permissions: {group_id: hexIdentity.group_id}, effect: 'DENY'}}),
            validateStatus: () => true});
        expect(response.status).toBe(422);
        expect(response.data).toMatchObject({success: false, error: 'CompositePrimaryKeyMissingColumns', requiredColumns: required, missingColumns: ['permission_id']});
        expect(response.data.message).toContain('group_id, permission_id');
        expect(Object.keys(await effects())).toHaveLength(2);
    });
    it.each(['Get', 'Update', 'Put', 'Delete'] as const)('SQL/client %s rejects incomplete keys before execution', async method => {
        await expect(Group_Permissions[method]({group_permissions: {group_id}, effect: 'DENY'} as any)).rejects.toMatchObject({name: 'CompositePrimaryKeyMissingColumns', status: 422, missingColumns: ['permission_id']});
        await expect(client[method]({group_permissions: {group_id}, effect: 'DENY'} as any)).rejects.toMatchObject({status: 422, code: 'CompositePrimaryKeyMissingColumns'});
    });
    it('retains explicit predicates for queries without body PK fields', async () => {
        const response = await Group_Permissions.Get({[C6C.WHERE]: {'group_permissions.group_id': [C6C.EQUAL, [C6C.LIT, group_id]]}} as any);
        expect(response.rest).toHaveLength(2);
    });
    it('returns 422 for an explicitly null GET identity rather than reading the collection', async () => {
        await expect(client.Get({group_permissions: {group_id: null}} as any)).rejects.toMatchObject({
            code: 'CompositePrimaryKeyMissingColumns', missingColumns: required,
        });
        const response = await axios.post(baseURL + 'group_permissions?METHOD=GET',
            {group_permissions: {group_id: null}}, {validateStatus: () => true});
        expect(response.status).toBe(422);
        expect(response.data.missingColumns).toEqual(required);
    });
});
