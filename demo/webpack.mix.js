const mix = require('laravel-mix');

mix
    .js('resources/assets/app.js', 'public/js')
    .extract(['vue', 'lodash'])
;
