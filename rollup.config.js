import babel 	from 'rollup-plugin-babel'
import resolve 	from 'rollup-plugin-node-resolve'
import commonjs from 'rollup-plugin-commonjs'

const config = [

	// CommonJS (for Node) and ES module (for bundlers) build.
	// (We could have three entries in the configuration array
	// instead of two, but it's quicker to generate multiple
	// builds from a single configuration where possible, using
	// the `targets` option which can specify `dest` and `format`)
	{
		entry: 'src/index.js',
		external: [
			'lodash',
			'vue',
			'axios',
		],
		targets: [
			{ dest: 'dist/index.js', format: 'es' }
		],
		plugins: [
			resolve(),
			commonjs(),
			babel({
				babelrc: false,
				plugins: ["external-helpers", "transform-decorators-legacy"],
				presets: [],
				exclude: [
					'node_modules/**'
				]
			}),
		]
	},

	{
		entry: 'src/Validation/Rules.js',
		external: [
			'lodash',
			'moment',
		],
		targets: [
			{ dest: 'dist/validation/index.js', format: 'es' },
		],
		plugins: [
			resolve(),
			commonjs(),
			babel({
				babelrc: false,
				plugins: ["external-helpers"],
				presets: [],
				exclude: [
					'node_modules/**'
				]
			}),
		]
	},

	{
		entry: 'src/Validation/Locales.js',
		targets: [
			{ dest: 'dist/locale/index.js', format: 'es' },
		],
		plugins: [
			resolve(),
			commonjs(),
			babel({
				babelrc: false,
				plugins: ["external-helpers"],
				presets: [],
				exclude: [
					'node_modules/**'
				]
			}),
		]
	}
];


export default config;
