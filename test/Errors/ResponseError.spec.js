import {assert, expect} from 'chai'
import ResponseError from '../../src/Errors/ResponseError.js'
import Response from '../../src/HTTP/Response.js'

describe('ResponseError', () => {

    describe('getResponse', () => {
        it('should return response', () => {
            let response = new Response({a: 1});

            expect((new ResponseError('', response)).getResponse()).to.equal(response);
        })
    })

    describe('toString', () => {
        it('should use the message as the string representation', () => {
            let response = new Response({a: 1});
            let message  = 'test';

            expect((new ResponseError(message, response)) + '').to.equal(message);
        })
    })
})
