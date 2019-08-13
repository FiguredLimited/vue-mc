import Response     from './Response.js'
import RequestError from '../Errors/RequestError.js'
import axios        from 'axios'

export default class Request {

    constructor(config) {
        this.config = config;
    }

    /**
     * Creates a custom response using a given Axios response.
     */
    createResponse(axiosResponse) {
        return new Response(axiosResponse);
    }

    /**
     * Creates a custom response error using a given Axios response error.
     */
    createError(axiosError) {
        return new RequestError(axiosError, this.createResponse(axiosError.response));
    }

    /**
     * @returns {Promise}
     */
    send() {
        return axios
            .request(this.config)
            .then(this.createResponse)
            .catch((error) => {
                throw this.createError(error);
            });
    }
}
