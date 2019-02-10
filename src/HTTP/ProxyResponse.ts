import defaultTo     from 'lodash/defaultTo'
import toSafeInteger from 'lodash/toSafeInteger'

export default class ProxyResponse {
    data: Record<string, any>;
    headers: Record<string, any>;
    status: number;

    constructor(status: number, data: Record<string, any> = {}, headers: Record<string, any> = {}) {
        this.data    = defaultTo(data, {});
        this.headers = defaultTo(headers, {});
        this.status  = toSafeInteger(status);
    }

    getData(): Record<string, any> {
        return this.data;
    }

    getStatus(): number {
        return this.status;
    }

    getHeaders(): Record<string, any> {
        return this.headers;
    }

    getValidationErrors(): Record<string, any> {
        return this.data;
    }
}
