import * as _ 	from 'lodash'
import babel 	from 'rollup-plugin-babel'
import resolve 	from 'rollup-plugin-node-resolve'
import commonjs from 'rollup-plugin-commonjs'
import pkg 	    from './package.json'

const BASE = {
	external: [
		'lodash',
		'vue',
		'axios'
	],
	plugins: [
		resolve(),
		commonjs(),
		babel({
			exclude: ['node_modules/**/*'],
			babelrc: false,
			plugins: [],
			presets: [["@babel/preset-env", {modules: false}]],
		}),
	]
}

const MAIN = _.assign({}, BASE, {
	input: 'src/index.js',
	output: [
		{ file: pkg.main,    format: 'cjs', sourcemap: 'inline' },
		{ file: pkg.module,  format: 'es', sourcemap: 'inline' }
	],
})

const VALIDATION = _.assign({}, BASE, {
	input: 'src/Validation/index.js',
	output: [
		{ file: 'validation/index.js', format: 'cjs' },
	],
})

const LOCALES = _.assign({}, BASE, {
	input: './src/Validation/locale.js',
	output: [
		{ file: 'validation/locale.js', format: 'cjs' },
	],
})

export default [
	MAIN,
	VALIDATION,
	LOCALES,
]
