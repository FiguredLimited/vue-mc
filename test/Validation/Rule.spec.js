import {assert, expect} from 'chai'
import * as $ from '../../src/Validation/index.js'
import permutation from 'array-permutation'

describe('Rule', () => {

    describe('format', () => {
        it('should allow overriding the default string format', () => {
            expect($.email.format('nope!')('@email.com')).to.equal('nope!');
        })

        it('should interpolate "value"', () => {
            expect($.email.format('<%= value %>')('@email.com')).to.equal('@email.com');
        })

        it('should not affect the rule it is called on', () => {
            let rule1 = $.email;
            let rule2 = $.email.format('A');
            let rule3 = rule2.format('B');

            expect(rule1('nope!')).to.equal('Must be a valid email address');
            expect(rule2('nope!')).to.equal('A');
            expect(rule3('nope!')).to.equal('B');

            // Do it again to check side effects
            expect(rule1('nope!')).to.equal('Must be a valid email address');
            expect(rule2('nope!')).to.equal('A');
            expect(rule3('nope!')).to.equal('B');
        })
    })

    describe('and', () => {
        it('should cause a rule to only pass if its dependants also pass', () => {
            let A = $.numeric;
            let B = $.min(5);
            let C = $.max(8);

            for (let P of permutation([A, B, C])) {
                expect(P[0].and(P[1]).and(P[2])( 4 )).to.equal('Must be greater than or equal to 5');
                expect(P[0].and(P[1].and(P[2]))( 4 )).to.equal('Must be greater than or equal to 5');

                expect(P[0].and(P[1]).and(P[2])( 9 )).to.equal('Must be less than or equal to 8');
                expect(P[0].and(P[1].and(P[2]))( 9 )).to.equal('Must be less than or equal to 8');

                expect(P[0].and(P[1]).and(P[2])( 7 )).to.not.be.a('string');
                expect(P[0].and(P[1].and(P[2]))( 7 )).to.not.be.a('string');
            }
        })

        it('should support recursive nesting', () => {
            let rule = $.numeric.and($.min(5).and($.max(9)).or($.equal(0)));

            expect(rule(5)).to.not.be.a('string');
            expect(rule(6)).to.not.be.a('string');
            expect(rule(0)).to.not.be.a('string');
            expect(rule(8)).to.not.be.a('string');
            expect(rule(9)).to.not.be.a('string');
            expect(rule(10)).to.equal('Must be less than or equal to 9');
        })

        it('should not affect the rule it is called on', () => {
            let rule1 = $.numeric;
            let rule2 = $.numeric.and($.min(5));
            let rule3 = rule2.and($.max(10));

            expect(rule1(8)).to.not.be.string;
            expect(rule2(3)).to.equal('Must be greater than or equal to 5');
            expect(rule3(12)).to.equal('Must be less than or equal to 10');

            // Do it again to check side effects
            expect(rule1(8)).to.not.be.string;
            expect(rule2(3)).to.equal('Must be greater than or equal to 5');
            expect(rule3(12)).to.equal('Must be less than or equal to 10');
        })

        it('should allow multiple formats across a chain', () => {
            let rule = $.numeric.format('N').and($.max(5).format('M'));

            expect(rule('g')).to.equal('N');
            expect(rule(8)).to.equal('M');
            expect(rule(4)).to.not.be.a('string');
        })

        it('should use parent rule\'s format if an "and" returns false', () => {
            let rule = $.numeric.and((v) => (v == 2));

            expect(rule('g')).to.equal('Must be numeric');
            expect(rule(3)).to.equal('Must be numeric');
            expect(rule(2)).to.not.be.a('string');
        })

        it('should use a chained string return as message', () => {
            let rule = $.numeric.and((v) => (v != 2 ? 'nope!' : 'okay'));

            expect(rule('g')).to.equal('Must be numeric');
            expect(rule(3)).to.equal('nope!');
            expect(rule(2)).to.equal('okay');
        })
    })

    describe('or', () => {
        it('should cause a rule to pass if any of its dependants pass', () => {
            let A = $.numeric;
            let B = $.email;
            let C = $.isnull;

            for (let P of permutation([A, B, C])) {
                expect(P[0].or(P[1]).or(P[2])( 'nope!' )).to.be.a('string');
                expect(P[0].or(P[1].or(P[2]))( 'nope!' )).to.be.a('string');

                expect(P[0].or(P[1]).or(P[2])( 2 )).to.not.be.a('string');
                expect(P[0].or(P[1].or(P[2]))( 2 )).to.not.be.a('string');

                expect(P[0].or(P[1]).or(P[2])( 'email@domain.com' )).to.not.be.a('string');
                expect(P[0].or(P[1].or(P[2]))( 'email@domain.com' )).to.not.be.a('string');

                expect(P[0].or(P[1]).or(P[2])( null )).to.not.be.a('string');
                expect(P[0].or(P[1].or(P[2]))( null )).to.not.be.a('string');
            }
        })

        it('should support recursive nesting', () => {
            let rule = $.email.or($.numeric.or($.isnull));

            expect(rule('email@domain.com')).to.not.be.a('string');
            expect(rule(5)).to.not.be.a('string');
            expect(rule(null)).to.not.be.a('string');
            expect(rule('')).to.equal('Must be a valid email address');
        })

        it('should not affect the rule it is called on', () => {
            let rule1 = $.numeric;
            let rule2 = $.numeric.or($.email);
            let rule3 = rule2.or($.isnull);

            expect(rule1(8)).to.not.be.string;
            expect(rule2('#')).to.equal('Must be numeric');
            expect(rule3(NaN)).to.equal('Must be numeric');

            // // Do it again to check side effects
            expect(rule1(8)).to.not.be.string;
            expect(rule2('#')).to.equal('Must be numeric');
            expect(rule3(NaN)).to.equal('Must be numeric');
        })
    })

    describe('and/or', () => {
        it('should support combined recursive nesting', () => {
            let rule = $.email.or($.numeric.and($.max(5).or($.equals(8))));

            expect(rule('email@domain.com')).to.not.be.a('string');
            expect(rule(4)).to.not.be.a('string');
            expect(rule(8)).to.not.be.a('string');

            expect(rule('email_domain')).to.be.a('string');
            expect(rule(9)).to.be.a('string');
        })
    })
})
