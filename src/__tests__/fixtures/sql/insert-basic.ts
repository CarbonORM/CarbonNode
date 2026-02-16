import { C6C } from '../../../api/C6Constants';

export default {
  description: 'builds INSERT with ON DUPLICATE KEY UPDATE',
  method: C6C.POST,
  table: 'actor',
  rest: {
    [C6C.REPLACE]: {
      'actor.first_name': 'BOB',
      'actor.last_name': 'SMITH',
    },
    [C6C.UPDATE]: ['first_name', 'last_name'],
  },
  expected: {
    sqlIncludes: [
      'REPLACE INTO `actor`',
      '`first_name`, `last_name`',
      'ON DUPLICATE KEY UPDATE `first_name` = VALUES(`first_name`), `last_name` = VALUES(`last_name`)',
    ],
    params: ['BOB', 'SMITH'],
  },
} as const;
