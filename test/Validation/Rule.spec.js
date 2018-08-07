import {assert, expect} from 'chai'
import * as $ from '../../src/Validation/index.js'

describe('Rule', () => {

    describe('format', () => {
        it('should allow overriding the default string format', (done) => {
            $.email.format('nope!')('@email.com').then((result) => {
                expect(result).to.equal('nope!');
                done();
            });
        })

        it('should interpolate "value"', (done) => {
            $.email.format('<%= value %>')('@email.com').then((result) => {
                expect(result).to.equal('@email.com');
                done();
            });
        })

        it('should not affect the rule it is called on', (done) => {
            let rule1 = $.email;
            let rule2 = $.email.format('A');
            let rule3 = rule2.format('B');

            Promise.all([
                rule1('nope!'),
                rule2('nope!'),
                rule3('nope!'),
            ]).then((results) => {
                expect(results).to.deep.equal([
                    'Must be a valid email address', 
                    'A', 
                    'B',
                ]);

                // Do it again to check side effects
                Promise.all([
                    rule1('nope!'),
                    rule2('nope!'),
                    rule3('nope!'),
                ]).then((results) => {
                    expect(results).to.deep.equal([
                        'Must be a valid email address', 
                        'A', 
                        'B',
                    ]);
                    done();
                });
            });
        })
    })

    describe('and', (done) => {
        it('should cause a rule to only pass if its dependents also pass', () => {
            let min5 = $.min(5);
            let max8 = $.max(8);

            Promise.all([
                $.numeric.and(min5.and(max8))(4),    
                $.numeric.and(min5).and(max8)(4),   

                $.numeric.and(min5.and(max8))(9),   
                $.numeric.and(min5).and(max8)(9),   

                $.numeric.and(min5.and(max8))('a'), 
                $.numeric.and(min5).and(max8)('a'), 

            ]).then((results) => {
                expect(results).to.deep.equal([ 
                    'Must be greater than or equal to 5',
                    'Must be greater than or equal to 5',
                    
                    'Must be less than or equal to 8',
                    'Must be less than or equal to 8', 
                    
                    'Must be numeric',
                    'Must be numeric' 
                ]);
            });
        })

        it('should support recursive nesting', (done) => {
            let rule = $.numeric.and($.min(5).and($.max(9)).or($.equal(0)));

            Promise.all([
                rule(5),
                rule(6),
                rule(0),
                rule(8),
                rule(9),
                rule(10),
            ]).then((results) => {
                expect(results).to.deep.equal([ 
                    undefined,
                    undefined,
                    undefined,
                    undefined,
                    undefined,
                    'Must be less than or equal to 9',
                ]);
                done();
            });
        })

        it('should not affect the rule it is called on', (done) => {
            let rule1 = $.numeric;
            let rule2 = $.numeric.and($.min(5));
            let rule3 = rule2.and($.max(10));

            let chain = [
                rule1(8),
                rule2(3),
                rule3(12),
            ];

            let expected = [
                undefined,
                'Must be greater than or equal to 5',
                'Must be less than or equal to 10',
            ];

            Promise.all(chain).then((results) => {
                expect(results).to.deep.equal(expected);

                // Do it again to check side effects
                Promise.all(chain).then((results) => {
                    expect(results).to.deep.equal(expected);
                    done();
                });
            });
        })

        it('should allow multiple formats across a chain', (done) => {
            let rule = $.numeric.format('N').and($.max(5).format('M'));

            Promise.all([
                rule('g'),
                rule(8),
                rule(4),
            ]).then((results) => {
                expect(results).to.deep.equal([
                    'N',
                    'M',
                    undefined,
                ]);
                done();
            });
        })

        it('should use parent rule\'s format if an "and" returns false', (done) => {
            let rule = $.numeric.and((v) => (v == 2));

            Promise.all([
                rule(1),
                rule(2),
            ]).then((results) => {
                expect(results).to.deep.equal([
                    'Must be numeric',
                    undefined,
                ]);
                done();
            });
        })

        it('should use a chained string return as message', (done) => {
            let rule = $.numeric.and((v) => (v == 2 ? 'okay' : 'nope'));

            Promise.all([
                rule('g'),
                rule(2),
                rule(3),
            ]).then((results) => {
                expect(results).to.deep.equal([
                    'Must be numeric',
                    'okay',
                    'nope',
                ]);
                done();
            });
        })
    })

    describe('or', () => {
        it('should cause a rule to pass if any of its dependants pass', (done) => {
            let A = $.numeric;
            let B = $.email;
            let C = $.isnull;

            Promise.all([
                $.numeric.or($.email).or($.isnull)(1),
                $.numeric.or($.email).or($.isnull)('email@domain.com'),
                $.numeric.or($.email).or($.isnull)(null),
                $.numeric.or($.email).or($.isnull)('x'),

            ]).then((results) => {
                expect(results).to.deep.equal([
                    undefined,
                    undefined,
                    undefined,
                    'Must be numeric',
                ]);
                done();
            });
        })

        it('should support recursive nesting', (done) => {
            let A = $.email.or($.numeric).or($.isnull);
            let B = $.email.or($.numeric.or($.isnull));

            Promise.all([
                A('email@domain.com'),
                B('email@domain.com'),
                A(5),
                B(5),
                A(null),
                B(null),
                A('x'),
                B('x'),

            ]).then((results) => {
                expect(results).to.deep.equal([ 
                    undefined,
                    undefined,
                    undefined,
                    undefined,
                    undefined,
                    undefined,
                    'Must be a valid email address',
                    'Must be a valid email address',
                ]);
                done();
            });
        })

        it('should not affect the rule it is called on', (done) => {
            let rule1 = $.numeric;
            let rule2 = $.numeric.or($.email);
            let rule3 = rule2.or($.isnull);

            let chain = [
                rule1(null), // Fail
                rule2(null), // Fail
                rule3(null), // Pass

                rule1('email@domain.com'), // Fail
                rule2('email@domain.com'), // Pass
                rule3('email@domain.com'), // Pass
            ];

            let expected = [
                'Must be numeric',
                'Must be numeric',
                undefined,

                'Must be numeric',
                undefined,
                undefined,
            ];

            Promise.all(chain).then((results) => {
                expect(results).to.deep.equal(expected);

                // Do it again to check side effects
                Promise.all(chain).then((results) => {
                    expect(results).to.deep.equal(expected);
                    done();
                });
            });
        })
    })

    describe('and/or', (done) => {
        it('should support combined recursive nesting', (done) => {
            let rule = $.email.or($.numeric.and($.max(5).or($.equals(8))));

            Promise.all([
                rule('email@domain.com'),
                rule('email_domain'),
                rule(4),
                rule(8),
                rule(9),

            ]).then((results) => {
                expect(results).to.deep.equal([
                    undefined,
                    'Must be a valid email address',
                    undefined,
                    undefined,
                    'Must be a valid email address'
                ]);
                done();
            });
        })
    })
})
