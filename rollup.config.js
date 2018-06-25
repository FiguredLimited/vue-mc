import * as _ 	from 'lodash'
import babel 	from 'rollup-plugin-babel'
import resolve 	from 'rollup-plugin-node-resolve'
import commonjs from 'rollup-plugin-commonjs'
import pkg 	    from './package.json'

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
			plugins: ['@babel/plugin-external-helpers'],
			presets: [['@babel/preset-env', {
				targets: {
				  browsers: [
					'>0.25%',
					'not ie 10',
					'not op_mini all'
				  ]
				}
			}]],
			exclude: [
				'node_modules/**'
			]
		}),
	]
}

const MAIN = _.assign({}, BASE, {
	input: 'src/index.js',
	output: [
		{ file: pkg.main,    format: 'cjs' },
		{ file: pkg.module,  format: 'es' }
	],
})

const VALIDATION = _.assign({}, BASE, {
	input: 'src/validation/index.js',
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
