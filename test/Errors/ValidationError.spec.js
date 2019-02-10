import {assert, expect} from 'chai'
import ValidationError from '../../src/Errors/ValidationError'

describe('ValidationError', () => {

    describe('getValidationErrors', () => {
        it('should return validation errors', () => {
            expect((new ValidationError({a: 1})).getValidationErrors()).to.deep.equal({a: 1});
        })
    })

    describe('toString', () => {
        it('should use the message as the string representation', () => {
            let message = 'test';
            expect((new ValidationError({a: 1}, message)) + '').to.equal(message);
        })
    })
})
