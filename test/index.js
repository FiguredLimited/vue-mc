import _ from 'lodash'
import axios from 'axios'
import moment from 'moment'
import Vue from 'vue'
import {assert, expect} from 'chai'
import moxios from 'moxios'

// Emulate browser globals
global._ = _;
global.axios = axios;
global.moment = moment;
global.Vue = Vue;

// Fail if there's an unhandled promise rejection warning.
process.on('unhandledRejection', (error, promise) => {
    console.error('Unhandled promise rejection', {error, promise})
    process.exit(1);
});

//
require('./Structures/Model.spec.js');
require('./Structures/Collection.spec.js')

//
require('./Validation/rule.spec.js')
require('./Validation/rules.spec.js')
require('./Validation/messages.spec.js')

//
require('./HTTP/ProxyResponse.spec.js')

//
require('./Errors/RequestError.spec.js')
require('./Errors/ResponseError.spec.js')
require('./Errors/ValidationError.spec.js')
