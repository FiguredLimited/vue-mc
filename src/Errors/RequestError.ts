import Response from "../HTTP/Response";

export default class RequestError {
    message: string;
    error: any;
    response: Response;
    stack?: string;

    constructor(error: any, response: Response) {
        this.error    = error;
        this.response = response;
        this.stack    = (new Error()).stack;
        this.message  = error.message;
    }

    toString(): string {
        return this.message;
    }

    getError(): any {
        return this.error;
    }

    getResponse(): Response {
        return this.response;
    }
}
