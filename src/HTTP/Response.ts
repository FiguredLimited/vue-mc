import get from 'lodash/get'
import { AxiosResponse } from 'axios';

class Response {
    response?: AxiosResponse;

    constructor(response?: AxiosResponse) {
        this.response = response;
    }

    getData(): any | null {
        return get(this.response, 'data', null);
    }

    getStatus(): number {
        return get(this.response!, 'status');
    }

    getHeaders(): any {
        return get(this.response, 'headers', {});
    }

    getValidationErrors(): Record<string, any> | null {
        return get(this.response, 'data', null);
    }
}

export default Response;
