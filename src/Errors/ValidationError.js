/**
 * Models and Collections for Vue.js
 *
 * @version 0.0.1
 *
 * @author Rudi Theunissen <rudi.theunissen@figured.com>
 */

/**
 * An error that is thrown when validation fails.
 */
export default class ValidationError {
    constructor(errors) {
        this.message = 'Validation did not pass';
        this.errors  = errors;
        this.stack   = (new Error()).stack;
    }
}