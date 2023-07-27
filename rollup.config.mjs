import resolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import typescript from '@rollup/plugin-typescript';

import { readFileSync } from "fs";
const pkg = JSON.parse(readFileSync('package.json', {encoding: 'utf8'}));

// @link https://stackoverflow.com/questions/63128597/how-to-get-rid-of-the-rollup-plugin-typescript-rollup-sourcemap-option-must
const production = !process.env.ROLLUP_WATCH;

const plugins = [
	resolve({
		extensions: ['.js', '.svelte', '.jsx', '.ts', '.tsx']
	}),
	commonjs(),
	typescript({
		sourceMap: !production,
		inlineSources: !production
	})
]

// noinspection JSUnresolvedReference
const externals = Object.keys(pkg.peerDependencies)

console.log('externals',externals)

const globals = []

externals.forEach((external) => {

	globals[external] = external

})

console.log(globals)

export default [
	// browser-friendly UMD build
	{
		input: 'src/index.ts',
		external: externals,
		output: {
			name: 'carbonNode',
			file: pkg.browser,
			format: 'umd',
			globals: globals
		},
		plugins: plugins
	},

	// CommonJS (for Node) and ES module (for bundlers) build.
	// (We could have three entries in the configuration array
	// instead of two, but it's quicker to generate multiple
	// builds from a single configuration where possible, using
	// an array for the `output` option, where we can specify
	// `file` and `format` for each target)
	{
		input: 'src/index.ts',
		external: externals,
		plugins: plugins,
		output: [
			{ file: pkg.main, format: 'cjs' },
			{ file: pkg.module, format: 'es' }
		]
	}
];
