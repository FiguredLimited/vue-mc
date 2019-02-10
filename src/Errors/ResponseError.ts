import Response from "../HTTP/Response";

export default class ResponseError {
    message: string;
    response?: Response;
    stack?: string;

    constructor(message: string, response?: Response) {
        this.message  = message;
        this.response = response;
        this.stack    = (new Error()).stack;
    }

    toString(): string {
        return this.message;
    }

    getResponse(): Response | undefined {
        return this.response;
    }
}
