import * as _ from 'lodash';
import resolve from 'rollup-plugin-node-resolve';
import commonjs from 'rollup-plugin-commonjs';
import pkg from './package.json';
import typescript from 'typescript';
import ts_plugin2 from 'rollup-plugin-typescript2';

const BASE = {
    external: [
        'lodash',
        'vue',
        'axios',
    ],
    plugins: [
        resolve(),
        commonjs(),
        ts_plugin2({
            typescript,
            useTsconfigDeclarationDir: true,
        }),
    ],
};

const MAIN = _.assign({}, BASE, {
    input: 'src/index.ts',
    output: [
        {file: pkg.main, format: 'cjs'},
        {file: pkg.module, format: 'es'},
    ],
});

const VALIDATION = _.assign({}, BASE, {
    input: 'src/Validation/index.ts',
    output: [
        {file: 'validation/index.js', format: 'cjs'},
    ],
});

const LOCALES = _.assign({}, BASE, {
    input: './src/Validation/locale.ts',
    output: [
        {file: 'validation/locale.js', format: 'cjs'},
    ],
});

export default [
    MAIN,
    VALIDATION,
    LOCALES,
];
