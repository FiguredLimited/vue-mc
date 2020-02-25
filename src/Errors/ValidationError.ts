export default class ValidationError {
    message: string;
    errors: Errors | Errors[];
    stack?: string;

    constructor(errors: Errors | Errors[], message = 'Model did not pass validation') {
        this.message = message;
        this.errors  = errors;
        this.stack   = (new Error()).stack;
    }

    toString(): string {
        return this.message;
    }

    getValidationErrors(): Errors | Errors[] {
        return this.errors;
    }
}

export type Errors = Record<string, string | string[]>;
