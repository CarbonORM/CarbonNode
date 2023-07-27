import resolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import typescript from '@rollup/plugin-typescript';

import { readFileSync } from "fs";
const pkg = JSON.parse(readFileSync('package.json', {encoding: 'utf8'}));


// @link https://stackoverflow.com/questions/63128597/how-to-get-rid-of-the-rollup-plugin-typescript-rollup-sourcemap-option-must
const production = !process.env.ROLLUP_WATCH;


export default [
	// browser-friendly UMD build
	{
		input: 'src/index.ts',
		output: {
			name: 'howLongUntilLunch',
			file: pkg.browser,
			format: 'umd',
			globals: {
				ms: 'ms',
			}
		},
		plugins: [
			resolve({
				extensions: ['.js', '.svelte', '.jsx', '.ts', '.tsx']
			}),
			commonjs(),
			typescript({
				sourceMap: !production,
				inlineSources: !production
			})
		]
	},

	// CommonJS (for Node) and ES module (for bundlers) build.
	// (We could have three entries in the configuration array
	// instead of two, but it's quicker to generate multiple
	// builds from a single configuration where possible, using
	// an array for the `output` option, where we can specify
	// `file` and `format` for each target)
	{
		input: 'src/index.ts',
		external: ['ms'],
		plugins: [
			resolve({
				extensions: ['.js', '.svelte', '.jsx', '.ts', '.tsx']
			}),
			commonjs(),
			typescript({
				sourceMap: !production,
				inlineSources: !production
			})
		],
		output: [
			{ file: pkg.main, format: 'cjs' },
			{ file: pkg.module, format: 'es' }
		]
	}
];
