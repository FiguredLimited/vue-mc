class RequestError {
    constructor(error, response) {
        this.error    = error;
        this.response = response;
        this.stack    = (new Error()).stack;
        this.message  = error.message;
    }

    toString() {
        return this.message;
    }

    getError() {
        return this.error;
    }

    getResponse() {
        return this.response;
    }
}

export default RequestError;
