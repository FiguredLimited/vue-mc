/**
 * Models and Collections for Vue.js
 *
 * @version 0.0.1
 *
 * @author Rudi Theunissen <rudi.theunissen@figured.com>
 */

/**
 * An error with an attached response.
 */
export default class ResponseError {
    constructor(message, response) {
        this.message  = message;
        this.response = response;
        this.stack = (new Error()).stack;
    }
}