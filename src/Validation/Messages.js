import _ from 'lodash';

/**
 * Validation error messages.
 */
const messages = {
    after: 'Must be after ${date}',
    alpha: 'Can only use letters',
    alphanumeric: 'Must be alphanumeric',
    array: 'Must be an array',
    ascii: 'Must be ASCII',
    base64: 'Must be valid Base64',
    before: 'Must be before ${date}',
    between: 'Must be between ${min} and ${max}',
    between_inclusive: 'Must be between ${min} and ${max}, inclusive',
    boolean: 'Must be true or false',
    creditcard: 'Must be a valid credit card number',
    date: 'Must be a valid date',
    dateformat: 'Must use "${format}" format',
    defined: 'Required',
    email: 'Must be a valid email address',
    empty: 'Must be empty',
    equals: 'Must be equal to ${other}',
    gt: 'Must be greater than ${min}',
    gte: 'Must be greater than or equal to ${min}',
    integer: 'Must be an integer',
    ip: 'Must be a valid IP address',
    isblank: 'Must be a blank',
    isnil: 'Must be null or undefined',
    isnull: 'Must be null',
    iso8601: 'Must be a valid ISO8601 date',
    json: 'Must be a valid JSON',
    length: 'Must have a length of at least ${min}',
    length_between: 'Must have a length between ${min} and ${max}',
    lt: 'Must be less than ${max}',
    lte: 'Must be less than or equal to ${max}',
    match: 'Must match "${pattern}"',
    negative: 'Must be a negative number',
    not: 'Can not be ${value}',
    number: 'Must be a number',
    numeric: 'Must be numeric',
    object: 'Must be an object',
    positive: 'Must be a positive number',
    required: 'Required',
    same: 'Must have the same value as "${other}"',
    string: 'Must be a string',
    url: 'Must be a valid URL',
    uuid: 'Must be a valid UUID',
};

/**
 * Current locale.
 */
let _locale = null;

/**
 * Registered locale storage
 */
let _locales = {};

/**
 * Sets the active locale.
 *
 * @param {string} locale
 */
function locale(locale) {
    _locale = _.toLower(locale);
}

/**
 * Registers a locale bundle.
 */
function register(bundle) {
    _.set(_locales, _.toLower(bundle.locale), _.get(bundle, 'messages', {}));
}

/**
 * @returns {Object} The best message container for the given name.
 */
function find(name) {
    if (_locale) {
        if (_locale in _locales && name in _locales[_locale]) {
            return _locales[_locale];
        }

        // Attempt to use a base locale, eg. 'en' when the locale is 'en-US'.
        let language = _.split(_locale, '-')[0];

        if (language in _locales && name in _locales[language]) {
            return _locales[language];
        }
    }

    return messages;
}

/**
 * Replaces or adds a new message for a given name and optional locale.
 *
 * @param {string} name
 * @param {string} format
 */
function set(name, format, locale) {
    if (locale) {
        _.set(_locales, [locale, name], format);
    } else {
        _.set(messages, name, format);
    }
}

/**
 * Returns a formatted string for a given message name and context data.
 *
 * @param {string} name
 * @param {Object} data
 *
 * @returns {string} The formatted message.
 */
function get(name, data = {}) {
    let bundle = find(name);
    let format = _.get(bundle, name, false);

    // Fall back to a blank string so that we don't potentially
    // leak message names or context data into the template.
    if (format === false) {
        return '';
    }

    // Compile the a template and replace if
    if (_.isString(format)) {
        _.set(bundle, name, format = _.template(format));
    }

    return format(data);
}

export default {
    get,
    set,
    locale,
    register,
}
