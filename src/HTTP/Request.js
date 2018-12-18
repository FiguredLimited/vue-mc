import Response     from './Response.js'
import RequestError from '../Errors/RequestError.js'
import axios        from 'axios'

export default class Request {

    constructor(config) {
        this.config = config;
    }

    /**
     * @returns {Promise}
     */
    send() {
        return axios.request(this.config).then((response) => {
            return new Response(response);
        }).catch((error) => {
            throw new RequestError(error, new Response(error.response));
        });
    }
}
