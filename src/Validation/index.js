import { en_us }        from './locale.js'
import * as _           from 'lodash';
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

import {
    format      as formatDate, 
    isAfter     as isAfterDate, 
    isBefore    as isBeforeDate, 
    isValid     as isValidDate, 
    parse       as parseDate, 
    toDate
} from "date-fns";

// We want to set the messages as a superglobal so that imports across files
// reference the same messages object.
let _global = typeof window !== 'undefined' ? window : (global || {});

/**
 * Global validation message registry.
 */
export const messages =
    _global.__vuemc_validation_messages =
    _global.__vuemc_validation_messages || new class {

    constructor() {
        this.reset();
    }

    /**
     * Resets everything to the default configuration.
     */
    reset() {
        this.$locale   = 'en-us';
        this.$fallback = 'en-us';
        this.$locales  = {};

        this.register(en_us);
    }

    /**
     * Sets the active locale.
     *
     * @param {string} locale
     */
    locale(locale) {
        this.$locale = _.toLower(locale);
    }

    /**
     * Registers a language pack.
     */
    register(bundle) {
        let locale = _.toLower(bundle.locale);

        _.each(_.get(bundle, 'messages', {}), (message, name) => {
            _.set(this.$locales, [locale, name], _.template(message));
        });
    }

    /**
     * Replaces or adds a new message for a given name and optional locale.
     *
     * @param {string} name
     * @param {string} format
     */
    set(name, format, locale) {
        let template = _.isString(format) ? _.template(format) : format;

        // Use the given locale.
        if (locale) {
            _.set(this.$locales, [locale, name], template);

        // Otherwise use the active locale.
        } else if (this.$locale) {
            _.set(this.$locales, [this.$locale, name], template);

        // Otherwise fall back to the default locale.
        } else {
            _.set(this.$locales, [this.$fallback, name], template);
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
    get(name, data = {}) {
        let template;

        // Attempt to find the name using the active locale, falling back to the
        // active locale's language, and finally falling back to the default.
        template = template || _.get(this.$locales, [this.$locale, name]);
        template = template || _.get(this.$locales, [_.split(this.$locale, '-')[0], name]);
        template = template || _.get(this.$locales, [this.$fallback, name]);

        // Fall back to a blank string so that we don't potentially
        // leak message names or context data into the template.
        if ( ! template) {
            return '';
        }

        return template(data);
    }
}


/**
 * Resolves the result of invoking a rule. It's possible that the rule is within
 * a chain and therefore a pending promise, or a resolved value. This function 
 * normalises the result by calling `resolve` if the rule passed, and `reject`
 * if the rule didn't pass.
 */
const $resolve = function(result, resolve, reject) {
    if (result instanceof Promise) {
        result.then((result) => {
            $resolve(result, resolve, reject);
        });
    } else {
        if (result === false || _.isString(result)) {
            reject(result);
        } else {
            resolve();
        }
    }
}

/**
 * Wraps a rule invocation in a promise so that we can consume the results in a 
 * consistent way. This is necessary because rules may optionally return a 
 * promise when validation is done asynchronously.
 */
const promisify = function(rule, value, attribute, model) {
    return new Promise((resolve, reject) => {
        return $resolve(rule(value, attribute, model), resolve, reject);
    });
};

/**
 * Creates a new validation rule.
 *
 * Rules returned by this function can be chained with `or` and `and`.
 * For example: `ruleA.or(ruleB.and(RuleC)).and(RuleD)`
 *
 * The error message can be set or replaced using `format(message|template)`.
 *
 * @param {Object} config:
 *     - name: Name of the error message.
 *     - data: Context for the error message.
 *     - test: Function accepting (value, model), which should
 *             return `true` if the value is valid.
 *
 * @returns {Function} Validation rule.
 */
export const rule = function(config) {
    let name = _.get(config, 'name');
    let data = _.get(config, 'data', {});
    let test = _.get(config, 'test', _.stubTrue);

    /**
     * This is the function that is called when using this rule.
     * It has some extra metadata to allow rule chaining and custom formats.
     */
    let $rule = function(value, attribute, model) {
    
        return new Promise((resolve, reject) => {

            // This is the base of the validation chain. Most rules will consist
            // of only this one rule, unless they have AND or OR chains.
            let base = [promisify(test, value, attribute, model)];

            // Append the AND rules, because they would have to pass as well.
            let _and = $rule._and.map((rule) => {
                return promisify(rule, value, attribute, model);
            });

            Promise.all(_.concat(base, _and)).then(() => {
                // All rules passed, so there's no need to check the OR chain.
                // This rule is valid for the given value.
                resolve();

            }).catch((error) => {
                // Either the base rule or an AND rule has failed, so we should
                // attempt to run the OR chain to see if the rule passes.
                // 
                // We want the OR chain to exit early when a rule passes, so we
                // need to invert the promise, ie. we reject when a rule passes.
                let _or = _.map($rule._or, (rule) => {
                    return new Promise((resolve, reject) => {
                        return promisify(rule, value, attribute, model)
                            .then(reject)
                            .catch(resolve);
                    })
                });

                Promise.all(_or).catch((error) => { 
                    // At least one rule in the OR chain passed, so this rule is
                    // valid for the given value.
                    resolve();

                }).then(() => {
                    // All the rules in the OR chain failed, or there were none.
                    // We should continue with the error path.

                    // We can resolve using the error that was produced when
                    // running the AND chain, because they failed first.
                    if (_.isString(error)) {
                        resolve(error);
                        return;
                    }

                    // Add the invalid value to the message context, which is 
                    // made available to all rules by default. This allows for 
                    // ${value} interpolation.
                    _.assign(data, {attribute, value});

                    // This would be a custom format explicitly set on this rule.
                    let format = _.get($rule, '_format');

                    // Use the default message if an explicit format isn't set.
                    if ( ! format) {
                        resolve(messages.get(name, data));
                    
                    } else {
                        // Replace the custom format with a template if it is 
                        // still a string.
                        if (_.isString(format)) {
                            $rule._format = (format = _.template(format));
                        }

                        resolve(format(data));
                    }
                });
            })
        })
    };

    /**
     * @returns {Function} A copy of this rule, so that appending to a chain or
     *                     setting a custom format doesn't modify the base rule.
     */
    $rule.copy = () => {
        return _.assign(rule({name, test, data}), _.pick($rule, [
            '_format',
            '_and',
            '_or',
        ]));
    }

    /**
     * Sets a custom error message format on this rule.
     *
     * @param {string|Function} format
     */
    $rule.format = (format) => {
        return _.assign($rule.copy(), {_format: format });
    };

    /**
     * Adds another rule or function to this rule's OR chain. If the given rule
     * passes when this one fails, this rule will return `true`.
     *
     * @param {Function|Function[]} rules One or more functions to add to the chain.
     */
    $rule.or = (rules) => {
        return _.assign($rule.copy(), {_or: $rule._or.concat(rules)});
    };

    /**
     * Adds another rule or function to this rule's AND chain. If the given rule
     * fails when this one passes, this rule will return `false`.
     *
     * @param {Function|Function[]} rules One or more functions to add to the chain.
     */
    $rule.and = (rules) => {
        return _.assign($rule.copy(), {_and: $rule._and.concat(rules)});
    }

    $rule._format = null;   // Custom format
    $rule._and    = [];     // "and" chain
    $rule._or     = [];     // "or" chain

    // This is the internal function that returns true/false on pass/fail.
    $rule.predicate = test;
    
    return $rule;
}

/**
 * AVAILABLE RULES
 */

/**
 * Checks if the value is after a given date string or `Date` object.
 */
export const after = function(date) {
    return rule({
        name: 'after',
        data: {date},
        test: (value) => isAfterDate(value, date),
    })
}

/**
 * Checks if a value only has letters.
 */
export const alpha = rule({
    name: 'alpha',
    test: (value) => {
        return _.isString(value) && isAlpha(_.deburr(value));
    },
})

/**
 * Checks if a value only has letters or numbers.
 */
export const alphanumeric = rule({
    name: 'alphanumeric',
    test: (value) => {
        return _.isString(value) && isAlphanumeric(_.deburr(value));
    },
})

/**
 * Checks if a value is an array.
 */
export const array = rule({
    name: 'array',
    test: _.isArray,
})


/**
 * Checks if a value is a string consisting only of ASCII characters.
 */
export const ascii = rule({
    name: 'ascii',
    test: (value) => _.isString(value) && /^[\x00-\x7F]+$/.test(value),
})

/**
 * Checks if a value is a valid Base64 string.
 */
export const base64 = rule({
    name: 'base64',
    test: (value) => _.isString(value) && isBase64(value),
})

/**
 * Checks if a value is before a given date string or `Date` object.
 */
export const before = function(date) {
    return rule({
        name: 'before',
        data: {date},
        test: (value) => isBeforeDate(value, date),
    })
}

/**
 * Checks if a value is between a given minimum or maximum, inclusive by default.
 */
export const between = function(min, max, inclusive = true) {
    let _min = +(_.isString(min) ? toDate(min) : min);
    let _max = +(_.isString(max) ? toDate(max) : max);

    return rule({
        data: {min, max},
        name: inclusive ? 'between_inclusive' : 'between',
        test: (value) => {
            let _value = +(_.isString(value) ? toDate(value) : value);

            return inclusive
                ? _.gte(_value, _min) && _.lte(_value, _max)
                : _.gt (_value, _min) && _.lt (_value, _max);
        },
    })
}

/**
 * Checks if a value is a boolean (strictly true or false).
 */
export const boolean = rule({
    name: 'boolean',
    test: _.isBoolean,
})


/**
 * Checks if a value is a valid credit card number.
 */
export const creditcard = rule({
    name: 'creditcard',
    test: (value) => _.isString(value) && isCreditCard(value),
})

/**
 * Checks if a value is parseable as a date.
 */
export const date = rule({
    name: 'date',
    test: (value) => isValidDate(toDate(value)),
})


/**
 * Checks if a value matches the given date format.
 *
 * @see https://date-fns.org/v2.0.0-alpha.9/docs/format
 */
export const dateformat = function(format) {
    return rule({
        name: 'dateformat',
        data: {format},
        test: (value) => {
            let parsedDate = parseDate(value, format, new Date());

            return isValidDate(parsedDate) 
                && formatDate(parsedDate, format) === value.toString();
        },
    })
}

/**
 * Checks if a value is not `undefined`
 */
export const defined = rule({
    name: 'defined',
    test: (value) => ! _.isUndefined(value),
})

/**
 * Checks if a value is a valid email address.
 */
export const email = rule({
    name: 'email',
    test: (value) => _.isString(value) && isEmail(value),
})

/**
 * Checks if value is considered empty.
 *
 * @see https://lodash.com/docs/#isEmpty
 */
export const empty = rule({
    name: 'empty',
    test: _.isEmpty,
})

/**
 * Alias for `equals`
 */
export const equal = function(other) {
    return equals(other);
}

/**
 * Checks if a value equals the given value.
 */
export const equals = function(other) {
    return rule({
        name: 'equals',
        data: {other},
        test: (value) => _.isEqual(value, other),
    })
}

/**
 * Checks if a value is greater than a given minimum.
 */
export const gt = function(min) {
    return rule({
        name: 'gt',
        data: {min},
        test: (value) => _.gt(value, min),
    })
}

/**
 * Checks if a value is greater than or equal to a given minimum.
 */
export const gte = function(min) {
    return rule({
        name: 'gte',
        data: {min},
        test: (value) => _.gte(value, min),
    })
}

/**
 * Checks if a value is an integer.
 */
export const integer = rule({
    name: 'integer',
    test: _.isInteger,
})

/**
 * Checks if a value is a valid IP address.
 */
export const ip = rule({
    name: 'ip',
    test: (value) => _.isString(value) && isIP(value),
})

/**
 * Checks if a value is a zero-length string.
 */
export const isblank = rule({
    name: 'isblank',
    test: (value) => value === '',
})

/**
 * Checks if a value is `null` or `undefined`.
 */
export const isnil = rule({
    name: 'isnil',
    test: _.isNil,
})

/**
 * Checks if a value is `null`.
 */
export const isnull = rule({
    name: 'isnull',
    test: _.isNull,
})

/**
 * Checks if a value is a valid ISO8601 date string.
 */
export const iso8601 = rule({
    name: 'iso8601',
    test: (value) => _.isString(value) && isISO8601(value),
})

/**
 * Checks if a value is valid JSON.
 */
export const json = rule({
    name: 'json',
    test: (value) => _.isString(value) && isJSON(value),
})

/**
 * Checks if a value's length is at least a given minimum, and no more than an
 * optional maximum.
 *
 * @see https://lodash.com/docs/#toLength
 */
export const length = function(min, max) {

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
export const lt = function(max) {
    return rule({
        name: 'lt',
        data: {max},
        test: (value) => _.lt(value, max),
    })
}

/**
 * Checks if a value is less than or equal to a given maximum.
 */
export const lte = function(max) {
    return rule({
        name: 'lte',
        data: {max},
        test: (value) => _.lte(value, max),
    })
}

/**
 * Checks if a value matches a given regular expression string or RegExp.
 */
export const match = function(pattern) {
    return rule({
        name: 'match',
        data: {pattern},
        test: (value) => (new RegExp(pattern)).test(value),
    })
}

/**
 * Alias for `lte`.
 */
export const max = function(max) {
    return lte(max);
}

/**
 * Alias for `gte`.
 */
export const min = function(min) {
    return gte(min);
}

/**
 * Checks if a value is negative.
 */
export const negative = rule({
    name: 'negative',
    test: (value) => _.toNumber(value) < 0,
})

/**
 *
 */
export const not = function(...values) {
    return rule({
        name: 'not',
        test: (value) => ! _.includes(values, value),
    })
}

/**
 * Checks if a value is a number (integer or float), excluding `NaN`.
 */
export const number = rule({
    name: 'number',
    test: (value) => _.isFinite(value),
})

/**
 * Checks if a value is a number or numeric string, excluding `NaN`.
 */
export const numeric = rule({
    name: 'numeric',
    test: (value) => {
        if (_.isNumber(value) && ! _.isNaN(value)) {
            return true;
        }

        // Attempt to convert from string to number.
        if (value && _.isString(value) && ! _.isNaN(_.toNumber(value))) {
            return true;
        }

        return false;
    },
})

/**
 * Checks if a value is an object, excluding arrays and functions.
 */
export const object = rule({
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
export const positive = rule({
    name: 'positive',
    test: (value) => _.toNumber(value) > 0,
})

/**
 * Checks if a value is present, ie. not `null`, `undefined`, or a blank string.
 */
export const required = rule({
    name: 'required',
    test: (value) => ! (_.isNil(value) || value === ''),
})

/**
 * Checks if a value equals another attribute's value.
 */
export const same = function(other) {
    return rule({
        name: 'same',
        data: {other},
        test: (value, attribute, model) => _.isEqual(value, model.get(other)),
    })
}

/**
 * Checks if a value is a string.
 */
export const string = rule({
    name: 'string',
    test: _.isString,
})

/**
 * Checks if a value is a valid URL string.
 */
export const url = rule({
    name: 'url',
    test: (value) => _.isString(value) && isURL(value),
})

/**
 * Checks if a value is a valid UUID.
 */
export const uuid = rule({
    name: 'uuid',
    test: (value) => _.isString(value) && isUUID(value),
})
