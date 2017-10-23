import _ 	    from 'lodash'

class Response {

    constructor(response) {
        this.response = response;
    }

    getData() {
        return _.get(this.response, 'data', null);
    }

    getStatus() {
        return _.get(this.response, 'status');
    }

    getHeaders() {
        return _.get(this.response, 'headers', {});
    }

    getValidationErrors() {
        return _.get(this.response, 'data', null);
    }
}

export default Response;
