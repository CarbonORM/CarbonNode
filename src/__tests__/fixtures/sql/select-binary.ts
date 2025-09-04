import { C6C } from '../../../api/C6Constants';
import { Buffer } from 'node:buffer';

export default {
  description: 'converts hex to Buffer for BINARY columns in WHERE params',
  method: C6C.GET,
  table: 'actor',
  rest: {
    [C6C.WHERE]: {
      'actor.binarycol': [C6C.EQUAL, '0123456789abcdef0123456789abcdef'],
    },
  },
  expected: {
    sqlIncludes: ['WHERE (actor.binarycol) = ?'],
    params: [Buffer.from('0123456789abcdef0123456789abcdef', 'hex')],
  },
} as const;
