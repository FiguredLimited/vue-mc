import get from 'lodash/get'

class Response {

    constructor(response) {
        this.response = response;
    }

    getData() {
        return get(this.response, 'data', null);
    }

    getStatus() {
        return get(this.response, 'status');
    }

    getHeaders() {
        return get(this.response, 'headers', {});
    }

    getValidationErrors() {
        return get(this.response, 'data', null);
    }
}

export default Response;
