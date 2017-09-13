import {assert, expect} from 'chai'
import _ from 'lodash'
import moment from 'moment'
import * as $ from '../../src/Validation/Rules.js'
import {Model} from '../../src'

// Using invalid date formats throw this warning but we don't
// want to see it while we're testing.
moment.suppressDeprecationWarnings = true;

/**
 * Some perset values to test with.
 */
const FALSY      = ['', false, null, 0, 0.0, NaN, undefined, Infinity];
const TRUTHY     = ['0', '1', 'abc', true, 1, -1, 1.0, -1.0, [], {}];
const STRINGS    = ['', '0', '1', 'true', 'false', new String(''), new String('abc')];
const NON_STRING = [true, false, null, 0, 1, -1, NaN, undefined, Infinity, {}, []];

/**
 * Test a rule against some values, passing the expectation to the callback.
 */
const test = ($rule, values, model, callback) => {
    _.each(_.castArray(values), (value) => {
        callback(expect($rule(value, '__attribute__', model), `"${value}"`));
    });
}

/**
 * The given rule should PASS for all given values.
 */
const pass = ($rule, values, model = {}) => {
    test($rule, values, model, (expect) => expect.to.not.be.a('string'));
}

/**
 * The given rule should FAIL for all given values.
 */
const fail = ($rule, values, model = {}) => {
    test($rule, values, model, (expect) => expect.to.be.a('string'));
}

describe('Rules', function() {

    describe('after', function() {
        it('should pass for a valid date after the given date', function() {
            pass($.after('2020-06-10'), '2020-06-11');
        })

        it('should pass for a valid date where only time is after the given date', function() {
            pass($.after('2020-06-10 00:00:00'), '2020-06-10 00:00:01');
        })

        it('should fail for a valid date that is not after the given date', function() {
            fail($.after('2020-06-10'), '2020-06-09');
        })

        it('should fail for a valid date where only time is before the given date', function() {
            fail($.after('2020-06-10 00:00:01'), '2020-06-10 00:00:00');
        })

        it('should fail for a valid date where only time is equal to the given date', function() {
            fail($.after('2020-06-10 00:00:00'), '2020-06-10 00:00:00');
        })

        it('should fail for a valid date that is equal to the given date', function() {
            fail($.after('2020-06-10'), '2020-06-10');
        })

        it('should fail when the date value is invalid', function() {
            fail($.after('2020-06-10'), 'INVALID DATE');
        })

        it('should fail when the after date value is invalid', function() {
            fail($.after('INVALID DATE'), '2020-06-10');
        })
    })

    describe('alpha', function() {
        it('should pass for valid alpha tokens', function() {
            pass($.alpha, ['a', 'abc', 'ABC']);
        })

        it('should fail for invalid alpha tokens', function() {
            fail($.alpha, _.concat(FALSY, ['abc!', '?', '_']));
        })
    })

    describe('alphanumeric', function() {
        it('should pass for valid alphanumeric tokens', function() {
            pass($.alphanumeric, ['a', 'abc', 'ABC', 'a1', 'A1', '1', '123']);
        })

        it('should fail for invalid alphanumeric tokens', function() {
            fail($.alphanumeric, _.concat(FALSY, ['abc!', '?', '_']));
        })
    })

    describe('array', function() {
        it('should pass for valid arrays', function() {
            pass($.array, [[], [0], [0, 1]]);
        })

        it('should fail for non-array values', function() {
            fail($.array, _.concat(FALSY, [{}]));
        })
    })

    describe('ascii', function() {
        it('should pass for valid ASCII', function() {
            pass($.ascii, 'abc123<>:"{}[]!@#$%^&*()');
        })

        it('should pass for an empty string', function() {
            pass($.ascii, 'abc123<>:"{}[]!@#$%^&*()');
        })

        it('should fail on invalid ASCII string', function() {
            fail($.ascii, ['ë']);
        })

        it('should fail on non-string values', function() {
            fail($.ascii, NON_STRING);
        })

        it('should fail on ascii but number', function() {
            fail($.ascii, [0, 1, 234]);
        })
    })

    describe('base64', function() {
        it('should pass for valid base64', function() {
            pass($.base64, 'c3VjY2Vzcw==');
        })

        it('should fail for a valid base64 string that is not encoded right', function() {
            fail($.base64, '+++');
        })

        it('should fail on non-string values', function() {
            fail($.base64, NON_STRING);
        })
    })

    describe('before', function() {
        it('should pass for a valid date before the given date', function() {
            pass($.before('2020-06-10'), '2020-06-09');
        })

        it('should pass for a valid date where only time is before the given date', function() {
            pass($.before('2020-06-10 00:00:01'), '2020-06-10 00:00:00');
        })

        it('should fail for a valid date that is not before the given date', function() {
            fail($.before('2020-06-09'), '2020-06-10');
        })

        it('should fail for a valid date where only time is after the given date', function() {
            fail($.before('2020-06-10 00:00:00'), '2020-06-10 00:00:01');
        })

        it('should fail for a valid date where only time is equal to the given date', function() {
            fail($.before('2020-06-10 00:00:00'), '2020-06-10 00:00:00');
        })

        it('should fail for a valid date that is equal to the given date', function() {
            fail($.before('2020-06-10'), '2020-06-10');
        })

        it('should fail when the date value is invalid', function() {
            fail($.before('2020-06-10'), 'INVALID DATE');
        })

        it('should fail when the before date value is invalid', function() {
            fail($.before('INVALID DATE'), '2020-06-10');
        })
    })

    describe('between', function() {
        it('should pass for numbers', function() {
            pass($.between(1, 5, false), [2, 3.5, 4]);
        })
        it('should pass for numbers inclusive', function() {
            pass($.between(1, 5), [1, 2, 3.5, 4, 5]);
        })

        it('should fail for numbers not between', function() {
            fail($.between(1, 5, false), [0, 1, 5.001, 5, 6]);
        })

        it('should fail for numbers inclusive not between', function() {
            fail($.between(1, 5), [-1, 0, 6, 7]);
        })

        it('should pass for dates', function() {
            let a = '2020-06-05';
            let b = '2020-06-10';
            let v = '2020-06-08'; // Between a and b

            pass($.between(a, b), v);
            pass($.between(a, b), moment(v));
            pass($.between(moment(a), b), v);
            pass($.between(a, moment(b)), v);
            pass($.between(moment(a), moment(b)), moment(v));
        })

        it('should fail for dates not between', function() {
            let a = '2020-06-05';
            let b = '2020-06-10';
            let v = '2020-06-18'; // Not between a and b

            fail($.between(a, b), v);
            fail($.between(a, b), moment(v));
            fail($.between(moment(a), b), v);
            fail($.between(a, moment(b)), v);
            fail($.between(moment(a), moment(b)), moment(v));
        })

        it('should pass for dates inclusive (inner)', function() {
            pass($.between('2020-06-05', '2020-06-10'), '2020-06-05');
        })

        it('should pass for dates inclusive (outer)', function() {
            pass($.between('2020-06-05', '2020-06-10'), '2020-06-10');
        })

        it('should fail for dates inclusive not between', function() {
            fail($.between('2020-06-05', '2020-06-10'), '2020-06-18');
        })
    })

    describe('boolean', function() {
        it('should pass for true and false', function() {
            pass($.boolean, [true, false]);
        })

        it('should fail for non-boolean values', function() {
            fail($.boolean, [0, 1, '', null, undefined, 'true', 'false']);
        })
    })

    describe('creditcard', function() {
        it('should pass for a valid credit card number', function() {
            pass($.creditcard, ['4012888888881881']);
        })

        it('should fail for an invalid credit card number', function() {
            fail($.creditcard, ['4012888888881880']);
        })
    })

    describe('date', function() {
        it('should pass using a moment', function() {
            pass($.date, moment());
        })

        it('should pass using a timestamp', function() {
            pass($.date, +moment());
        })

        it('should pass using a valid date string', function() {
            pass($.date, '2016-06-10');
        })

        it('should fail with an invalid moment', function() {
            fail($.date, moment('nope!'));
        })

        it('should fail with an invalid date string', function() {
            fail($.date, 'nope!');
        })
    })

    describe('dateformat', function() {
        it('should pass for a matching date string format', function() {
            pass($.dateformat('MM-DD-YYYY'), '12-25-1995');
            pass($.dateformat('MM/DD/YYYY'), '12/25/1995');
        })

        it('should pass for a matching date timestamp format', function() {
            pass($.dateformat('X'), '1504856445954');
            pass($.dateformat('X'),  1504856445954);
        })

        it('should fail for a valid date that does not use the exact format', function() {
            fail($.dateformat('MM-DD-YYYY'), '12/25/1995');
        })

        it('should fail for a valid date that does not match the format', function() {
            fail($.dateformat('MM-DD-YYYY'), '1995-12-25');
        })

        it('should fail for an invalid date', function() {
            fail($.dateformat('MM-DD-YYYY'), 'Nope!');
            fail($.dateformat('MM-DD-YYYY'), 'Nope!');
        })
    })

    describe('defined', function() {
        it ('should pass for non-undefined values', function() {
            pass($.defined, [null, NaN, Infinity, false, 0, '']);
        })

        it ('should fail for undefined', function() {
            fail($.defined, undefined);
        })
    })

    describe('email', function() {
        it('should pass for valid email addresses', function() {
            pass($.email, [
                'email@domain.com',
                'email@domain.co.uk',
            ]);
        })

        it('should fail for invalid email addresses', function() {
            fail($.email, [
                '@domain.com',
                'email@domain',
            ]);
        })
    })

    describe('empty', function() {
        it('should pass for empty values', function() {
            pass($.empty, ['', [], {}, false, 0]);
        })
        it('should fail for non-empty values', function() {
            fail($.empty, [' ', [1], {a: 1}]);
        })
    })

    describe('equal', function() {
        it('should pass when equal to a value', function() {
            pass($.equal('a'), 'a');
            pass($.equal(false), false);
            pass($.equal({a: 1}), {a: 1});  // Not same instance
        })

        it('should fail when not equal to a value', function() {
            fail($.equal('a'), 'A');
            fail($.equal([]), {});
            fail($.equal(0), [false, '0', '']);
        })
    })

    describe('equals', function() {
        it('should pass when equal to a value', function() {
            pass($.equals('a'), 'a');
            pass($.equals(false), false);
            pass($.equals({a: 1}), {a: 1});  // Not same instance
        })

        it('should fail when not equal to a value', function() {
            fail($.equals('a'), 'A');
            fail($.equals([]), {});
            fail($.equals(0), [false, '0', '']);
        })
    })

    describe('gt', function() {
        it('should pass for values greater but not equal', function() {
            pass($.gt(5),   [5.1, 6, Infinity]);
            pass($.gt(5.1), [5.2, 6, Infinity]);
        })

        it('should fail for values less than or equal', function() {
            fail($.gt(5),   [5,   5.0, 4.9, 0, -1, -Infinity, NaN, {}]);
            fail($.gt(5.1), [5.1, 5.0, 4.9, 0, -1, -Infinity, NaN, {}]);
        })
    })

    describe('gte', function() {
        it('should pass for values greater or equal', function() {
            pass($.gte(5),   [5,   5.1, 6, Infinity]);
            pass($.gte(5.1), [5.1, 5.2, 6, Infinity]);
        })

        it('should fail for values less than but not equal', function() {
            fail($.gte(5),   [4.9, 0, -1, -Infinity, NaN, {}]);
            fail($.gte(5.1), [5.0, 0, -1, -Infinity, NaN, {}]);
        })
    })

    describe('integer', function() {
        it('should pass for integers', function() {
            pass($.integer, [-1, 0, 1, 1.0]);
        })

        it('should fail for non-integer numbers', function() {
            fail($.integer, [-1.5, 1.5]);
        })

        it('should fail for non-integer values', function() {
            fail($.integer, [true, false, null, undefined, [], {}]);
        })
    })

    describe('ip', function() {
        it('should pass for valid IP addresses', function() {
            pass($.ip, [
                '192.168.0.1', '0.0.0.0', '255.255.255.255',  // ipv4
                '2001:0db8:85a3:0000:0000:8a2e:0370:7334',    // ipv6
            ])
        })

        it('should fail for invalid IP addresses', function() {
            fail($.ip, ['255.255.255.256', '-1.0.0.0', 'nope!']);
        })

        it('should fail for non-string values', function() {
            fail($.ip, [true, false, 0, 1, undefined, null, {}, []]);
        })
    })

    describe('isblank', function() {
        it('should pass for a blank string', function() {
            pass($.isblank, '');
        })

        it('should fail for non-blank values', function() {
            fail($.isblank, [' ', 0, false, [], {}, null, undefined]);
        })
    })

    describe('isnil', function() {
        it('should pass for null and undefined', function() {
            pass($.isnil, [null, undefined]);
        })

        it('should fail for falsey non-null and undefined values', function() {
            fail($.isnil, ['', false, NaN, [], {}, 0, '0']);
        })
    })

    describe('isnull', function() {
        it('should pass for null', function() {
            pass($.isnull, null);
        })

        it('should fail for anything non-null', function() {
            fail($.isnull, ['', undefined, false, NaN, [], {}, 0, '0']);
        })
    })

    describe('iso8601', function() {
        it ('should pass for a valid iso8601 date format string', function() {
            pass($.iso8601, [
                '2017-09-08T09:13:04+00:00',
            ]);
        })

        it ('should fail for an invalid iso8601 date format string', function() {
            fail($.iso8601, [
                '2017-09-08 09:13:04 +00:00',
            ]);
        })
    })

    describe('json', function() {
        it ('should pass for valid JSON', function() {
            pass($.json, '{"a":1}');
        })

        it ('should fail for invalid JSON', function() {
            fail($.json, '{a:1}');
        })
    })

    describe('length', function() {
        it('should pass for a string of length between a min a max (inclusive)', function() {
            pass($.length(2, 5), ['##', '123', 'abcd', '@@@@@']);
        })

        it('should fail for a string of length not between a min a max (inclusive)', function() {
            fail($.length(2, 5), ['#', '123456']);
        })

        it('should pass for a string of length greater than or equal to a minimum', function() {
            pass($.length(2), ['##', '123', 'abcd', '@@@@@']);
        })

        it('should fail for a string of length not greater than or equal to a minimum', function() {
            fail($.length(2), ['', '#']);
        })

        it('should pass for an array of length between a min a max (inclusive)', function() {
            pass($.length(2, 5), [[1, 2], [1, 2, 3], [1, 2, 3, 4, 5]]);
        })

        it('should fail for an array of length not between a min a max (inclusive)', function() {
            fail($.length(2, 5), [[], [1], [1, 2, 3, 4, 5, 6]]);
        })

        it('should pass for an array of length greater than or equal to a minimum', function() {
            pass($.length(2), [[1, 2], [1, 2, 3], [1, 2, 3, 4]]);
        })

        it('should fail for an array of length not greater than or equal to a minimum', function() {
            fail($.length(2), [[], [1]]);
        })
    })

    describe('lt', function() {
        it('should pass for values less than but not equal', function() {
            pass($.lt(5),   [4.9, 4, -Infinity, false, null]);
            pass($.lt(5.1), [5.0, 4, -Infinity, false, null]);
        })

        it('should fail for values greater than or equal', function() {
            fail($.lt(5),   [5,   5.1, 6, Infinity, NaN]);
            fail($.lt(5.1), [5.1, 5.2, 6, Infinity, NaN]);
        })
    })

    describe('lte', function() {
        it('should pass for values less than or equal', function() {
            pass($.lte(5),   [5,   4.9, 0, -1, -Infinity, false, null]);
            pass($.lte(5.1), [5.1, 4.9, 0, -1, -Infinity, false, null]);
        })

        it('should fail for values greater than but not equal', function() {
            fail($.lte(5),   [5.1, 6, Infinity, NaN]);
            fail($.lte(5.1), [5.2, 6, Infinity, NaN]);
        })
    })

    describe('match', function() {
        it ('should pass when a pattern matches', function() {
            pass($.match(/[a-z]{4}/), 'abcd');
        })

        it ('should fail when a pattern does not match', function() {
            fail($.match(/[a-z]{4}/), 'abc');
        })

        it ('should pass when a RegExp pattern matches', function() {
            pass($.match(new RegExp('[a-z]{4}')), 'abcd');
        })

        it ('should fail when a RegExp pattern matches', function() {
            fail($.match(new RegExp('[a-z]{4}')), 'abc');
        })
    })

    // TODO max
    // TODO min

    describe('negative', function() {
        it('should pass for negative numbers', function() {
            pass($.negative, [-2, -1, -0.1]);
        })

        it('should fail for zero or positive numbers', function() {
            fail($.negative, [0, 0.1, 1, 2]);
        })

        it('should pass for negative numeric strings', function() {
            pass($.negative, ['-2', '-1', '-0.1']);
        })

        it('should fail for zero or positive numeric strings', function() {
            fail($.negative, ['0', '0.1', '1, 2']);
        })
    })

    describe('not', function() {
        it ('should pass for values not in the target set', function() {
            pass($.not('a'), ['d']);
            pass($.not('a', 'b'), ['d']);
            pass($.not('a', 'b', 'c'), ['d']);
        })

        it ('should fail for values that are in the target set', function() {
            fail($.not('a'), ['a']);
            fail($.not('a', 'b'), ['a']);
            fail($.not('a', 'b', 'c'), ['a']);

            fail($.not('a', 'b', 'c'), ['a', 'b', 'c']);
        })
    })

    describe('number', function() {
        it ('should pass for numbers', function() {
            pass($.number, [-1, 0, 1, 1.5]);
        })

        it ('should fail for non-numbers', function() {
            fail($.number, [true, false, null, undefined, [], {}, NaN, Infinity]);
        })

        it ('should fail for numeric strings', function() {
            fail($.number, ['-1', '0', '1', '1.5']);
        })
    })

    describe('numeric', function() {
        it('should pass for numbers', function() {
            pass($.numeric, [Infinity, -1, 0, 1, -0.5, 0.5, 4e8]);
        })

        it('should pass for numeric strings', function() {
            pass($.numeric, ['-1', '0', '1', '-0.5', '0.5', '4e8']);
        })

        it('should fail for non-numbers and strings', function() {
            fail($.numeric, [true, false, null, undefined, [], {}]);
        })

        it('should fail for non-numeric strings', function() {
            fail($.numeric, ['g', '!', '']);
        })
    })

    describe('object', function() {
        it('should pass for objects', function() {
            pass($.object, [{}, {a: 1}, new Error()]);
        })

        it('should fail for functions', function() {
            fail($.object, [function(){}, _.chain]);
        })

        it('should fail for non-objects', function() {
            fail($.object, [true, false, 0, 1, null, undefined, [], NaN]);
        })
    })

    describe('positive', function() {
        it('should pass for positive numbers', function() {
            pass($.positive, [2, 1, 0.1]);
        })

        it('should fail for zero or negative numbers', function() {
            fail($.positive, [0, -0.1, -1, -2]);
        })

        it('should pass for positive numeric strings', function() {
            pass($.positive, ['2', '1', '0.1']);
        })

        it('should fail for zero or negative numeric strings', function() {
            fail($.positive, ['0', '-0.1', '-1', '-2']);
        })
    })

    describe('required', function() {
        it('should pass for truthy values', function() {
            pass($.required, TRUTHY);
        })

        it('should fail for undefined', function() {
            fail($.required, undefined);
        })

        it('should fail for null', function() {
            fail($.required, null);
        })

        it('should fail for a blank string', function() {
            fail($.required, '');
        })
    })

    describe('same', function() {
        it ('should pass where values match', function() {
            pass($.same('a'), 5, new Model({a: 5}));
        })

        it ('should fail where values do not match', function() {
            fail($.same('a'), 5, new Model({a: 6}));
        })

        it ('should fail where attribute does not exist', function() {
            fail($.same('a'), 5, new Model({}));
        })
    })

    describe('string', function() {
        it('should pass for strings only', function() {
            pass($.string, STRINGS);
        })

        it('should fail for all non-string', function() {
            fail($.string, NON_STRING);
        })
    })

    describe('url', function() {
        it('should pass for valid URLs', function() {
            pass($.url, [
                'http://domain.com',
                'domain.com',
            ]);
        })

        it('should fail for invalid URLs', function() {
            fail($.url, [
                'http::nope!',
                'domain',
            ]);
        })
    })

    describe('uuid', function() {
        it('should pass for a valid UUID', function() {
            pass($.uuid, '123e4567-e89b-12d3-a456-426655440000');
        })

        it('should fail for an invalid UUID', function() {
            fail($.uuid, [
                '123e4567-e89b-12d3-a456-42665544000',
                '123e4567-e89b-12d3-a456-4266554400000',
                '123e4567-e89b-12d3-a456-42665544000!',
                '123e4567-e89b-12d3-a456-42665544000 ',
                '123e4567-e89b-12d3-a456-426655440000 ',
            ]);
        })

        it('should fail for non-string values', function() {
            fail($.uuid, NON_STRING);
        })
    })
})
