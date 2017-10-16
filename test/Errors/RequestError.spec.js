import {assert, expect} from 'chai'
import RequestError from '../../src/Errors/RequestError.js'
import Response from '../../src/HTTP/Response.js'

describe('RequestError', () => {
    describe('getError', () => {
        it('should return original error', () => {
            let error    = new Error("test");
            let response = new Response({a: 1});

            expect((new RequestError(error, response)).getError()).to.equal(error);
        })
    })

    describe('getResponse', () => {
        it('should return response', () => {
            let error    = new Error("test");
            let response = new Response({a: 1});

            expect((new RequestError(error, response)).getResponse()).to.equal(response);
        })
    })

    describe('toString', () => {
        it('should use the message as the string representation', () => {
            let error    = new Error("test");
            let response = new Response({a: 1});

            expect(new RequestError(error, response) + '').to.equal('test');
        })
    })
})
