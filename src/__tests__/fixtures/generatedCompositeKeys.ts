import {Group_Permissions, type PK_group_permissions} from '../sakila-db/C6.js';
import type {PK_shape} from '../../utils/primaryKeys';

const group_id = Buffer.alloc(16);
const permission_id = Buffer.alloc(16);
const identity: PK_group_permissions = {group_id, permission_id};
const shape: PK_shape<{group_id?: Buffer; permission_id?: Buffer}, 'group_id' | 'permission_id'> = identity;
void shape;
// @ts-expect-error Every composite identity column is required.
const missing: PK_group_permissions = {group_id};
void missing;
// @ts-expect-error Binary database key shapes use Buffer.
const invalid: PK_group_permissions = {group_id: 'abc', permission_id};
void invalid;
const columns: readonly ['group_permissions.group_id', 'group_permissions.permission_id'] = Group_Permissions.PRIMARY;
void columns;
void Group_Permissions.Update({group_permissions: identity, effect: 'DENY'});
void Group_Permissions.Put({group_permissions: {...identity, effect: 'ALLOW', created_by: group_id}});
void Group_Permissions.Delete({group_permissions: identity});
