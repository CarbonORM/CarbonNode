import { C6C } from '../../../api/C6Constants';

export default {
  description: 'builds SELECT with JOIN, WHERE, GROUP BY, HAVING and default LIMIT',
  method: C6C.GET,
  table: 'actor',
  rest: {
    [C6C.SELECT]: ['actor.first_name', [C6C.COUNT, 'actor.actor_id', C6C.AS, 'cnt']],
    [C6C.JOIN]: {
      [C6C.INNER]: {
        'film_actor fa': {
          'fa.actor_id': [C6C.EQUAL, 'actor.actor_id'],
        },
      },
    },
    [C6C.WHERE]: {
      'actor.first_name': [C6C.LIKE, '%A%'],
      0: {
        'actor.actor_id': [C6C.GREATER_THAN, 10],
      },
    },
    [C6C.GROUP_BY]: 'actor.first_name',
    [C6C.HAVING]: {
      cnt: [C6C.GREATER_THAN, 1],
    },
  },
  expected: {
    sqlIncludes: [
      'SELECT actor.first_name, COUNT(actor.actor_id) AS cnt FROM `actor`',
      'INNER JOIN `film_actor` AS `fa` ON',
      '(actor.first_name) LIKE ?',
      '(actor.actor_id) > ?',
      'GROUP BY actor.first_name',
      'HAVING',
      'LIMIT 100',
    ],
    params: ['%A%', 10, 1],
  },
} as const;
