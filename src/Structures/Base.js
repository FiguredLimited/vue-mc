import Request      from '../HTTP/Request.js'
import Vue          from 'vue'
import * as _       from 'lodash'
import { autobind } from '../utils.js'

const REQUEST_CONTINUE  = 0;
const REQUEST_REDUNDANT = 1;
const REQUEST_SKIP      = 2;

/**
 * Base class for all things common between Model and Collection.
 */
class Base {

    constructor(options) {
        autobind(this);

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
     * @returns {string} The class name of this instance.
     */
    get $class() {
        return (Object.getPrototypeOf(this)).constructor.name;
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
     * @returns {string} Default string representation.
     */
    toString() {
        return `<${this.$class} #${this._uid}>`;
    }

    /**
     * Emits an event by name to all registered listeners on that event.

     * Listeners will be called in the order that they were added. If a listener
     * returns `false`, no other listeners will be called.
     *
     * @param {string} event    The name of the event to emit.
     * @param {Object} context  The context of the event, passed to listeners.
     */
    emit(event, context = {}) {
        let listeners = _.get(this._listeners, event);

        if ( ! listeners) {
            return;
        }

        // Create the context for the event.
        context = _.defaults({}, context, this.getDefaultEventContext());

        // Run through each listener. If any of them return false, stop the
        // iteration and mark that the event wasn't handled by all listeners.
        _.each(listeners, (listener) => listener(context));
    }

    /**
     * Registers an event listener for a given event.
     *
     * Event names can be comma-separated to register multiple events.
     *
     * @param {string}   event      The name of the event to listen for.
     * @param {function} listener   The event listener, accepts context.
     */
    on(event, listener) {
        let events = _.map(_.split(event, ','), _.trim);

        _.each(events, (event) => {
            this._listeners[event] = this._listeners[event] || [];
            this._listeners[event].push(listener);
        });
    }

    /**
     * @returns {Object} Parameters to use for replacement in route patterns.
     */
    getRouteParameters() {
        return {}
    }

    /**
     * @returns {RegExp|string} Pattern to match and group route parameters.
     */
    getRouteParameterPattern() {
        return this.getOption('routeParameterPattern');
    }

    /**
     * @returns {RegExp} The default route parameter pattern.
     */
    getDefaultRouteParameterPattern() {
        return /\{([^}]+)\}/;
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

            // The HTTP status code to use for indicating a validation error.
            validationErrorStatus: 422,
        }
    }

    /**
     * @param {Array|string} path     Option path resolved by `_.get`
     * @param {*}            fallback Fallback value if the option is not set.
     *
     * @returns {*} The value of the given option path.
     */
    getOption(path, fallback = null) {
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
     * Returns all the options that are currently set on this instance.
     *
     * @return {Object}
     */
    getOptions() {
        return _.defaultTo(this._options, {});
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

        let pattern = this.getRouteParameterPattern();
            pattern = new RegExp(pattern instanceof RegExp ? pattern.source : pattern, 'g');

        for (let parameter; (parameter = pattern.exec(route)) !== null; ) {
            replace[parameter[0]] = parameters[parameter[1]];
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
        return this.getRoute('fetch');
    }

    /**
     * @returns {string} The key to use when generating the `save` URL.
     */
    getSaveRoute() {
        return this.getRoute('save');
    }

    /**
     * @returns {string} The key to use when generating the `delete` URL.
     */
    getDeleteRoute() {
        return this.getRoute('delete');
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
        return this.getOption('methods.save');
    }

    /**
     * @returns {string} HTTP method to use when making a fetch request.
     */
    getFetchMethod() {
        return this.getOption('methods.fetch');
    }

    /**
     * @returns {string} HTTP method to use when updating a resource.
     */
    getUpdateMethod() {
        return this.getOption('methods.update');
    }

    /**
     * @returns {string} HTTP method to use when patching a resource.
     */
    getPatchMethod() {
        return this.getOption('methods.patch');
    }

    /**
     * @returns {string} HTTP method to use when creating a resource.
     */
    getCreateMethod() {
        return this.getOption('methods.create');
    }

    /**
     * @returns {string} HTTP method to use when deleting a resource.
     */
    getDeleteMethod() {
        return this.getOption('methods.delete');
    }

    /**
     * @returns {number} The HTTP status code that indicates a validation error.
     */
    getValidationErrorStatus() {
        return _.defaultTo(this.getOption('validationErrorStatus'), 422);
    }

    /**
     * @returns {boolean} `true` if the response indicates a validation error.
     */
    isBackendValidationError(error) {

        // The error must have a response for it to be a validation error.
        if ( ! _.invoke(error, 'getResponse', false)) {
            return false;
        }

        let status  = error.getResponse().getStatus();
        let invalid = this.getValidationErrorStatus();

        return status == invalid;
    }

    /**
     * @return {string|undefined} Route value by key.
     */
    getRoute(key, fallback) {
        let route = _.get(this.routes(), key, _.get(this.routes(), fallback));

        if ( ! route) {
            throw new Error(`Invalid or missing route`);
        }

        return route;
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
        return this.getRouteResolver()(route, parameters);
    }

    /**
     * @returns {Request} A new `Request` using the given configuration.
     */
    getRequest(config) {
        return new Request(config);
    }

    /**
     * This is the central component for all HTTP requests and handling.
     *
     * @param  {Object}     config      Request configuration
     * @param  {function}   onRequest   Called before the request is made.
     * @param  {function}   onSuccess   Called when the request was successful.
     * @param  {function}   onFailure   Called when the request failed.
     */
    request(config, onRequest, onSuccess, onFailure) {
        return new Promise((resolve, reject) => {
            return onRequest().then((status) => {
                switch (status) {
                    case REQUEST_CONTINUE:
                        break;
                    case REQUEST_SKIP:
                        return;
                    case REQUEST_REDUNDANT: // Skip, but consider it a success.
                        onSuccess(null);
                        resolve(null);
                        return;
                }

                // Support passing the request configuration as a function, to allow
                // for deferred resolution of certain values that may have changed
                // during the call to "onRequest".
                if (_.isFunction(config)) {
                    config = config();
                }

                // Apply the default headers.
                _.defaults(config.headers, this.getDefaultHeaders());

                // Make the request.
                return this.getRequest(config)
                    .send()
                    .then((response) => {
                        onSuccess(response);
                        resolve(response);
                    })
                    .catch((error) => {
                        onFailure(error);
                        reject(error);
                    })

                    // Failure fallback, for errors that occur in `onFailure`.
                    .catch(reject);
            }).catch(reject);
        })
    }

    /**
     * Fetches data from the database/API.
     *
     * @param {options}             Fetch options
     * @param {options.params}      Query params
     * @param {options.headers}     Query headers
     * @returns {Promise}
     */
    fetch(options = {}) {
        let config = () => _.defaults(options, {
            url:     this.getFetchURL(),
            method:  this.getFetchMethod(),
            params:  this.getFetchQuery(),
            headers: this.getFetchHeaders(),
        });

        return this.request(
            config,
            this.onFetch,
            this.onFetchSuccess,
            this.onFetchFailure
        );
    }

    /**
     * Persists data to the database/API.
     * @returns {Promise}
     */
    save() {
        let config = () => ({
            url:     this.getSaveURL(),
            method:  this.getSaveMethod(),
            data:    this.getSaveData(),
            params:  this.getSaveQuery(),
            headers: this.getSaveHeaders(),
        });

        return this.request(
            config,
            this.onSave,
            this.onSaveSuccess,
            this.onSaveFailure
        );
    }

    /**
     * Removes model or collection data from the database/API.
     * @returns {Promise}
     */
    delete() {
        let config = () => ({
            url:     this.getDeleteURL(),
            method:  this.getDeleteMethod(),
            data:    this.getDeleteBody(),
            params:  this.getDeleteQuery(),
            headers: this.getDeleteHeaders(),
        });

        return this.request(
            config,
            this.onDelete,
            this.onDeleteSuccess,
            this.onDeleteFailure
        );
    }
}

Base.REQUEST_CONTINUE  = REQUEST_CONTINUE;
Base.REQUEST_REDUNDANT = REQUEST_REDUNDANT;
Base.REQUEST_SKIP      = REQUEST_SKIP;

export default Base;
