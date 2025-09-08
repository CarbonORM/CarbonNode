import { C6C } from '../../../api/C6Constants';

export default {
  description: 'builds DELETE with JOIN and WHERE',
  method: C6C.DELETE,
  table: 'actor',
  rest: {
    [C6C.JOIN]: {
      [C6C.INNER]: {
        'film_actor fa': {
          'fa.actor_id': [C6C.EQUAL, 'actor.actor_id'],
        },
      },
    },
    [C6C.WHERE]: {
      'actor.actor_id': [C6C.GREATER_THAN, 100],
    },
  },
  expected: {
    sqlIncludes: [
      'DELETE `actor` FROM `actor`',
      'INNER JOIN `film_actor` AS `fa` ON',
      '(actor.actor_id) > ?',
    ],
    params: [100],
  },
} as const;
