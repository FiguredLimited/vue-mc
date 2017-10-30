export default class ValidationError {
    constructor(errors, message = 'Model did not pass validation') {
        this.message = message;
        this.errors  = errors;
        this.stack   = (new Error()).stack;
    }

    toString() {
        return this.message;
    }

    getValidationErrors() {
        return this.errors;
    }
}
