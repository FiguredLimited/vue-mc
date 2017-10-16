import {assert, expect} from 'chai'
import ProxyResponse from '../../src/HTTP/ProxyResponse.js'

describe('ProxyResponse', () => {
    describe('getData', () => {
        it('should return response data', () => {
            let response = new ProxyResponse(200, {a: 1});
            expect(response.getData()).to.deep.equal({a: 1});
        })
    })

    describe('getStatus', () => {
        it('should return response status', () => {
            let response = new ProxyResponse(201);
            expect(response.getStatus()).to.equal(201);
        })
    })

    describe('getHeaders', () => {
        it('should return response headers', () => {
            let response = new ProxyResponse(201, {}, {h: 1});
            expect(response.getHeaders()).to.deep.equal({h: 1});
        })
    })

    describe('getValidationErrors', () => {
        it('should return validation errors', () => {
            let response = new ProxyResponse(200, {a: 1});
            expect(response.getValidationErrors()).to.deep.equal({a: 1});
        })
    })
})
