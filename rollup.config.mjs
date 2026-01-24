import resolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import typescript from '@rollup/plugin-typescript';
import postcss from '@carbonorm/rollup-plugin-postcss';
import includePaths from 'rollup-plugin-includepaths';
import simpleVars from 'postcss-simple-vars';
import nested from 'postcss-nested';
import autoprefixer from 'autoprefixer';
import {readFileSync} from "fs";

const pkg = JSON.parse(readFileSync('package.json', {encoding: 'utf8'}));
const config = JSON.parse(readFileSync('tsconfig.json', {encoding: 'utf8'}));

const externals = [
	...Object.keys(pkg.dependencies || {}),
	...Object.keys(pkg.peerDependencies || {})
]

const sharedPlugins = [
	includePaths({
		paths: [
			config.compilerOptions.baseUrl
		]
	}),
	typescript({
		declaration: true,
		sourceMap: true
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

const esmBuild = {
	input: 'src/index.ts',
	external: [
		...externals,
		/^src\/__tests__\/.+$/
	],
	plugins: [
		resolve({
			exportConditions: ['import']
		}),
		...sharedPlugins
	],
	output: {
		file: pkg.exports['.'].import,
		format: 'es',
		sourcemap: true
	}
}

const cjsBuild = {
	input: 'src/index.ts',
	external: [
		...externals,
		/^src\/__tests__\/.+$/
	],
	plugins: [
		resolve({
			exportConditions: ['require']
		}),
		commonjs(),
		...sharedPlugins
	],
	output: {
		file: pkg.exports['.'].require,
		format: 'cjs',
		sourcemap: true,
		exports: 'named'
	}
}

export default [esmBuild, cjsBuild];
