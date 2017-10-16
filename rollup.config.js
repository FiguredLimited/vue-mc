import _ 	    from 'lodash'
import babel 	from 'rollup-plugin-babel'
import resolve 	from 'rollup-plugin-node-resolve'
import commonjs from 'rollup-plugin-commonjs'
import pkg 		from './package.json'

const BASE = {
	external: [
		'lodash',
		'vue',
		'axios',
		'moment',
	],
	plugins: [
		resolve(),
		commonjs(),
		babel({
			babelrc: false,
			plugins: ["external-helpers"],
			presets: [["es2015", {modules: false}]],
			exclude: [
				'node_modules/**'
			]
		}),
	]
}

/**
 * Browser-friendly build.
 */
const MAIN = _.assign({}, BASE, {
	input: 'src/index.js',
	output: [
		{ file: pkg.main,    format: 'cjs' },
		{ file: pkg.module,  format: 'es' }
	],
})

/**
 *
 */
const VALIDATION = _.assign({}, BASE, {
	input: 'src/Validation/index.js',
	output: [
		{ file: 'validation/index.js', format: 'es' },
	],
})

/**
 *
 */
const LOCALES = _.assign({}, BASE, {
	input: './src/Validation/locale.js',
	output: [
		{ file: 'validation/locale.js', format: 'es' },
	],
})


export default [
	MAIN,
	VALIDATION,
	LOCALES,
]
