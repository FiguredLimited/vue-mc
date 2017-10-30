import _ 	    from 'lodash'

class ProxyResponse {

    constructor(status, data = {}, headers = {}) {
        this.data    = _.defaultTo(data, {});
        this.headers = _.defaultTo(headers, {});
        this.status  = _.toSafeInteger(status);
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

export default ProxyResponse;
