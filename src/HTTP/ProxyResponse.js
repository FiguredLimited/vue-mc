import { defaultTo, toSafeInteger } from 'lodash'

export default class ProxyResponse {

    constructor(status, data = {}, headers = {}) {
        this.data    = defaultTo(data, {});
        this.headers = defaultTo(headers, {});
        this.status  = toSafeInteger(status);
    }

    getData() {
        return this.data;
    }

    getStatus() {
        return this.status;
    }

    getHeaders() {
        return this.headers;
    }

    getValidationErrors() {
        return this.data;
    }
}
