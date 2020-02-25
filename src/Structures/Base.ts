import Vue from 'vue';
import {autobind} from '../utils';
import Request from '../HTTP/Request';
import Response from '../HTTP/Response';
import RequestError from '../Errors/RequestError';
import ResponseError from '../Errors/ResponseError';
import ValidationError, {Errors} from '../Errors/ValidationError';

import assign from 'lodash/assign';
import defaults from 'lodash/defaults';
import defaultsDeep from 'lodash/defaultsDeep';
import defaultTo from 'lodash/defaultTo';
import each from 'lodash/each';
import get from 'lodash/get';
import invoke from 'lodash/invoke';
import isFunction from 'lodash/isFunction';
import map from 'lodash/map';
import reduce from 'lodash/reduce';
import replace from 'lodash/replace';
import set from 'lodash/set';
import split from 'lodash/split';
import trim from 'lodash/trim';
import uniqueId from 'lodash/uniqueId';

import {AxiosRequestConfig, Method} from 'axios';
import Model from './Model';
import {BaseResponse} from '../HTTP/BaseResponse';

export enum RequestOperation {
    REQUEST_CONTINUE  = 0,
    REQUEST_REDUNDANT = 1,
    REQUEST_SKIP      = 2,
}

/**
 * Base class for all things common between Model and Collection.
 */
abstract class Base {
    static readonly REQUEST_CONTINUE  = RequestOperation.REQUEST_CONTINUE;
    static readonly REQUEST_REDUNDANT = RequestOperation.REQUEST_REDUNDANT;
    static readonly REQUEST_SKIP      = RequestOperation.REQUEST_SKIP;

    readonly _uid!: string;
    private readonly _listeners!: Record<string, Listener[]>;
    private readonly _options!: Record<string, any>;

    protected constructor(options: Options) {
        autobind(this);

        // Define an automatic unique ID. This is primarily to distinguish
        // between multiple instances of the same name and data.
        Object.defineProperty(this, '_uid', {
            value:        uniqueId(),
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
    get $class(): string {
        return (Object.getPrototypeOf(this)).constructor.name;
    }

    /**
     * Called after construction, this hook allows you to add some extra setup
     * logic without having to override the constructor.
     */
    boot(): void {

    }

    /**
     * Returns a route configuration in the form {key: name}, where key may be
     * 'save', 'fetch', 'delete' or any other custom key, and the name is what
     * will be passed to the route resolver to generate the URL. See @getURL
     *
     * @returns {Object}
     */
    routes(): Routes {
        return {};
    }

    /**
     * Returns the default context for all events emitted by this instance.
     *
     * @returns {Object}
     */
    getDefaultEventContext(): {target: Base} {
        return {target: this};
    }

    /**
     * @returns {string} Default string representation.
     */
    toString(): string {
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
    emit(event: string, context: Record<string, any> = {}): void {
        let listeners: Listener[] = get(this._listeners, event);

        if ( ! listeners) {
            return;
        }

        // Create the context for the event.
        context = defaults({}, context, this.getDefaultEventContext());

        // Run through each listener. If any of them return false, stop the
        // iteration and mark that the event wasn't handled by all listeners.
        each(listeners, (listener: Listener): void => listener(context));
    }

    /**
     * Registers an event listener for a given event.
     *
     * Event names can be comma-separated to register multiple events.
     *
     * @param {string}   event      The name of the event to listen for.
     * @param {function} listener   The event listener, accepts context.
     */
    on(event: string, listener: Listener): void {
        let events: string[] = map(split(event, ','), trim);

        each(events, (event: string): void => {
            this._listeners[event] = this._listeners[event] || [];
            this._listeners[event].push(listener);
        });
    }

    /**
     * @returns {Object} Parameters to use for replacement in route patterns.
     */
    getRouteParameters(): Record<string, string> {
        return {};
    }

    /**
     * @returns {RegExp|string} Pattern to match and group route parameters.
     */
    getRouteParameterPattern(): RegExp | string {
        return this.getOption('routeParameterPattern');
    }

    /**
     * @returns {RegExp} The default route parameter pattern.
     */
    getDefaultRouteParameterPattern(): RegExp {
        return /\{([^}]+)\}/;
    }

    /**
     * @returns {Object} This class' default options.
     */
    getDefaultOptions(): Options {
        return {

            // Default HTTP methods for requests.
            methods: this.getDefaultMethods(),

            // Default route parameter interpolation pattern.
            routeParameterPattern: this.getDefaultRouteParameterPattern(),

            // The HTTP status code to use for indicating a validation error.
            validationErrorStatus: 422,
        };
    }

    /**
     * @param {Array|string} path     Option path resolved by `get`
     * @param {*}            fallback Fallback value if the option is not set.
     *
     * @returns {*} The value of the given option path.
     */
    getOption(path: string | string[], fallback: any = null): any {
        return get(this._options, path, fallback);
    }

    /**
     * @returns {Object} This instance's default options.
     */
    options(): Options {
        return {};
    }

    /**
     * Sets an option.
     *
     * @param {string} path
     * @param {*}      value
     */
    setOption(path: string, value: any): void {
        set(this._options, path, value);
    }

    /**
     * Sets all given options. Successive values for the same option won't be
     * overwritten, so this follows the 'defaults' behaviour, and not 'merge'.
     *
     * @param {...Object} options One or more objects of options.
     */
    setOptions(...options: Options[]): void {
        Vue.set(this, '_options', defaultsDeep(
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
    getOptions(): Options {
        return defaultTo(this._options, {});
    }

    /**
     * Returns a function that translates a route key and parameters to a URL.
     *
     * @returns {Function} Will be passed `route` and `parameters`
     */
    getRouteResolver(): RouteResolver {
        return this.getDefaultRouteResolver();
    }

    /**
     * @returns {Object} An object consisting of all route string replacements.
     */
    getRouteReplacements(route: string, parameters: Record<string, string> = {}): Record<string, string> {
        const replace: Record<string, string> = {};
        let pattern: string | RegExp = this.getRouteParameterPattern();
        pattern = new RegExp(pattern instanceof RegExp ? pattern.source : pattern, 'g');

        for (let parameter: RegExpExecArray | null; (parameter = pattern.exec(route)) !== null; ) {
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
    getDefaultRouteResolver(): RouteResolver {
        return (route, parameters: Record<string, string> = {}): string => {
            let replacements: Record<string, string> = this.getRouteReplacements(route, parameters);

            // Replace all route parameters with their replacement values.
            return reduce(replacements, (result, value, parameter): string => {
                return replace(result, parameter, value);
            }, route);
        };
    }

    /**
     * @returns {Object} The data to send to the server when saving this model.
     */
    getDeleteBody(): any {
        return {};
    }

    /**
     * @returns {Object} Query parameters that will be appended to the `fetch` URL.
     */
    getFetchQuery(): Record<string, any> {
        return {};
    }

    /**
     * @returns {Object} Query parameters that will be appended to the `save` URL.
     */
    getSaveQuery(): Record<string, any> {
        return {};
    }

    /**
     * @returns {Object} Query parameters that will be appended to the `delete` URL.
     */
    getDeleteQuery(): Record<string, any> {
        return {};
    }

    /**
     * @returns {string} The key to use when generating the `fetch` URL.
     */
    getFetchRoute(): string {
        return this.getRoute('fetch');
    }

    /**
     * @returns {string} The key to use when generating the `save` URL.
     */
    getSaveRoute(): string {
        return this.getRoute('save');
    }

    /**
     * @returns {string} The key to use when generating the `delete` URL.
     */
    getDeleteRoute(): string {
        return this.getRoute('delete');
    }

    /**
     * @returns {Object} Headers to use when making any request.
     */
    getDefaultHeaders(): Record<string, any> {
        return {};
    }

    /**
     * @returns {Object} Headers to use when making a save request.
     */
    getSaveHeaders(): Record<string, any> {
        return this.getDefaultHeaders();
    }

    /**
     * @returns {Object} Headers to use when making a fetch request.
     */
    getFetchHeaders(): Record<string, any> {
        return this.getDefaultHeaders();
    }

    /**
     * @returns {Object} Headers to use when making a delete request.
     */
    getDeleteHeaders(): Record<string, any> {
        return this.getDefaultHeaders();
    }

    /**
     * @returns {Object} Default HTTP methods.
     */
    getDefaultMethods(): object {
        return {
            fetch:  'GET',
            save:   'POST',
            update: 'POST',
            create: 'POST',
            patch:  'PATCH',
            delete: 'DELETE',
        };
    }

    /**
     * @returns {string} HTTP method to use when making a save request.
     */
    getSaveMethod(): Method {
        return this.getOption('methods.save');
    }

    /**
     * @returns {string} HTTP method to use when making a fetch request.
     */
    getFetchMethod(): Method {
        return this.getOption('methods.fetch');
    }

    /**
     * @returns {string} HTTP method to use when updating a resource.
     */
    getUpdateMethod(): Method {
        return this.getOption('methods.update');
    }

    /**
     * @returns {string} HTTP method to use when patching a resource.
     */
    getPatchMethod(): Method {
        return this.getOption('methods.patch');
    }

    /**
     * @returns {string} HTTP method to use when creating a resource.
     */
    getCreateMethod(): Method {
        return this.getOption('methods.create');
    }

    /**
     * @returns {string} HTTP method to use when deleting a resource.
     */
    getDeleteMethod(): Method {
        return this.getOption('methods.delete');
    }

    /**
     * @returns {number} The HTTP status code that indicates a validation error.
     */
    getValidationErrorStatus(): number {
        return defaultTo(this.getOption('validationErrorStatus'), 422);
    }

    /**
     * @returns {boolean} `true` if the response indicates a validation error.
     */
    isBackendValidationError(error: RequestError | any): boolean {

        // The error must have a response for it to be a validation error.
        if ( ! invoke(error, 'getResponse')) {
            return false;
        }

        let status: number  = (error as RequestError).getResponse().getStatus();
        let invalid: number = this.getValidationErrorStatus();

        return status === invalid;
    }

    /**
     * @return {string|undefined} Route value by key.
     */
    getRoute(key: string, fallback?: string): string {
        let route: string | undefined = get(this.routes(), key, fallback ? get(this.routes(), fallback) : undefined);

        if ( ! route) {
            throw new Error(`Invalid or missing route`);
        }

        return route;
    }

    /**
     * @returns {string} The full URL to use when making a fetch request.
     */
    getFetchURL(): string {
        return this.getURL(this.getFetchRoute(), this.getRouteParameters());
    }

    /**
     * @returns {string} The full URL to use when making a save request.
     */
    getSaveURL(): string {
        return this.getURL(this.getSaveRoute(), this.getRouteParameters());
    }

    /**
     * @returns {string} The full URL to use when making a delete request.
     */
    getDeleteURL(): string {
        return this.getURL(this.getDeleteRoute(), this.getRouteParameters());
    }

    /**
     * @param {string} route      The route key to use to generate the URL.
     * @param {Object} parameters Route parameters.
     *
     * @returns {string} A URL that was generated using the given route key.
     */
    getURL(route: string, parameters: Record<string, any> = {}): string {
        return this.getRouteResolver()(route, parameters);
    }

    /**
     * @returns {Request} A new `Request` using the given configuration.
     */
    createRequest(config: AxiosRequestConfig): Request {
        return new Request(config);
    }

    /**
     * Creates a request error based on a given existing error and optional response.
     */
    createRequestError(error: any, response: Response): RequestError {
        return new RequestError(error, response);
    }

    /**
     * Creates a response error based on a given existing error and response.
     */
    createResponseError(error: any, response?: Response): ResponseError {
        return new ResponseError(error, response);
    }

    /**
     * Creates a validation error using given errors and an optional message.
     */
    createValidationError(errors: Errors | Errors[], message?: string): ValidationError {
        return new ValidationError(errors, message);
    }

    /**
     * This is the central component for all HTTP requests and handling.
     *
     * @param  {Object}     config      Request configuration
     * @param  {function}   onRequest   Called before the request is made.
     * @param  {function}   onSuccess   Called when the request was successful.
     * @param  {function}   onFailure   Called when the request failed.
     */
    request(config: AxiosRequestConfig | (() => AxiosRequestConfig), onRequest: OnRequestCallback,
            onSuccess: RequestSuccessCallback, onFailure: RequestFailureCallback): Promise<Response | null> {
        return new Promise((resolve, reject): Promise<void> => {
            return onRequest().then((status: RequestOperation | boolean): void | Promise<void> => {
                switch (status) {
                    case RequestOperation.REQUEST_CONTINUE:
                        break;
                    case RequestOperation.REQUEST_SKIP:
                        return;
                    case RequestOperation.REQUEST_REDUNDANT: // Skip, but consider it a success.
                        onSuccess(null);
                        resolve(null);
                        return;
                }

                // Support passing the request configuration as a function, to allow
                // for deferred resolution of certain values that may have changed
                // during the call to "onRequest".
                if (isFunction(config)) {
                    config = config();
                }

                // Make the request.
                return this
                    .createRequest(config)
                    .send()
                    .then((response): void => {
                        onSuccess(response);
                        resolve(response);
                    })
                    .catch((error: ResponseError): void => {
                        onFailure(error, error.response);
                        reject(error);
                    })
                    .catch(reject); // For errors that occur in `onFailure`.
            }).catch(reject);
        });
    }

    abstract onFetch(): Promise<RequestOperation>;
    abstract onFetchFailure(error: any, response: Response | undefined): void;
    abstract onFetchSuccess(response: Response | null): void;

    /**
     * Fetches data from the database/API.
     *
     * @param {options}             Fetch options
     * @param {options.method}      Fetch HTTP method
     * @param {options.url}         Fetch URL
     * @param {options.params}      Query params
     * @param {options.headers}     Query headers
     *
     * @returns {Promise}
     */
    fetch(options: RequestOptions = {}): Promise<Response | null> {
        let config = (): AxiosRequestConfig => {
            return {
                url: defaultTo(options.url, this.getFetchURL()),
                method: defaultTo(options.method, this.getFetchMethod()),
                params: defaults(options.params, this.getFetchQuery()),
                headers: defaults(options.headers, this.getFetchHeaders()),
            }
        };

        return this.request(
            config,
            this.onFetch,
            this.onFetchSuccess,
            this.onFetchFailure
        );
    }

    abstract getSaveData(): Record<any, any>;
    abstract onSave(): Promise<RequestOperation>;
    abstract onSaveFailure(error: any, response: Response | undefined): void;
    abstract onSaveSuccess(response: BaseResponse | null): void;

    /**
     * Persists data to the database/API.
     *
     * @param {options}             Save options
     * @param {options.method}      Save HTTP method
     * @param {options.url}         Save URL
     * @param {options.data}        Save data
     * @param {options.params}      Query params
     * @param {options.headers}     Query headers
     *
     * @returns {Promise}
     */
    save(options: RequestOptions = {}): Promise<Response | null> {
        let config = (): AxiosRequestConfig => {
            return {
                url: defaultTo(options.url, this.getSaveURL()),
                method: defaultTo(options.method, this.getSaveMethod()),
                data: defaultTo(options.data, this.getSaveData()),
                params: defaultTo(options.params, this.getSaveQuery()),
                headers: defaultTo(options.headers, this.getSaveHeaders()),
            }
        };

        return this.request(
            config,
            this.onSave,
            this.onSaveSuccess,
            this.onSaveFailure
        );
    }

    /**
     * Converts given data to FormData for uploading.
     *
     * @param  {Object} data
     * @returns {FormData}
     */
    convertObjectToFormData(data: Record<string, string | Blob>): FormData {
        let form: FormData = new FormData();

        each(data, (value, key): void => {
            form.append(key, value);
        });

        return form;
    }

    /**
     * Persists data to the database/API using FormData.
     *
     * @param {options}             Save options
     * @param {options.method}      Save HTTP method
     * @param {options.url}         Save URL
     * @param {options.params}      Query params
     * @param {options.headers}     Query headers
     *
     * @returns {Promise}
     */
    upload(options: Record<any, any> = {}): Promise<Response | null> {
        let data: any = defaultTo(options.data, this.getSaveData());

        let config: object = (): object => assign(options, {
            data: this.convertObjectToFormData(data),
        });

        return this.save(config);
    }

    abstract onDelete(): Promise<RequestOperation>;
    abstract onDeleteFailure(error: any, response: Response | undefined): void;
    abstract onDeleteSuccess(response: Response | null): void;

    /**
     * Removes model or collection data from the database/API.
     *
     * @param {options}             Delete options
     * @param {options.method}      Delete HTTP method
     * @param {options.url}         Delete URL
     * @param {options.params}      Query params
     * @param {options.headers}     Query headers
     *
     * @returns {Promise}
     */
    delete(options: RequestOptions = {}): Promise<Response | null> {
        let config = (): AxiosRequestConfig => {
            return {
                url: defaultTo(options.url, this.getDeleteURL()),
                method: defaultTo(options.method, this.getDeleteMethod()),
                data: defaultTo(options.data, this.getDeleteBody()),
                params: defaultTo(options.params, this.getDeleteQuery()),
                headers: defaultTo(options.headers, this.getDeleteHeaders()),
            }
        };

        return this.request(
            config,
            this.onDelete,
            this.onDeleteSuccess,
            this.onDeleteFailure
        );
    }
}

export default Base;

export interface Options {
    [key: string]: any;
    model?: typeof Model;
    methods?: Partial<Record<RequestType, HttpMethods>>;
    routeParameterPattern?: RegExp;
    // validationErrorStatus?: number;
    useDeleteBody?: boolean;
}

export type Routes = Record<'fetch' | 'save' | 'delete' | string, string>;
export type Listener = (context: Record<string, any>) => void;
export type RouteResolver = (route: string, parameters: Record<string, string>) => string;
export type RequestFailureCallback = (error: any, response: Response | undefined) => void;
export type RequestSuccessCallback = (response: Response | null) => void;
export type OnRequestCallback = () => Promise<number | boolean>;
export type HttpMethods = 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE' | string;
export type RequestType = 'fetch' | 'save' | 'update' | 'create' | 'patch' | 'delete' | string;

export interface RequestOptions {
    url?: string;
    method?: Method;
    data?: any;
    params?: Record<string, any>;
    headers?: Record<string, any>;
}
