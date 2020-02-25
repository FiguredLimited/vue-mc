import assign from 'lodash/assign';
import concat from 'lodash/concat';
import deburr from 'lodash/deburr';
import each from 'lodash/each';
import get from 'lodash/get';
import greaterThan from 'lodash/gt';
import greaterOrEqualTo from 'lodash/gte';
import includes from 'lodash/includes';
import isArray from 'lodash/isArray';
import isBoolean from 'lodash/isBoolean';
import isEmpty from 'lodash/isEmpty';
import isEqual from 'lodash/isEqual';
import isFinite from 'lodash/isFinite';
import isFunction from 'lodash/isFunction';
import isInteger from 'lodash/isInteger';
import isNaN from 'lodash/isNaN';
import isNil from 'lodash/isNil';
import isNull from 'lodash/isNull';
import isNumber from 'lodash/isNumber';
import isObject from 'lodash/isObject';
import isString from 'lodash/isString';
import isUndefined from 'lodash/isUndefined';
import lessThan from 'lodash/lt';
import lessOrEqualTo from 'lodash/lte';
import pick from 'lodash/pick';
import set from 'lodash/set';
import size from 'lodash/size';
import split from 'lodash/split';
import stubTrue from 'lodash/stubTrue';
import template from 'lodash/template';
import toLower from 'lodash/toLower';
import toNumber from 'lodash/toNumber';
import * as dates from 'date-fns';
import {
    format as formatDate,
    isAfter as isAfterDate,
    isBefore as isBeforeDate,
    isValid as isValidDate,
} from "date-fns";

// eslint-disable-next-line @typescript-eslint/camelcase
import {Bundle, en_us} from './locale';
import isAlpha from 'validator/lib/isAlpha';
import isAlphanumeric from 'validator/lib/isAlphanumeric';
import isBase64 from 'validator/lib/isBase64';
import isCreditCard from 'validator/lib/isCreditCard';
import isEmail from 'validator/lib/isEmail';
import isIP from 'validator/lib/isIP';
import isISO8601 from 'validator/lib/isISO8601';
import isJSON from 'validator/lib/isJSON';
import isURL from 'validator/lib/isURL';
import isUUID from 'validator/lib/isUUID';
import Model from '../Structures/Model';

// Parses any given value as a date.
const parseDate = (value: any, format?: string): Date => {
    if (isString(value)) {
        return format ? dates.parse(value, format, new Date()) : dates.parseISO(value);
    } else {
        return dates.toDate(value);
    }
};

// We want to set the messages a superglobal so that imports across files
// reference the same messages object.
let _global = typeof window !== 'undefined' ? window : (global || {});

class GlobalMessages {

    $locale!: string;
    $fallback!: string;
    $locales!: Record<string, Bundle>;

    constructor() {
        this.reset();
    }

    /**
     * Resets everything to the default configuration.
     */
    reset(): void {
        this.$locale = 'en-us';
        this.$fallback = 'en-us';
        this.$locales = {};

        this.register(en_us);
    }

    /**
     * Sets the active locale.
     *
     * @param {string} locale
     */
    locale(locale: string): void {
        this.$locale = toLower(locale);
    }

    /**
     * Registers a language pack.
     */
    register(bundle: Bundle): void {
        let locale: string = toLower(bundle.locale);

        each(get(bundle, 'messages', {}), (message, name): void => {
            set(this.$locales, [locale, name], template(message));
        });
    }

    /**
     * Replaces or adds a new message for a given name and optional locale.
     *
     * @param {string} name
     * @param {string} format
     * @param {string} locale
     */
    set(name: string, format: string, locale: string): void {
        let $template: _.TemplateExecutor = isString(format) ? template(format) : format;

        // Use the given locale.
        if (locale) {
            set(this.$locales, [locale, name], $template);

            // Otherwise use the active locale.
        } else if (this.$locale) {
            set(this.$locales, [this.$locale, name], $template);

            // Otherwise fall back to the default locale.
        } else {
            set(this.$locales, [this.$fallback, name], $template);
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
    get(name: string, data: Record<string, any> = {}): string {

        // Attempt to find the name using the active locale, falling back to the
        // active locale's language, and finally falling back to the default.
        let template: _.TemplateExecutor =
            get(this.$locales, [this.$locale, name],
                get(this.$locales, [split(this.$locale, '-')[0], name],
                    get(this.$locales, [this.$fallback, name])));

        // Fall back to a blank string so that we don't potentially
        // leak message names or context data into the template.
        if (!template) {
            return '';
        }

        return template(data);
    }
}

/**
 * Global validation message registry.
 */
export const messages =
    // eslint-disable-next-line @typescript-eslint/camelcase
    _global.__vuemc_validation_messages =
        _global.__vuemc_validation_messages || new GlobalMessages();

/**
 * Rule helpers for easy validation.
 * These can all be used directly in a model's validation configuration.
 *
 * @example
 *
 * import {ascii, length} from 'vue-mc/validation'
 *
 * class User extends Model {
 *     validation() {
 *         return {
 *             password: ascii.and(length(6)),
 *         }
 *     }
 * }
 */

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
export const rule: RuleFunction = function (config: Config): Rule {
    let name: string = get(config, 'name');
    let data: Record<string, any> = get(config, 'data', {}) as Record<string, any>;
    let test: TestFunction = get(config, 'test', stubTrue);

    /**
     * This is the function that is called when using this rule.
     * It has some extra metadata to allow rule chaining and custom formats.
     */
    // The @ts-ignore is for missing properties which are assigned at the end of this function.
    // @ts-ignore
    let $rule: Rule = function (value: any, attribute: string, model: Model): string | true {

        // `true` if this rule's core acceptance criteria was met.
        let valid: boolean = test(value, attribute, model);

        // If valid, check that all rules in the "and" chain also pass.
        if (valid) {
            for (let _and of $rule._and) {
                let result: string | boolean = _and(value, attribute, model);

                // If any of the chained rules return a string, we know that
                // that rule has failed, and therefore this chain is invalid.
                if (isString(result)) {
                    return result;
                }
            }

            // Either there weren't any "and" rules or they all passed.
            return true;

            // This rule's acceptance criteria was not met, but there is a chance
            // that a rule in the "or" chain's might pass.
        } else {
            for (let _or of $rule._or) {
                let result: string | boolean = _or(value, attribute, model);

                // A rule should either return true in the event of a general
                // "pass", or nothing at all. A failure would have to be a
                // string message (usually from another rule).
                if (result === true || isUndefined(result)) {
                    return true;
                }
            }
        }

        // At this point we want to report that this rule has failed, because
        // none of the "and" or "or" chains passed either.

        // Add the invalid value to the message context, which is made available
        // to all rules by default. This allows for ${value} interpolation.
        assign(data, {attribute, value});

        // This would be a custom format explicitly set on this rule.
        let format: string | _.TemplateExecutor | null = get($rule, '_format');

        // Use the default message if an explicit format isn't set.
        if (!format) {
            return messages.get(name, data);
        }

        // Replace the custom format with a template if it's still a string.
        if (isString(format)) {
            $rule._format = format = template(format);
        }

        return format(data);
    };

    /**
     * @returns {Function} A copy of this rule, so that appending to a chain or
     *                     setting a custom format doesn't modify the base rule.
     */
    $rule.copy = (): Rule => {
        return assign(rule({name, test, data}), pick($rule, [
            '_format',
            '_and',
            '_or',
        ]));
    };

    /**
     * Sets a custom error message format on this rule.
     *
     * @param {string|Function} format
     */
    $rule.format = (format: string | _.TemplateExecutor): Rule => {
        return assign($rule.copy(), {_format: format});
    };

    /**
     * Adds another rule or function to this rule's OR chain. If the given rule
     * passes when this one fails, this rule will return `true`.
     *
     * @param {Function|Function[]} rules One or more functions to add to the chain.
     */
    $rule.or = (rules: Rule | Rule[]): Rule => {
        return assign($rule.copy(), {_or: concat($rule._or, rules)});
    };

    /**
     * Adds another rule or function to this rule's AND chain. If the given rule
     * fails when this one passes, this rule will return `false`.
     *
     * @param {Function|Function[]} rules One or more functions to add to the chain.
     */
    $rule.and = (rules: Rule | Rule[]): Rule => {
        return assign($rule.copy(), {_and: concat($rule._and, rules)});
    };

    $rule._and = [];     // "and" chain
    $rule._or = [];     // "or" chain
    $rule._format = null;   // Custom format

    return $rule;
};

/**
 * AVAILABLE RULES
 */

/**
 * Checks if the value is after a given date string or `Date` object.
 */
export const after = function (date: Date): Rule {
    return rule({
        name: 'after',
        data: {date},
        test: (value: string | number | Date): boolean => isAfterDate(parseDate(value), parseDate(date)),
    });
};

/**
 * Checks if a value only has letters.
 */
export const alpha: Rule = rule({
    name: 'alpha',
    test: (value: any): boolean => {
        return isString(value) && isAlpha(deburr(value));
    },
});

/**
 * Checks if a value only has letters or numbers.
 */
export const alphanumeric: Rule = rule({
    name: 'alphanumeric',
    test: (value: any): boolean => {
        return isString(value) && isAlphanumeric(deburr(value));
    },
});

/**
 * Checks if a value is an array.
 */
export const array: Rule = rule({
    name: 'array',
    test: isArray,
});

/**
 * Checks if a value is a string consisting only of ASCII characters.
 */
export const ascii: Rule = rule({
    name: 'ascii',
    test: (value: any): boolean => isString(value) && /^[\x00-\x7F]+$/.test(value),
});

/**
 * Checks if a value is a valid Base64 string.
 */
export const base64: Rule = rule({
    name: 'base64',
    test: (value: any): boolean => isString(value) && isBase64(value),
});

/**
 * Checks if a value is before a given date string or `Date` object.
 */
export const before = function (date: Date): Rule {
    return rule({
        name: 'before',
        data: {date},
        test: (value: string | number | Date): boolean => isBeforeDate(parseDate(value), parseDate(date)),
    });
};

/**
 * Checks if a value is between a given minimum or maximum, inclusive by default.
 */
export const between: RuleFunction = function (min: string | number | Date, max: string | number | Date, inclusive: boolean = true): Rule {
    let _min: string | number | Date = +(isString(min) ? parseDate(min) : min);
    let _max: string | number | Date = +(isString(max) ? parseDate(max) : max);

    return rule({
        data: {min, max},
        name: inclusive ? 'between_inclusive' : 'between',
        test: (value: any): boolean => {
            let _value: number = +(isString(value) ? parseDate(value) : value);

            return inclusive
                ? greaterOrEqualTo(_value, _min) && lessOrEqualTo(_value, _max)
                : greaterThan(_value, _min) && lessThan(_value, _max);
        },
    });
};

/**
 * Checks if a value is a boolean (strictly true or false).
 */
export const boolean: Rule = rule({
    name: 'boolean',
    test: isBoolean,
});

/**
 * Checks if a value is a valid credit card number.
 */
export const creditcard: Rule = rule({
    name: 'creditcard',
    test: (value: any): boolean => isString(value) && isCreditCard(value),
});

/**
 * Checks if a value is parseable as a date.
 */
export const date: Rule = rule({
    name: 'date',
    test: (value: string | number | Date): boolean => {
        return isValidDate(parseDate(value));
    },
});

/**
 * Checks if a value matches the given date format.
 *
 * @see https://date-fns.org/v2.0.0-alpha.9/docs/format
 */
export const dateformat: RuleFunction = function (format): Rule {
    return rule({
        name: 'dateformat',
        data: {format},
        test: (value: string): boolean => {
            try {
                return isValidDate(parseDate(value.toString(), format))
                    && formatDate(parseDate(value.toString(), format), format) === value.toString();

            } catch (error) {
                if (error instanceof RangeError) {
                    return false;
                } else {
                    throw error;
                }
            }
        },
    });
};

/**
 * Checks if a value is not `undefined`
 */
export const defined: Rule = rule({
    name: 'defined',
    test: (value: any): boolean => !isUndefined(value),
});

/**
 * Checks if a value is a valid email address.
 */
export const email: Rule = rule({
    name: 'email',
    test: (value: any): boolean => isString(value) && isEmail(value),
});

/**
 * Checks if value is considered empty.
 *
 * @see https://lodash.com/docs/#isEmpty
 */
export const empty: Rule = rule({
    name: 'empty',
    test: isEmpty,
});

/**
 * Checks if a value equals the given value.
 */
export const equals: RuleFunction = function (other): Rule {
    return rule({
        name: 'equals',
        data: {other},
        test: (value: any): boolean => isEqual(value, other),
    });
};

/**
 * Alias for `equals`
 */
export const equal: RuleFunction = function (other): Rule {
    return equals(other);
};

/**
 * Checks if a value is greater than a given minimum.
 */
export const gt: RuleFunction = function (min): Rule {
    return rule({
        name: 'gt',
        data: {min},
        test: (value: any): boolean => greaterThan(value, min),
    });
};

/**
 * Checks if a value is greater than or equal to a given minimum.
 */
export const gte: RuleFunction = function (min): Rule {
    return rule({
        name: 'gte',
        data: {min},
        test: (value: any): boolean => greaterOrEqualTo(value, min),
    });
};

/**
 * Checks if a value is an integer.
 */
export const integer: Rule = rule({
    name: 'integer',
    test: isInteger,
});

/**
 * Checks if a value is a valid IP address.
 */
export const ip: Rule = rule({
    name: 'ip',
    test: (value: any): boolean => isString(value) && isIP(value),
});

/**
 * Checks if a value is a zero-length string.
 */
export const isblank: Rule = rule({
    name: 'isblank',
    test: (value: any): boolean => value === '',
});

/**
 * Checks if a value is `null` or `undefined`.
 */
export const isnil: Rule = rule({
    name: 'isnil',
    test: isNil,
});

/**
 * Checks if a value is `null`.
 */
export const isnull: Rule = rule({
    name: 'isnull',
    test: isNull,
});

/**
 * Checks if a value is a valid ISO8601 date string.
 */
export const iso8601: Rule = rule({
    name: 'iso8601',
    test: (value: any): boolean => isString(value) && isISO8601(value),
});

/**
 * Checks if a value is valid JSON.
 */
export const json: Rule = rule({
    name: 'json',
    test: (value: any): boolean => isString(value) && isJSON(value),
});

/**
 * Checks if a value's length is at least a given minimum, and no more than an
 * optional maximum.
 *
 * @see https://lodash.com/docs/#toLength
 */
export const length: RuleFunction = function (min: number, max: number): Rule {

    // No maximum means the value must be *at least* the minimum.
    if (isUndefined(max)) {
        return rule({
            name: 'length',
            data: {min, max},
            test: (value?: string | object | null): boolean => size(value) >= min,
        });
    }

    // Minimum and maximum given, so check that the value is within the range.
    return rule({
        name: 'length_between',
        data: {min, max},
        test: (value?: string | object | null): boolean => {
            let length: number = size(value);
            return length >= min && length <= max;
        },
    });
};

/**
 * Checks if a value is less than a given maximum.
 */
export const lt: RuleFunction = function (max): Rule {
    return rule({
        name: 'lt',
        data: {max},
        test: (value: any): boolean => lessThan(value, max),
    });
};

/**
 * Checks if a value is less than or equal to a given maximum.
 */
export const lte: RuleFunction = function (max: any): Rule {
    return rule({
        name: 'lte',
        data: {max},
        test: (value: any): boolean => lessOrEqualTo(value, max),
    });
};

/**
 * Checks if a value matches a given regular expression string or RegExp.
 */
export const match: RuleFunction = function (pattern: string | RegExp): Rule {
    return rule({
        name: 'match',
        data: {pattern},
        test: (value: string): boolean => (new RegExp(pattern)).test(value),
    });
};

/**
 * Alias for `lte`.
 */
export const max: RuleFunction = function (max: any): Rule {
    return lte(max);
};

/**
 * Alias for `gte`.
 */
export const min: RuleFunction = function (min: any): Rule {
    return gte(min);
};

/**
 * Checks if a value is negative.
 */
export const negative: Rule = rule({
    name: 'negative',
    test: (value: any): boolean => toNumber(value) < 0,
});

/**
 *
 */
export const not: RuleFunction = function (...values: any[]): Rule {
    return rule({
        name: 'not',
        test: (value: any): boolean => !includes(values, value),
    });
};

/**
 * Checks if a value is a number (integer or float), excluding `NaN`.
 */
export const number: Rule = rule({
    name: 'number',
    test: (value: any): boolean => isFinite(value),
});

/**
 * Checks if a value is a number or numeric string, excluding `NaN`.
 */
export const numeric: Rule = rule({
    name: 'numeric',
    test: (value: any): boolean => {
        return (isNumber(value) && !isNaN(value))
            || (value && isString(value) && !isNaN(toNumber(value)));
    },
});

/**
 * Checks if a value is an object, excluding arrays and functions.
 */
export const object: Rule = rule({
    name: 'object',
    test: (value: any): boolean => {
        return isObject(value)
            && !isArray(value)
            && !isFunction(value);
    },
});

/**
 * Checks if a value is positive.
 */
export const positive: Rule = rule({
    name: 'positive',
    test: (value: any): boolean => toNumber(value) > 0,
});

/**
 * Checks if a value is present, ie. not `null`, `undefined`, or a blank string.
 */
export const required: Rule = rule({
    name: 'required',
    test: (value: any): boolean => !(isNil(value) || value === ''),
});

/**
 * Checks if a value equals another attribute's value.
 */
export const same: RuleFunction = function (other: string): Rule {
    return rule({
        name: 'same',
        data: {other},
        test: (value: any, attribute: string, model: Model): boolean => isEqual(value, model.get(other)),
    });
};

/**
 * Checks if a value is a string.
 */
export const string: Rule = rule({
    name: 'string',
    test: isString,
});

/**
 * Checks if a value is a valid URL string.
 */
export const url: Rule = rule({
    name: 'url',
    test: (value: any): boolean => isString(value) && isURL(value),
});

/**
 * Checks if a value is a valid UUID.
 */
export const uuid: Rule = rule({
    name: 'uuid',
    test: (value: any): boolean => isString(value) && isUUID(value),
});

declare global {
    interface Window {
        __vuemc_validation_messages: GlobalMessages;
    }

    // eslint-disable-next-line @typescript-eslint/no-namespace
    namespace NodeJS {
        interface Global {
            __vuemc_validation_messages: GlobalMessages;
        }
    }
}

interface Config {
    name: string;
    data?: Record<string, any>;
    test: TestFunction;
}

type TestFunction = (value: any, attribute?: string, model?: Model) => boolean;

export interface Rule {
    (value: any, attribute?: string, model?: Model): true | string;

    _and: Rule[];
    _or: Rule[];
    _format: string | _.TemplateExecutor | null;

    copy(): Rule;

    format(format: string | _.TemplateExecutor): Rule;

    and(rule: Rule | Rule[]): Rule;

    or(rule: Rule | Rule[]): Rule;
}

type RuleFunction = (...params: any[]) => Rule;
