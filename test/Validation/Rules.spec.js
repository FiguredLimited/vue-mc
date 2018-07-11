import {assert, expect} from 'chai'
import * as _ from 'lodash';
import * as $ from '../../src/Validation/index.js'
import {Model} from '../../src'

/**
 * Some preset values to test with.
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

describe('Rules', () => {

    describe('after', () => {
        it('should pass for a valid date after the given date', () => {
            pass($.after('2020-06-10'), '2020-06-11');
        })

        it('should pass for a valid date where only time is after the given date', () => {
            pass($.after('2020-06-10 00:00:00'), '2020-06-10 00:00:01');
        })

        it('should fail for a valid date that is not after the given date', () => {
            fail($.after('2020-06-10'), '2020-06-09');
        })

        it('should fail for a valid date where only time is before the given date', () => {
            fail($.after('2020-06-10 00:00:01'), '2020-06-10 00:00:00');
        })

        it('should fail for a valid date where only time is equal to the given date', () => {
            fail($.after('2020-06-10 00:00:00'), '2020-06-10 00:00:00');
        })

        it('should fail for a valid date that is equal to the given date', () => {
            fail($.after('2020-06-10'), '2020-06-10');
        })

        it('should fail when the date value is invalid', () => {
            fail($.after('2020-06-10'), 'INVALID DATE');
        })

        it('should fail when the after date value is invalid', () => {
            fail($.after('INVALID DATE'), '2020-06-10');
        })
    })

    describe('alpha', () => {
        it('should pass for valid alpha tokens', () => {
            pass($.alpha, ['a', 'abc', 'ABC']);
        })

        it('should fail for invalid alpha tokens', () => {
            fail($.alpha, _.concat(FALSY, ['abc!', '?', '_']));
        })
    })

    describe('alphanumeric', () => {
        it('should pass for valid alphanumeric tokens', () => {
            pass($.alphanumeric, ['a', 'abc', 'ABC', 'a1', 'A1', '1', '123']);
        })

        it('should fail for invalid alphanumeric tokens', () => {
            fail($.alphanumeric, _.concat(FALSY, ['abc!', '?', '_']));
        })
    })

    describe('array', () => {
        it('should pass for valid arrays', () => {
            pass($.array, [[], [0], [0, 1]]);
        })

        it('should fail for non-array values', () => {
            fail($.array, _.concat(FALSY, [{}]));
        })
    })

    describe('ascii', () => {
        it('should pass for valid ASCII', () => {
            pass($.ascii, 'abc123<>:"{}[]!@#$%^&*()');
        })

        it('should pass for an empty string', () => {
            pass($.ascii, 'abc123<>:"{}[]!@#$%^&*()');
        })

        it('should fail on invalid ASCII string', () => {
            fail($.ascii, ['ë']);
        })

        it('should fail on non-string values', () => {
            fail($.ascii, NON_STRING);
        })

        it('should fail on ascii but number', () => {
            fail($.ascii, [0, 1, 234]);
        })
    })

    describe('base64', () => {
        it('should pass for valid base64', () => {
            pass($.base64, 'c3VjY2Vzcw==');
        })

        it('should fail for a valid base64 string that is not encoded right', () => {
            fail($.base64, '+++');
        })

        it('should fail on non-string values', () => {
            fail($.base64, NON_STRING);
        })
    })

    describe('before', () => {
        it('should pass for a valid date before the given date', () => {
            pass($.before('2020-06-10'), '2020-06-09');
        })

        it('should pass for a valid date where only time is before the given date', () => {
            pass($.before('2020-06-10 00:00:01'), '2020-06-10 00:00:00');
        })

        it('should fail for a valid date that is not before the given date', () => {
            fail($.before('2020-06-09'), '2020-06-10');
        })

        it('should fail for a valid date where only time is after the given date', () => {
            fail($.before('2020-06-10 00:00:00'), '2020-06-10 00:00:01');
        })

        it('should fail for a valid date where only time is equal to the given date', () => {
            fail($.before('2020-06-10 00:00:00'), '2020-06-10 00:00:00');
        })

        it('should fail for a valid date that is equal to the given date', () => {
            fail($.before('2020-06-10'), '2020-06-10');
        })

        it('should fail when the date value is invalid', () => {
            fail($.before('2020-06-10'), 'INVALID DATE');
        })

        it('should fail when the before date value is invalid', () => {
            fail($.before('INVALID DATE'), '2020-06-10');
        })
    })

    describe('between', () => {
        it('should pass for numbers', () => {
            pass($.between(1, 5, false), [2, 3.5, 4]);
        })
        it('should pass for numbers inclusive', () => {
            pass($.between(1, 5), [1, 2, 3.5, 4, 5]);
        })

        it('should fail for numbers not between', () => {
            fail($.between(1, 5, false), [0, 1, 5.001, 5, 6]);
        })

        it('should fail for numbers inclusive not between', () => {
            fail($.between(1, 5), [-1, 0, 6, 7]);
        })

        it('should pass for dates', () => {
            let a = '2020-06-05';
            let b = '2020-06-10';
            let v = '2020-06-08'; // Between a and b

            pass($.between(a, b), v);
            pass($.between(a, b), new Date(v));
            pass($.between(new Date(a), b), v);
            pass($.between(a, new Date(b)), v);
            pass($.between(new Date(a), new Date(b)), new Date(v));
        })

        it('should fail for dates not between', () => {
            let a = '2020-06-05';
            let b = '2020-06-10';
            let v = '2020-06-18'; // Not between a and b

            fail($.between(a, b), v);
            fail($.between(a, b), new Date(v));
            fail($.between(new Date(a), b), v);
            fail($.between(a, new Date(b)), v);
            fail($.between(new Date(a), new Date(b)), new Date(v));
        })

        it('should pass for dates inclusive (inner)', () => {
            pass($.between('2020-06-05', '2020-06-10'), '2020-06-05');
        })

        it('should pass for dates inclusive (outer)', () => {
            pass($.between('2020-06-05', '2020-06-10'), '2020-06-10');
        })

        it('should fail for dates inclusive not between', () => {
            fail($.between('2020-06-05', '2020-06-10'), '2020-06-18');
        })
    })

    describe('boolean', () => {
        it('should pass for true and false', () => {
            pass($.boolean, [true, false]);
        })

        it('should fail for non-boolean values', () => {
            fail($.boolean, [0, 1, '', null, undefined, 'true', 'false']);
        })
    })

    describe('creditcard', () => {
        it('should pass for a valid credit card number', () => {
            pass($.creditcard, ['4012888888881881']);
        })

        it('should fail for an invalid credit card number', () => {
            fail($.creditcard, ['4012888888881880']);
        })
    })

    describe('date', () => {
        it('should pass using a Date', () => {
            pass($.date, new Date());
        })

        it('should pass using a timestamp', () => {
            pass($.date, Date.now());
        })

        it('should pass using a valid date string', () => {
            pass($.date, '2016-06-10');
        })

        it('should fail with an invalid Date', () => {
            fail($.date, new Date('nope!'));
        })

        it('should fail with an invalid date string', () => {
            fail($.date, 'nope!');
        })
    })

    describe('dateformat', () => {
        it('should pass for a matching date string format', () => {
            pass($.dateformat('MM-dd-yyyy'), '12-25-1995');
            pass($.dateformat('MM/dd/yyyy'), '12/25/1995');
        })

        it('should pass for a matching date timestamp format', () => {
            pass($.dateformat('T'), '1504856445954');
            pass($.dateformat('T'),  1504856445954);
        })

        it('should fail for a valid date that does not use the exact format', () => {
            fail($.dateformat('MM-dd-yyyy'), '12/25/1995');
        })

        it('should fail for a valid date that does not match the format', () => {
            fail($.dateformat('MM-dd-yyyy'), '1995-12-25');
        })

        it('should fail for an invalid date', () => {
            fail($.dateformat('MM-dd-yyyy'), 'Nope!');
            fail($.dateformat('MM-dd-yyyy'), 'Nope!');
        })
    })

    describe('defined', () => {
        it ('should pass for non-undefined values', () => {
            pass($.defined, [null, NaN, Infinity, false, 0, '']);
        })

        it ('should fail for undefined', () => {
            fail($.defined, undefined);
        })
    })

    describe('email', () => {
        it('should pass for valid email addresses', () => {
            pass($.email, [
                'email@domain.com',
                'email@domain.co.uk',
            ]);
        })

        it('should fail for invalid email addresses', () => {
            fail($.email, [
                '@domain.com',
                'email@domain',
            ]);
        })
    })

    describe('empty', () => {
        it('should pass for empty values', () => {
            pass($.empty, ['', [], {}, false, 0]);
        })
        it('should fail for non-empty values', () => {
            fail($.empty, [' ', [1], {a: 1}]);
        })
    })

    describe('equal', () => {
        it('should pass when equal to a value', () => {
            pass($.equal('a'), 'a');
            pass($.equal(false), false);
            pass($.equal({a: 1}), {a: 1});  // Not same instance
        })

        it('should fail when not equal to a value', () => {
            fail($.equal('a'), 'A');
            fail($.equal([]), {});
            fail($.equal(0), [false, '0', '']);
        })
    })

    describe('equals', () => {
        it('should pass when equal to a value', () => {
            pass($.equals('a'), 'a');
            pass($.equals(false), false);
            pass($.equals({a: 1}), {a: 1});  // Not same instance
        })

        it('should fail when not equal to a value', () => {
            fail($.equals('a'), 'A');
            fail($.equals([]), {});
            fail($.equals(0), [false, '0', '']);
        })
    })

    describe('gt', () => {
        it('should pass for values greater but not equal', () => {
            pass($.gt(5),   [5.1, 6, Infinity]);
            pass($.gt(5.1), [5.2, 6, Infinity]);
        })

        it('should fail for values less than or equal', () => {
            fail($.gt(5),   [5,   5.0, 4.9, 0, -1, -Infinity, NaN, {}]);
            fail($.gt(5.1), [5.1, 5.0, 4.9, 0, -1, -Infinity, NaN, {}]);
        })
    })

    describe('gte', () => {
        it('should pass for values greater or equal', () => {
            pass($.gte(5),   [5,   5.1, 6, Infinity]);
            pass($.gte(5.1), [5.1, 5.2, 6, Infinity]);
        })

        it('should fail for values less than but not equal', () => {
            fail($.gte(5),   [4.9, 0, -1, -Infinity, NaN, {}]);
            fail($.gte(5.1), [5.0, 0, -1, -Infinity, NaN, {}]);
        })
    })

    describe('integer', () => {
        it('should pass for integers', () => {
            pass($.integer, [-1, 0, 1, 1.0]);
        })

        it('should fail for non-integer numbers', () => {
            fail($.integer, [-1.5, 1.5]);
        })

        it('should fail for non-integer values', () => {
            fail($.integer, [true, false, null, undefined, [], {}]);
        })
    })

    describe('ip', () => {
        it('should pass for valid IP addresses', () => {
            pass($.ip, [
                '192.168.0.1', '0.0.0.0', '255.255.255.255',  // ipv4
                '2001:0db8:85a3:0000:0000:8a2e:0370:7334',    // ipv6
            ])
        })

        it('should fail for invalid IP addresses', () => {
            fail($.ip, ['255.255.255.256', '-1.0.0.0', 'nope!']);
        })

        it('should fail for non-string values', () => {
            fail($.ip, [true, false, 0, 1, undefined, null, {}, []]);
        })
    })

    describe('isblank', () => {
        it('should pass for a blank string', () => {
            pass($.isblank, '');
        })

        it('should fail for non-blank values', () => {
            fail($.isblank, [' ', 0, false, [], {}, null, undefined]);
        })
    })

    describe('isnil', () => {
        it('should pass for null and undefined', () => {
            pass($.isnil, [null, undefined]);
        })

        it('should fail for falsey non-null and undefined values', () => {
            fail($.isnil, ['', false, NaN, [], {}, 0, '0']);
        })
    })

    describe('isnull', () => {
        it('should pass for null', () => {
            pass($.isnull, null);
        })

        it('should fail for anything non-null', () => {
            fail($.isnull, ['', undefined, false, NaN, [], {}, 0, '0']);
        })
    })

    describe('iso8601', () => {
        it ('should pass for a valid iso8601 date format string', () => {
            pass($.iso8601, [
                '2017-09-08T09:13:04+00:00',
            ]);
        })

        it ('should fail for an invalid iso8601 date format string', () => {
            fail($.iso8601, [
                '2017-09-08 09:13:04 +00:00',
            ]);
        })
    })

    describe('json', () => {
        it ('should pass for valid JSON', () => {
            pass($.json, '{"a":1}');
        })

        it ('should fail for invalid JSON', () => {
            fail($.json, '{a:1}');
        })
    })

    describe('length', () => {
        it('should pass for a string of length between a min a max (inclusive)', () => {
            pass($.length(2, 5), ['##', '123', 'abcd', '@@@@@']);
        })

        it('should fail for a string of length not between a min a max (inclusive)', () => {
            fail($.length(2, 5), ['#', '123456']);
        })

        it('should pass for a string of length greater than or equal to a minimum', () => {
            pass($.length(2), ['##', '123', 'abcd', '@@@@@']);
        })

        it('should fail for a string of length not greater than or equal to a minimum', () => {
            fail($.length(2), ['', '#']);
        })

        it('should pass for an array of length between a min a max (inclusive)', () => {
            pass($.length(2, 5), [[1, 2], [1, 2, 3], [1, 2, 3, 4, 5]]);
        })

        it('should fail for an array of length not between a min a max (inclusive)', () => {
            fail($.length(2, 5), [[], [1], [1, 2, 3, 4, 5, 6]]);
        })

        it('should pass for an array of length greater than or equal to a minimum', () => {
            pass($.length(2), [[1, 2], [1, 2, 3], [1, 2, 3, 4]]);
        })

        it('should fail for an array of length not greater than or equal to a minimum', () => {
            fail($.length(2), [[], [1]]);
        })
    })

    describe('lt', () => {
        it('should pass for values less than but not equal', () => {
            pass($.lt(5),   [4.9, 4, -Infinity, false, null]);
            pass($.lt(5.1), [5.0, 4, -Infinity, false, null]);
        })

        it('should fail for values greater than or equal', () => {
            fail($.lt(5),   [5,   5.1, 6, Infinity, NaN]);
            fail($.lt(5.1), [5.1, 5.2, 6, Infinity, NaN]);
        })
    })

    describe('lte', () => {
        it('should pass for values less than or equal', () => {
            pass($.lte(5),   [5,   4.9, 0, -1, -Infinity, false, null]);
            pass($.lte(5.1), [5.1, 4.9, 0, -1, -Infinity, false, null]);
        })

        it('should fail for values greater than but not equal', () => {
            fail($.lte(5),   [5.1, 6, Infinity, NaN]);
            fail($.lte(5.1), [5.2, 6, Infinity, NaN]);
        })
    })

    describe('match', () => {
        it ('should pass when a pattern matches', () => {
            pass($.match(/[a-z]{4}/), 'abcd');
        })

        it ('should fail when a pattern does not match', () => {
            fail($.match(/[a-z]{4}/), 'abc');
        })

        it ('should pass when a RegExp pattern matches', () => {
            pass($.match(new RegExp('[a-z]{4}')), 'abcd');
        })

        it ('should fail when a RegExp pattern matches', () => {
            fail($.match(new RegExp('[a-z]{4}')), 'abc');
        })
    })

    describe('negative', () => {
        it('should pass for negative numbers', () => {
            pass($.negative, [-2, -1, -0.1]);
        })

        it('should fail for zero or positive numbers', () => {
            fail($.negative, [0, 0.1, 1, 2]);
        })

        it('should pass for negative numeric strings', () => {
            pass($.negative, ['-2', '-1', '-0.1']);
        })

        it('should fail for zero or positive numeric strings', () => {
            fail($.negative, ['0', '0.1', '1, 2']);
        })
    })

    describe('not', () => {
        it('should fail for values to be excluded', () => {
            let rule = $.number.and($.not(3, 5, 7));

            pass(rule, [1, 2, 4, 6, 8]);
            fail(rule, [3, 5, 7]);
        })
    })

    describe('number', () => {
        it ('should pass for numbers', () => {
            pass($.number, [-1, 0, 1, 1.5]);
        })

        it ('should fail for non-numbers', () => {
            fail($.number, [true, false, null, undefined, [], {}, NaN, Infinity]);
        })

        it ('should fail for numeric strings', () => {
            fail($.number, ['-1', '0', '1', '1.5']);
        })
    })

    describe('numeric', () => {
        it('should pass for numbers', () => {
            pass($.numeric, [Infinity, -1, 0, 1, -0.5, 0.5, 4e8]);
        })

        it('should pass for numeric strings', () => {
            pass($.numeric, ['-1', '0', '1', '-0.5', '0.5', '4e8']);
        })

        it('should fail for non-numbers and strings', () => {
            fail($.numeric, [true, false, null, undefined, [], {}]);
        })

        it('should fail for non-numeric strings', () => {
            fail($.numeric, ['g', '!', '']);
        })
    })

    describe('object', () => {
        it('should pass for objects', () => {
            pass($.object, [{}, {a: 1}, new Error()]);
        })

        it('should fail for functions', () => {
            fail($.object, [function(){}, _.chain]);
        })

        it('should fail for non-objects', () => {
            fail($.object, [true, false, 0, 1, null, undefined, [], NaN]);
        })
    })

    describe('positive', () => {
        it('should pass for positive numbers', () => {
            pass($.positive, [2, 1, 0.1]);
        })

        it('should fail for zero or negative numbers', () => {
            fail($.positive, [0, -0.1, -1, -2]);
        })

        it('should pass for positive numeric strings', () => {
            pass($.positive, ['2', '1', '0.1']);
        })

        it('should fail for zero or negative numeric strings', () => {
            fail($.positive, ['0', '-0.1', '-1', '-2']);
        })
    })

    describe('required', () => {
        it('should pass for truthy values', () => {
            pass($.required, TRUTHY);
        })

        it('should fail for undefined', () => {
            fail($.required, undefined);
        })

        it('should fail for null', () => {
            fail($.required, null);
        })

        it('should fail for a blank string', () => {
            fail($.required, '');
        })
    })

    describe('same', () => {
        it ('should pass where values match', () => {
            pass($.same('a'), 5, new Model({a: 5}));
        })

        it ('should fail where values do not match', () => {
            fail($.same('a'), 5, new Model({a: 6}));
        })

        it ('should fail where attribute does not exist', () => {
            fail($.same('a'), 5, new Model({}));
        })
    })

    describe('string', () => {
        it('should pass for strings only', () => {
            pass($.string, STRINGS);
        })

        it('should fail for all non-string', () => {
            fail($.string, NON_STRING);
        })
    })

    describe('url', () => {
        it('should pass for valid URLs', () => {
            pass($.url, [
                'http://domain.com',
                'domain.com',
            ]);
        })

        it('should fail for invalid URLs', () => {
            fail($.url, [
                'http::nope!',
                'domain',
            ]);
        })
    })

    describe('uuid', () => {
        it('should pass for a valid UUID', () => {
            pass($.uuid, '123e4567-e89b-12d3-a456-426655440000');
        })

        it('should fail for an invalid UUID', () => {
            fail($.uuid, [
                '123e4567-e89b-12d3-a456-42665544000',
                '123e4567-e89b-12d3-a456-4266554400000',
                '123e4567-e89b-12d3-a456-42665544000!',
                '123e4567-e89b-12d3-a456-42665544000 ',
                '123e4567-e89b-12d3-a456-426655440000 ',
            ]);
        })

        it('should fail for non-string values', () => {
            fail($.uuid, NON_STRING);
        })
    })
})
