import resolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import typescript from '@rollup/plugin-typescript';
import postcss from '@carbonorm/rollup-plugin-postcss';
import includePaths from 'rollup-plugin-includepaths';
import simpleVars from 'postcss-simple-vars';
import nested from 'postcss-nested';
import autoprefixer from 'autoprefixer';
import {readFileSync} from "fs";
import nodeResolve from "@rollup/plugin-node-resolve";

const pkg = JSON.parse(readFileSync('package.json', {encoding: 'utf8'}));
const config = JSON.parse(readFileSync('tsconfig.json', {encoding: 'utf8'}));

// @link https://stackoverflow.com/questions/63128597/how-to-get-rid-of-the-rollup-plugin-typescript-rollup-sourcemap-option-must
//const production = !process.env.ROLLUP_WATCH;


const plugins = [
	commonjs({
		namedExports: {
			// This is needed because react/jsx-runtime exports jsx on the module export.
			// Without this mapping the transformed import {jsx as _jsx} from 'react/jsx-runtime' will fail.
			'react/jsx-runtime': ['jsx', 'jsxs', 'Fragment'],
		},
	}),
	includePaths({
		paths: [
			config.compilerOptions.baseUrl
		]
	}),
	nodeResolve({
		'browser': true,
	}),
	resolve({
		extensions: ['.js', '.jsx', '.ts', '.tsx']
	}),

	typescript({
		sourceMap: true, // !production,
		inlineSources: false, // !production
	}),
	postcss({
		sourceMap: true,
		plugins: [
			autoprefixer(),
			simpleVars(),
			nested()
		],
		extensions: ['.css', '.scss'],
		extract: true,
		modules: {
			localsConvention: 'all',
			generateScopedName: '[hash:base64:7]',
		},
		syntax: 'postcss-scss',
		use: ['sass'],
	})
]

// noinspection JSUnresolvedReference
const externals = [
	...Object.keys(pkg.dependencies || {}),
	...Object.keys(pkg.devDependencies || {}),
	...Object.keys(pkg.peerDependencies || {}),
]

console.log('externals', externals)

const globals = []

externals.forEach((external) => {

	globals[external] = external

})

console.log(globals)

export default [
	{
		input: 'src/index.ts',
		external: [
			...externals,
			/^src\/api\/rest\/.+$/
		],
		plugins: plugins,
		output: [
			// browser-friendly UMD build
			//{name: 'CarbonReact', file: pkg.browser, format: 'umd', globals: globals, sourcemap: true},
			// CommonJS (for Node) and ES module (for bundlers) build.
			// (We could have three entries in the configuration array
			// instead of two, but it's quicker to generate multiple
			// builds from a single configuration where possible, using
			// an array for the `output` option, where we can specify
			// `file` and `format` for each target)
			{
				file: pkg.exports['.'].import,
				format: 'es', // ✅ this is the ES module
				globals,
				sourcemap: true
			},
			{
				file: pkg.exports['.'].require,
				format: 'cjs', // ✅ this is the CommonJS
				globals,
				sourcemap: true
			}
		]
	},

];
