import Response     from './Response.js'
import RequestError from '../Errors/RequestError.js'
import axios        from 'axios'

export default class Request {

    constructor(config, response, error) {
        this.config = config;
        this.Response = response;
        this.RequestError = error;
    }

    /**
     * @returns {Promise}
     */
    send() {
        return new Promise((resolve, reject) => {
            axios.request(this.config)
                .then((response) => {
                    return resolve(new this.Response(response));
                })
                .catch((error) => {
                    return reject(
                        new this.RequestError(
                            error,
                            new this.Response(error.response)
                        ))
                    ;
                })
        });
    }
}
