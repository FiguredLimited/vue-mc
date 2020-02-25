import Response                    from './Response';
import RequestError                from '../Errors/RequestError';
import axios, {AxiosRequestConfig, AxiosResponse, AxiosError} from 'axios';

export default class Request {
    config: AxiosRequestConfig;

    constructor(config: AxiosRequestConfig) {
        this.config = config;
    }

    /**
     * Creates a custom response using a given Axios response.
     */
    createResponse(axiosResponse?: AxiosResponse): Response {
        return new Response(axiosResponse);
    }

    /**
     * Creates a custom response error using a given Axios response error.
     */
    createError(axiosError: AxiosError): RequestError {
        return new RequestError(axiosError, this.createResponse(axiosError.response));
    }

    /**
     * @returns {Promise}
     */
    send(): Promise<Response> {
        return axios
            .request(this.config)
            .then(this.createResponse)
            .catch((error: AxiosError): never => {
                throw this.createError(error);
            });
    }
}
