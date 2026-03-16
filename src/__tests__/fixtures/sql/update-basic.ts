import { C6C } from '../../../api/C6Constants';

export default {
  description: 'builds UPDATE with WHERE and pagination',
  method: C6C.PUT,
  table: 'actor',
  rest: {
    [C6C.UPDATE]: {
      'first_name': 'ALICE',
    },
    [C6C.WHERE]: {
      'actor.actor_id': [C6C.EQUAL, 5],
    },
    [C6C.PAGINATION]: { [C6C.LIMIT]: 1 },
  },
  expected: {
    sqlIncludes: [
      'UPDATE `actor` SET',
      '`first_name` = ?',
      'WHERE (actor.actor_id) = ?',
      'LIMIT 1',
    ],
    params: ['ALICE', 5],
  },
} as const;
