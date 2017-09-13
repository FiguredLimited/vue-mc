import _                from 'lodash';
import {autobind}       from 'core-decorators';
import axios            from 'axios';
import Vue              from 'vue';

/**
 * Reserved keywords that can't be used for attribute or option names.
 */
const RESERVED = _.invert([
    '_attributes',
    '_collections',
    '_errors',
    '_listeners',
    '_reference',
    '_registry',
    '_uid',
    'attributes',
    'collections',
    'deleting',
    'errors',
    'fatal',
    'loading',
    'memoized',
    'models',
    'saving',
]);

/**
 * Base class for all things common between Model and Collection.
 */
@autobind
class Abstract {

    /**
     * @returns {string} The class name of this instance.
     */
    get $class() {
        return (Object.getPrototypeOf(this)).constructor.name;
    }

    constructor(options) {

        // Define an automatic unique ID. This is primarily to distinguish
        // between multiple instances of the same name and data.
        Object.defineProperty(this, '_uid', {
            value:        _.uniqueId(),
            enumerable:   false,
            configurable: false,
            writable:     false,
        });

        Vue.set(this, '_listeners', {});  // Event listeners
        Vue.set(this, '_options',   {});  // Internal option store

        this.setOptions(options);
        this.boot();
    }

    /**
     * Called after construction, this hook allows you to add some extra setup
     * logic without having to override the constructor.
     */
    boot() {

    }

    /**
     * Returns a route configuration in the form {key: name}, where key may be
     * 'save', 'fetch', 'delete' or any other custom key, and the name is what
     * will be passed to the route resolver to generate the URL. See @getURL
     *
     * @returns {Object}
     */
    routes() {
        return {};
    }

    /**
     * Returns the default context for all events emitted by this instance.
     *
     * @returns {Object}
     */
    getDefaultEventContext() {
        return {target: this}
    }

    /**
     * Emits an event by name. All listeners attached to this event will be
     * called in the order that they were attached.
     *
     * In some cases, listeners can return `false` to cancel an action.
     *
     * @param {string} event    The name of the event to emit.
     * @param {Object} context  The context of the event, passed to listeners.
     *
     * @returns {boolean} `true` if none of the event listeners returned false.
     */
    emit(event, context = {}) {
        let listeners = this._listeners[event];
        let cancelled = false;

        if (_.isUndefined(listeners)) {
            return ! cancelled;
        }

        // Create the context for the event.
        context = _.defaults({}, context, this.getDefaultEventContext());

        // Run through each listener. If any of them return false, stop the
        // iteration and mark that the event wasn't handled by all listeners.
        _.each(listeners, (listener) => {
            if ((listener(context) === false) && ! cancelled) {
                cancelled = true;
            }
        });

        return ! cancelled;
    }

    /**
     * Registers an event listener on a given event name.
     *
     * @param {string}   event
     * @param {function} listener
     */
    addEventListener(event, listener) {
        (this._listeners[event] = this._listeners[event] || []).push(listener);
    }

    /**
     * Registers an event listener for a given event name. Event names can be
     * separated with a comma "," to register multiple events.
     *
     * @param {string}   event      The name of the event to listen for.
     * @param {function} listener   The event listener, accepts context.
     */
    on(event, listener) {
        _.each(_.split(event, ','), (name) => {
            this.addEventListener(_.trim(name), listener);
        });
    }

    /**
     * @param {string} name
     *
     * @returns {boolean} `true` if the name is a reserved attribute name,
     *                    `false` otherwise.
     */
    isReserved(name) {
        return _.has(RESERVED, name);
    }

    /**
     * @returns {Object} Parameters to use for replacement in route patterns.
     */
    getRouteParameters() {
        return _.merge({}, this._options);
    }

    /**
     * @returns {RegExp|string} Pattern to match and group route parameters.
     */
    getRouteParameterPattern() {
        return this.option('routeParameterPattern');
    }

    /**
     * @returns {RegExp} The default route parameter pattern.
     */
    getDefaultRouteParameterPattern() {
        return /\{([\w-.]*)\}/;
    }

    /**
     * @returns {Object} This class' default options.
     */
    getDefaultOptions() {
        return {

            // Default HTTP methods for requests.
            methods: this.getDefaultMethods(),

            // Default route parameter interpolation pattern.
            routeParameterPattern: this.getDefaultRouteParameterPattern(),
        }
    }

    /**
     * @returns {*} The value of a given option path.
     */
    option(path, fallback) {
        return _.get(this._options, path, fallback);
    }

    /**
     * @returns {Object} This instance's default options.
     */
    options() {
        return {}
    }

    /**
     * Sets an option.
     *
     * @param {string} path
     * @param {*}      value
     */
    setOption(path, value) {
        _.set(this._options, path, value);
    }

    /**
     * Sets all given options. Successive values for the same option won't be
     * overwritten, so this follows the 'defaults' behaviour, and not 'merge'.
     *
     * @param {...Object} options One or more objects of options.
     */
    setOptions(...options) {
        Vue.set(this, '_options', _.defaultsDeep(
            {},
            ...options,                 // Given options
            this.options(),             // Instance defaults
            this.getDefaultOptions()    // Class defaults
        ));
    }

    /**
     * Returns a function that translates a route key and parameters to a URL.
     *
     * @returns {Function} Will be passed `route` and `parameters`
     */
    getRouteResolver() {
        return this.getDefaultRouteResolver();
    }

    /**
     * @returns {Object} An object consisting of all route string replacements.
     */
    getRouteReplacements(route, parameters = {}) {
        let replace = {};
        let pattern = new RegExp(this.getRouteParameterPattern(), 'g');

        for (let parameter; (parameter = pattern.exec(route)) !== null; ) {
            replace[parameter[0]] = _.get(parameters, parameter[1]);
        }

        return replace;
    }

    /**
     * Returns the default URL provider, which assumes that route keys are URL's,
     * and parameter replacement syntax is in the form "{param}".
     *
     * @returns {Function}
     */
    getDefaultRouteResolver() {
        return (route, parameters = {}) => {
            let replacements = this.getRouteReplacements(route, parameters);

            // Replace all route parameters with their replacement values.
            return _.reduce(replacements, (result, value, parameter) => {
                return _.replace(result, parameter, value);
            }, route);
        }
    }

    /**
     * @returns {Object} The data to send to the server when saving this model.
     */
    getDeleteBody() {
        return {};
    }

    /**
     * @returns {Object} Query parameters that will be appended to the `fetch` URL.
     */
    getFetchQuery() {
        return {};
    }

    /**
     * @returns {Object} Query parameters that will be appended to the `save` URL.
     */
    getSaveQuery() {
        return {};
    }

    /**
     * @returns {Object} Query parameters that will be appended to the `delete` URL.
     */
    getDeleteQuery() {
        return {};
    }

    /**
     * @returns {string} The key to use when generating the `fetch` URL.
     */
    getFetchRoute() {
        return _.get(this.routes(), 'fetch');
    }

    /**
     * @returns {string} The key to use when generating the `save` URL.
     */
    getSaveRoute() {
        return _.get(this.routes(), 'save');
    }

    /**
     * @returns {string} The key to use when generating the `delete` URL.
     */
    getDeleteRoute() {
        return _.get(this.routes(), 'delete');
    }

    /**
     * @returns {Object} Headers to use when making a save request.
     */
    getSaveHeaders() {
        return {};
    }

    /**
     * @returns {Object} Headers to use when making any request.
     */
    getDefaultHeaders() {
        return {};
    }

    /**
     * @returns {Object} Headers to use when making a fetch request.
     */
    getFetchHeaders() {
        return {};
    }

    /**
     * @returns {Object} Headers to use when making a delete request.
     */
    getDeleteHeaders() {
        return {};
    }

    /**
     * @returns {Object} Default HTTP methods.
     */
    getDefaultMethods() {
        return {
            fetch:  'GET',
            save:   'POST',
            update: 'POST',
            create: 'POST',
            patch:  'PATCH',
            delete: 'DELETE',
        }
    }

    /**
     * @returns {string} HTTP method to use when making a save request.
     */
    getSaveMethod() {
        return this.option('methods.save');
    }

    /**
     * @returns {string} HTTP method to use when making a fetch request.
     */
    getFetchMethod() {
        return this.option('methods.fetch');
    }

    /**
     * @returns {string} HTTP method to use when updating a resource.
     */
    getUpdateMethod() {
        return this.option('methods.update');
    }

    /**
     * @returns {string} HTTP method to use when patching a resource.
     */
    getPatchMethod() {
        return this.option('methods.patch');
    }

    /**
     * @returns {string} HTTP method to use when creating a resource.
     */
    getCreateMethod() {
        return this.option('methods.create');
    }

    /**
     * @returns {string} HTTP method to use when deleting a resource.
     */
    getDeleteMethod() {
        return this.option('methods.delete');
    }

    /**
     * @returns {number} HTTP status of the given response.
     */
    getResponseStatus(response) {
        return _.get(response, 'status');
    }

    /**
     * @returns {object|string|null} Response data attached to the given response.
     */
    getResponseData(response) {
        return _.get(response, 'data', null);
    }

    /**
     * @returns {boolean} `true` if the response indicates a validation error.
     */
    isValidationError(response) {
        return this.getResponseStatus(response) === 422;
    }

    /**
     * @returns {Object|Array} Validation errors
     */
    getValidationErrors(response) {
        return this.getResponseData(response);
    }

    /**
     * @returns {string} The full URL to use when making a fetch request.
     */
    getFetchURL() {
        return this.getURL(this.getFetchRoute(), this.getRouteParameters());
    }

    /**
     * @returns {string} The full URL to use when making a save request.
     */
    getSaveURL() {
        return this.getURL(this.getSaveRoute(), this.getRouteParameters());
    }

    /**
     * @returns {string} The full URL to use when making a delete request.
     */
    getDeleteURL() {
        return this.getURL(this.getDeleteRoute(), this.getRouteParameters());
    }

    /**
     * @param {string} route      The route key to use to generate the URL.
     * @param {Object} parameters Route parameters.
     *
     * @returns {string} A URL that was generated using the given route key.
     */
    getURL(route, parameters = {}) {

        // Check that this model supports the requested route key.
        if ( ! route) {
            throw new Error(`Invalid or missing route`);
        }

        // Get the URL using the given provider.
        return this.getRouteResolver()(route, parameters);
    }

    /**
     * Parses the three supported response callback handlers:
     *     - success
     *     - failure
     *     - always
     *
     * If passed a function, assign it to the 'always' handler.
     *
     * @param {Object|function} handlers
     */
    parseResponseHandlers(handlers = {}) {
        if (_.isFunction(handlers)) {
            handlers.always = handlers;
        }

        handlers.success = handlers.success || _.noop;
        handlers.failure = handlers.failure || _.noop;
        handlers.always  = handlers.always  || _.noop;
    }

    /**
     * Makes an HTTP request using the given config and returns a Promise. You
     * should override this if you want to use an alternative HTTP client.
     *
     * @param {Object} config {url, method, data, params, headers}
     *
     * @returns {Promise}
     */
    request(config) {
        return axios.request(config);
    }

    /**
     * This is the central component for all HTTP requests and handling.
     *
     * @param  {string}     event       Operation, eg. "fetch" or "save"
     * @param  {Object}     config      Request configuration
     * @param  {Object}     handlers    Response callback handlers
     * @param  {function}   before      Called before the request is made.
     * @param  {function}   onSuccess   Called when the request was successful.
     * @param  {function}   onFailure   Called when the request failed.
     */
    _crud(event, config, handlers, before, onSuccess, onFailure) {

        // Parse "success", "failure", and "always" callback handlers.
        this.parseResponseHandlers(handlers);

        // Called when a request was successful.
        let handleSuccess = (response) => {
            handlers.success(response);
            handlers.always(null, response);

            this.emit(`${event}.success`, {error: null, response });
            this.emit(`${event}.always`,  {error: null, response });
        }

        // Called when a request failed.
        let handleFailure = (error, response) => {
            handlers.failure(error, response);
            handlers.always(error, response);

            this.emit(`${event}.failure`, {error, response});
            this.emit(`${event}.always`,  {error, response});
        }

        // Called when a request was cancelled.
        let handleCancel = () => {
            handlers.always(null, null);
            this.emit(`${event}.always`, {error: null, response: null });
        }

        // If the "before" method returns false, it indicates that we should
        // skip this request. In this case, we call the "always" handler,
        // passing `null` for both the error and response parameters.
        try {
            if (before() === false) {
                handleCancel();
                return;
            }
        } catch (error) {
            handleFailure(error, null);
            return;
        }

        // Resolves the response when the request was successful.
        let resolve = (response) => {
            try {
                onSuccess(response);
                handleSuccess(response);

            // An error could be thrown within `onSuccess`
            } catch (error) {
                handleFailure(error, null);
            }
        }

        // Rejects the response when the request failed.
        let reject = (error) => {
            let response = _.get(error, 'response', null);
            try {
                onFailure(error, response);
                handleFailure(error, response);

            // An error could be thrown within `onFailure`
            } catch (error) {
                handleFailure(error, null);
            }
        }

        // Support passing the request configuration as a function, to allow
        // for deferred resolution of certain values that may have changed
        // during the call to "before".
        if (_.isFunction(config)) {
            config = config();
        }

        // Apply the default headers.
        _.defaults(config.headers, this.getDefaultHeaders());

        // Make the request.
        this.request(config).then(resolve).catch(reject);
    }

    /**
     * Fetches data from the database/API.
     *
     * @param {Object} handlers Response callback handlers
     *
     * @example
     *
     * model.fetch({
     *     success: (response) => {
     *         // Handle success here
     *     },
     *     failure: (error, response) => {
     *         // Handle failure here
     *     },
     *     always: (error, response) => {
     *         // Handle always here
     *     }
     * })
     *
     * // OR
     *
     * model.fetch((error, response) => {
     *     // Handle success or failure here
     * })
     */
    fetch(handlers = {}) {
        let config = () => ({
            url:     this.getFetchURL(),
            method:  this.getFetchMethod(),
            params:  this.getFetchQuery(),
            headers: this.getFetchHeaders(),
        });

        this._crud('fetch', config, handlers,
            this.onFetch,
            this.onFetchSuccess,
            this.onFetchFailure
        );
    }

    /**
     * Persists data to the database/API.
     *
     * @param {Object} handlers Response callback handlers
     *
     * @example
     *
     * model.save({
     *     success: (response) => {
     *         // Handle success here
     *     },
     *     failure: (error, response) => {
     *         // Handle failure here
     *     },
     *     always: (error, response) => {
     *         // Handle always here
     *     }
     * })
     *
     * // OR
     *
     * model.save((error, response) => {
     *     // Handle success or failure here
     * })
     */
    save(handlers = {}) {
        let config = () => ({
            url:     this.getSaveURL(),
            method:  this.getSaveMethod(),
            data:    this.getSaveData(),
            params:  this.getSaveQuery(),
            headers: this.getSaveHeaders(),
        });

        this._crud('save', config, handlers,
            this.onSave,
            this.onSaveSuccess,
            this.onSaveFailure
        );
    }

    /**
     * Removes model or collection data from the database/API.
     *
     * @param {Object} handlers Response callback handlers
     *
     * @example
     *
     * model.delete({
     *     success: (response) => {
     *         // Handle success here
     *     },
     *     failure: (error, response) => {
     *         // Handle failure here
     *     },
     *     always: (error, response) => {
     *         // Handle always here
     *     }
     * })
     *
     * // OR
     *
     * model.delete((error, response) => {
     *     // Handle success or failure here
     * })
     */
    delete(handlers = {}) {
        let config = () => ({
            url:     this.getDeleteURL(),
            method:  this.getDeleteMethod(),
            data:    this.getDeleteBody(),
            params:  this.getDeleteQuery(),
            headers: this.getDeleteHeaders(),
        });

        this._crud('delete', config, handlers,
            this.onDelete,
            this.onDeleteSuccess,
            this.onDeleteFailure
        );
    }
}

export default Abstract;
