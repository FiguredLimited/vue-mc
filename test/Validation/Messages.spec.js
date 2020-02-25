import {assert, expect} from 'chai'
import { messages } from '../../src/Validation/index'
import { pt_br } from '../../src/Validation/locale'

describe('Messages', () => {
    describe('get', () => {
        it('should return a formatted message for a valid name', () => {
            expect(messages.get('email')).to.equal('Must be a valid email address');
        })

        it('should return a formatted message with context', () => {
            expect(messages.get('equals', {other: 5})).to.equal('Must be equal to 5');
        })

        it('should return a blank string for an invalid name', () => {
            expect(messages.get('invalid!')).to.equal('');
        })

        it('should throw if data is missing', () => {
            try {
                messages.get('equals');
            } catch (e) {
                return;
            }
            assert.fail();
        })

        it('should fall back to a parent locale', () => {
            messages.set('testing', 'TESTING', 'aa');
            expect(messages.get('testing')).to.equal('');

            messages.locale('aa-zz');
            expect(messages.get('testing')).to.equal('TESTING');

            messages.reset();
        })
    })

    describe('set', () => {
        it('should add a new message', () => {
            messages.set('testing', 'Are we testing? ${testing}');
            expect(messages.get('testing', {testing: true})).to.equal('Are we testing? true');
        })

        it('should overwrite an existing message', () => {
            expect(messages.get('email')).to.equal('Must be a valid email address');
            messages.set('email', 'NOT VALID');
            expect(messages.get('email')).to.equal('NOT VALID');

            messages.reset();
        })

        it('should set a message for a specific locale', () => {
            messages.set('email', 'NOT VALID', 'aa-zz');
            expect(messages.get('email')).to.equal('Must be a valid email address');
            messages.locale('aa-zz');
            expect(messages.get('email')).to.equal('NOT VALID');

            messages.reset();
        })

        it('should set a message on the default locale if none is given', () => {
            messages.locale(null);
            messages.set('numeric', 'MUST BE NUMERIC');
            expect(messages.get('numeric')).to.equal('MUST BE NUMERIC');
            messages.locale('aa-zz');
            expect(messages.get('numeric')).to.equal('MUST BE NUMERIC');

            messages.reset();
        })
    })

    describe('locale', () => {
        it('should set a message for a specific locale', () => {
            messages.set('email', 'bleep bloop', 'robot');
            expect(messages.get('email')).to.equal('Must be a valid email address');

            messages.locale('robot');
            expect(messages.get('email')).to.equal('bleep bloop');

            messages.locale(null);
            expect(messages.get('email')).to.equal('Must be a valid email address');

            messages.reset();
        })
    })

    describe('register', () => {
        it('should allow registering an imported locale', () => {
            messages.locale('pt-br');
            expect(messages.get('email')).to.equal('Must be a valid email address');

            messages.register(pt_br);
            expect(messages.get('email')).to.equal('Deve ser um endereço de email válido');

            messages.locale(null);
            expect(messages.get('email')).to.equal('Must be a valid email address');

            messages.reset();
        })
    })

    describe('messages', () => {
        it('after',             () => expect(messages.get('after', {date: 'DATE'})).to.equal('Must be after DATE'));
        it('alpha',             () => expect(messages.get('alpha', {})).to.equal('Can only use letters'));
        it('alphanumeric',      () => expect(messages.get('alphanumeric', {})).to.equal('Must be alphanumeric'));
        it('array',             () => expect(messages.get('array', {})).to.equal('Must be an array'));
        it('ascii',             () => expect(messages.get('ascii', {})).to.equal('Must be ASCII'));
        it('base64',            () => expect(messages.get('base64', {})).to.equal('Must be valid Base64'));
        it('before',            () => expect(messages.get('before', {date: 'DATE'})).to.equal('Must be before DATE'));
        it('between',           () => expect(messages.get('between', {min: 2, max: 5})).to.equal('Must be between 2 and 5'));
        it('between_inclusive', () => expect(messages.get('between_inclusive', {min: 2, max: 5})).to.equal('Must be between 2 and 5, inclusive'));
        it('boolean',           () => expect(messages.get('boolean', {})).to.equal('Must be true or false'));
        it('creditcard',        () => expect(messages.get('creditcard', {})).to.equal('Must be a valid credit card number'));
        it('date',              () => expect(messages.get('date', {})).to.equal('Must be a valid date'));
        it('dateformat',        () => expect(messages.get('dateformat', {format: 'xyz'})).to.equal('Must use "xyz" format'));
        it('defined',           () => expect(messages.get('defined', {})).to.equal('Required'));
        it('email',             () => expect(messages.get('email', {})).to.equal('Must be a valid email address'));
        it('empty',             () => expect(messages.get('empty', {})).to.equal('Must be empty'));
        it('equals',            () => expect(messages.get('equals', {other: '?!'})).to.equal('Must be equal to ?!'));
        it('gt',                () => expect(messages.get('gt', {min: 3})).to.equal('Must be greater than 3'));
        it('gte',               () => expect(messages.get('gte', {min: 2})).to.equal('Must be greater than or equal to 2'));
        it('integer',           () => expect(messages.get('integer', {})).to.equal('Must be an integer'));
        it('ip',                () => expect(messages.get('ip', {})).to.equal('Must be a valid IP address'));
        it('isblank',           () => expect(messages.get('isblank', {})).to.equal('May not be blank'));
        it('isnil',             () => expect(messages.get('isnil', {})).to.equal('Required'));
        it('isnull',            () => expect(messages.get('isnull', {})).to.equal('Required'));
        it('iso8601',           () => expect(messages.get('iso8601', {})).to.equal('Must be a valid ISO8601 date'));
        it('json',              () => expect(messages.get('json', {})).to.equal('Must be a valid JSON'));
        it('length',            () => expect(messages.get('length', {min: 9})).to.equal('Must have a length of at least 9'));
        it('length_between',    () => expect(messages.get('length_between', {min: 1, max: 3})).to.equal('Must have a length between 1 and 3'));
        it('lt',                () => expect(messages.get('lt', {max: 5})).to.equal('Must be less than 5'));
        it('lte',               () => expect(messages.get('lte', {max: 5})).to.equal('Must be less than or equal to 5'));
        it('match',             () => expect(messages.get('match', {pattern: 'abc'})).to.equal('Must match "abc"'));
        it('negative',          () => expect(messages.get('negative', {})).to.equal('Must be a negative number'));
        it('not',               () => expect(messages.get('not', {value: 4})).to.equal('Can not be 4'));
        it('number',            () => expect(messages.get('number', {})).to.equal('Must be a number'));
        it('numeric',           () => expect(messages.get('numeric', {})).to.equal('Must be numeric'));
        it('object',            () => expect(messages.get('object', {})).to.equal('Must be an object'));
        it('positive',          () => expect(messages.get('positive', {})).to.equal('Must be a positive number'));
        it('required',          () => expect(messages.get('required', {})).to.equal('Required'));
        it('same',              () => expect(messages.get('same', {other: 'x'})).to.equal('Must have the same value as "x"'));
        it('string',            () => expect(messages.get('string', {})).to.equal('Must be a string'));
        it('url',               () => expect(messages.get('url', {})).to.equal('Must be a valid URL'));
        it('uuid',              () => expect(messages.get('uuid', {})).to.equal('Must be a valid UUID'));
    })
})
