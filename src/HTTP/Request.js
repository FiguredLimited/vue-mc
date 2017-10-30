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
        return new Promise((resolve, reject) => {
            axios.request(this.config)
                .then((response) => {
                    return resolve(new Response(response));
                })
                .catch((error) => {
                    return reject(new RequestError(error, new Response(error.response)));
                })
        });
    }
}
