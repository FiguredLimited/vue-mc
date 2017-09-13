import _                from 'lodash'
import moment           from 'moment'
import isAlpha          from 'validator/lib/isAlpha'
import isAlphanumeric   from 'validator/lib/isAlphanumeric'
import isBase64         from 'validator/lib/isBase64'
import isCreditCard     from 'validator/lib/isCreditCard'
import isEmail          from 'validator/lib/isEmail'
import isIP             from 'validator/lib/isIP'
import isISO8601        from 'validator/lib/isISO8601'
import isJSON           from 'validator/lib/isJSON'
import isURL            from 'validator/lib/isURL'
import isUUID           from 'validator/lib/isUUID'

// Used to create the rules.
import rule from './Rule.js';

/**
 * Checks if the value is after a given date string or `moment` object.
 */
function after(date) {
    return rule({
        name: 'after',
        data: {date},
        test: (value) => {
            return moment(value).isAfter(date)
        },
    })
}

/**
 * Checks if a value only has letters.
 */
const alpha = rule({
    name: 'alpha',
    test: (value) => {
        return _.isString(value) && isAlpha(_.deburr(value));
    },
})

/**
 * Checks if a value only has letters or numbers.
 */
const alphanumeric = rule({
    name: 'alphanumeric',
    test: (value) => {
        return _.isString(value) && isAlphanumeric(_.deburr(value));
    },
})

/**
 * Checks if a value is an array.
 */
const array = rule({
    name: 'array',
    test: _.isArray,
})


/**
 * Checks if a value is a string consisting only of ASCII characters.
 */
const ascii = rule({
    name: 'ascii',
    test: (value) => _.isString(value) && /^[\x00-\x7F]+$/.test(value),
})

/**
 * Checks if a value is a valid Base64 string.
 */
const base64 = rule({
    name: 'base64',
    test: (value) => _.isString(value) && isBase64(value),
})

/**
 * Checks if a value is before a given date string or `moment` object.
 */
function before(date) {
    return rule({
        name: 'before',
        data: {date},
        test: (value) => moment(value).isBefore(date),
    })
}

/**
 * Checks if a value is between a given minimum or maximum, inclusive by default.
 */
function between(min, max, inclusive = true) {
    let _min = +(_.isString(min) ? moment(min): min);
    let _max = +(_.isString(max) ? moment(max): max);

    return rule({
        data: {min, max},
        name: inclusive ? 'between_inclusive' : 'between',
        test: (value) => {
            let _value = +(_.isString(value) ? moment(value): value);

            return inclusive
                ? _.gte(_value, _min) && _.lte(_value, _max)
                : _.gt (_value, _min) && _.lt (_value, _max);
        },
    })
}

/**
 * Checks if a value is a boolean (strictly true or false).
 */
const boolean = rule({
    name: 'boolean',
    test: _.isBoolean,
})


/**
 * Checks if a value is a valid credit card number.
 */
const creditcard = rule({
    name: 'creditcard',
    test: (value) => _.isString(value) && isCreditCard(value),
})

/**
 * Checks if a value is parseable as a date.
 */
const date = rule({
    name: 'date',
    test: (value) => moment(value).isValid(),
})


/**
 * Checks if a value matches the given date format.
 *
 * @see https://momentjs.com/docs/#/displaying/format
 */
function dateformat(format) {
    return rule({
        name: 'dateformat',
        data: {format},
        test: (value) => {
            return moment(value, format, true).isValid();
        }
    })
}

/**
 * Checks if a value is not `undefined`
 */
const defined = rule({
    name: 'defined',
    test: (value) => ! _.isUndefined(value),
})

/**
 * Checks if a value is a valid email address.
 */
const email = rule({
    name: 'email',
    test: (value) => _.isString(value) && isEmail(value),
})

/**
 * Checks if value is considered empty.
 *
 * @see https://lodash.com/docs/#isEmpty
 */
const empty = rule({
    name: 'empty',
    test: _.isEmpty,
})

/**
 * Alias for `equals`
 */
function equal(other) {
    return equals(other);
}

/**
 * Checks if a value equals the given value.
 */
function equals(other) {
    return rule({
        name: 'equals',
        data: {other},
        test: (value) => _.isEqual(value, other),
    })
}

/**
 * Checks if a value is greater than a given minimum.
 */
function gt(min) {
    return rule({
        name: 'gt',
        data: {min},
        test: (value) => _.gt(value, min),
    })
}

/**
 * Checks if a value is greater than or equal to a given minimum.
 */
function gte(min) {
    return rule({
        name: 'gte',
        data: {min},
        test: (value) => _.gte(value, min),
    })
}

/**
 * Checks if a value is an integer.
 */
const integer = rule({
    name: 'integer',
    test: _.isInteger,
})

/**
 * Checks if a value is a valid IP address.
 */
const ip = rule({
    name: 'ip',
    test: (value) => _.isString(value) && isIP(value),
})

/**
 * Checks if a value is a zero-length string.
 */
const isblank = rule({
    name: 'isblank',
    test: (value) => value === '',
})

/**
 * Checks if a value is `null` or `undefined`.
 */
const isnil = rule({
    name: 'isnil',
    test: _.isNil,
})

/**
 * Checks if a value is `null`.
 */
const isnull = rule({
    name: 'isnull',
    test: _.isNull,
})

/**
 * Checks if a value is a valid ISO8601 date string.
 */
const iso8601 = rule({
    name: 'iso8601',
    test: (value) => _.isString(value) && isISO8601(value),
})

/**
 * Checks if a value is valid JSON.
 */
const json = rule({
    name: 'json',
    test: (value) => _.isString(value) && isJSON(value),
})

/**
 * Checks if a value's length is at least a given minimum, and no more than an
 * optional maximum.
 *
 * @see https://lodash.com/docs/#toLength
 */
function length(min, max) {

    // No maximum means the value must be *at least* the minimum.
    if (_.isUndefined(max)) {
        return rule({
            name: 'length',
            data: {min, max},
            test: (value) => _.size(value) >= min,
        })
    }

    // Minimum and maximum given, so check that the value is within the range.
    return rule({
        name: 'length_between',
        data: {min, max},
        test: (value) => {
            let length = _.size(value);
            return length >= min && length <= max;
        },
    })
}

/**
 * Checks if a value is less than a given maximum.
 */
function lt(max) {
    return rule({
        name: 'lt',
        data: {max},
        test: (value) => _.lt(value, max),
    })
}

/**
 * Checks if a value is less than or equal to a given maximum.
 */
function lte(max) {
    return rule({
        name: 'lte',
        data: {max},
        test: (value) => _.lte(value, max),
    })
}

/**
 * Checks if a value matches a given regular expression string or RegExp.
 */
function match(pattern) {
    return rule({
        name: 'match',
        data: {pattern},
        test: (value) => (new RegExp(pattern)).test(value),
    })
}

/**
 * Alias for `lte`.
 */
function max(max) {
    return lte(max);
}

/**
 * Alias for `gte`.
 */
function min(min) {
    return gte(min);
}

/**
 * Checks if a value is negative.
 */
const negative = rule({
    name: 'negative',
    test: (value) => _.toNumber(value) < 0,
})

/**
 * Checks if a value is not any of one or more given values.
 */
function not(...values) {
    return rule({
        name: 'not',
        test: (value) => ! _.includes(values, value),
    })
}

/**
 * Checks if a value is a number (integer or float), excluding `NaN`.
 */
const number = rule({
    name: 'number',
    test: (value) => _.isFinite(value),
})

/**
 * Checks if a value is a number or numeric string, excluding `NaN`.
 */
const numeric = rule({
    name: 'numeric',
    test: (value) => {
        return (_.isNumber(value) && ! _.isNaN(value))
            || (value && _.isString(value) && ! _.isNaN(_.toNumber(value)));
    },
})

/**
 * Checks if a value is an object, excluding arrays and functions.
 */
const object = rule({
    name: 'object',
    test: (value) => {
        return   _.isObject(value)
            && ! _.isArray(value)
            && ! _.isFunction(value);
    },
})

/**
 * Checks if a value is positive.
 */
const positive = rule({
    name: 'positive',
    test: (value) => _.toNumber(value) > 0,
})

/**
 * Checks if a value is present, ie. not `null`, `undefined`, or a blank string.
 */
const required = rule({
    name: 'required',
    test: (value) => ! (_.isNil(value) || value === ''),
})

/**
 * Checks if a value equals another attribute's value.
 */
function same(other) {
    return rule({
        name: 'same',
        data: {other},
        test: (value, attribute, model) => _.isEqual(value, model.get(other)),
    })
}

/**
 * Checks if a value is a string.
 */
const string = rule({
    name: 'string',
    test: _.isString,
})

/**
 * Checks if a value is a valid URL string.
 */
const url = rule({
    name: 'url',
    test: (value) => _.isString(value) && isURL(value),
})

/**
 * Checks if a value is a valid UUID.
 */
const uuid = rule({
    name: 'uuid',
    test: (value) => _.isString(value) && isUUID(value),
})

export {
    after,
    alpha,
    alphanumeric,
    array,
    ascii,
    base64,
    before,
    between,
    boolean,
    creditcard,
    date,
    dateformat,
    defined,
    email,
    empty,
    equal,
    equals,
    gt,
    gte,
    integer,
    ip,
    isblank,
    isnil,
    isnull,
    iso8601,
    json,
    length,
    lt,
    lte,
    match,
    max,
    min,
    negative,
    not,
    number,
    numeric,
    object,
    positive,
    required,
    same,
    string,
    url,
    uuid,
}
