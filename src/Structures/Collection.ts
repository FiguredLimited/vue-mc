import Vue from 'vue';

import countBy from 'lodash/countBy';
import defaultsDeep from 'lodash/defaultsDeep';
import each from 'lodash/each';
import every from 'lodash/every';
import filter from 'lodash/filter';
import find from 'lodash/find';
import findIndex from 'lodash/findIndex';
import first from 'lodash/first';
import get from 'lodash/get';
import has from 'lodash/has';
import isArray from 'lodash/isArray';
import isEmpty from 'lodash/isEmpty';
import isFunction from 'lodash/isFunction';
import isNil from 'lodash/isNil';
import isObject from 'lodash/isObject';
import isPlainObject from 'lodash/isPlainObject';
import join from 'lodash/join';
import keyBy from 'lodash/keyBy';
import last from 'lodash/last';
import map from 'lodash/map';
import max from 'lodash/max';
import merge from 'lodash/merge';
import method from 'lodash/method';
import reduce from 'lodash/reduce';
import set from 'lodash/set';
import size from 'lodash/size';
import sortBy from 'lodash/sortBy';
import sumBy from 'lodash/sumBy';
import toSafeInteger from 'lodash/toSafeInteger';
import unset from 'lodash/unset';
import values from 'lodash/values';

import Base, {Options, RequestOperation} from './Base';
import Model, {ValidationResultErrorFinalResult} from './Model';
import ResponseError from '../Errors/ResponseError';
import ValidationError from '../Errors/ValidationError';
import ProxyResponse from '../HTTP/ProxyResponse';
import Response from '../HTTP/Response';

/**
 * Used as a marker to indicate that pagination is not enabled.
 */
const NO_PAGE = null;

/**
 * Used as a marker to indicate that a collection has paged through all results.
 */
const LAST_PAGE = 0;

/**
 * Base collection class.
 */
class Collection extends Base {
    models!: Model[];

    readonly loading!: boolean;
    readonly saving!: boolean;
    readonly deleting!: boolean;
    readonly fatal!: boolean;

    private readonly _attributes!: Record<string, any>;
    private readonly _page!: number | null;
    private readonly _registry!: Record<string, string>;

    /**
     * Accessor to support Array.length semantics.
     */
    get length(): number {
        return this.size();
    }

    /**
     * Creates a new instance, called when using 'new'.
     *
     * @param  {Array}  [models]    Models to add to this collection.
     * @param  {Object} [options]   Extra options to set on this collection.
     */
    constructor(models: Model[] = [], options: Options = {}, attributes: Record<string, any> = {}) {
        super(options);

        Vue.set(this, 'models', []);      // Model store.
        Vue.set(this, '_attributes', {}); // Property store.
        Vue.set(this, '_registry', {});   // Model registry.
        Vue.set(this, '_page', NO_PAGE);

        this.clearState();

        // Set all given attributes.
        this.set(defaultsDeep({}, attributes, this.defaults()));

        // Add all given models (if any) to this collection. We explicitly ask
        // for the values here as it's common for some sources to be objects.
        if (models) {
            this.add(values(models));
        }
    }

    /**
     * Creates a copy of this collection. Model references are preserved so
     * changes to the models inside the clone will also affect the subject.
     *
     * @returns {Collection}
     */
    clone(): Collection {
        return new (this.constructor as typeof Collection)
        (this.getModels(), this.getOptions(), this.getAttributes());
    }

    /**
     * @return {Model} The class/constructor for this collection's model type.
     */
    model(): typeof Model {
        return this.getOption('model');
    }

    /**
     * @return {Object} Default attributes
     */
    defaults(): Record<string, any> {
        return {};
    }

    /**
     * @return {*} The value of an attribute, or a given fallback if not set.
     */
    get(attribute: string, fallback?: any): any {
        return get(this._attributes, attribute, fallback);
    }

    /**
     * Sets an attribute's value, or an object of attributes.
     *
     * @param {string|Object} attribute
     * @param {*}             value
     */
    //    set<T>(attribute: string | Record<string, any>, value?: T): T | undefined
    set(attribute: string | Record<string, any>, value?: any): void {
        if (isPlainObject(attribute)) {
            each(attribute as Record<string, any>, (value, key): void => {
                this.set(key, value);
            });

            return;
        }

        Vue.set(this._attributes, attribute as string, value);
    }

    /**
     * @return {Object}
     */
    getAttributes(): Record<string, any> {
        return this._attributes;
    }

    /**
     * @return {Model[]}
     */
    getModels(): Model[] {
        return this.models;
    }

    /**
     * Returns the default options for this model.
     *
     * @returns {Object}
     */
    getDefaultOptions(): Options {
        return merge(super.getDefaultOptions(), {

            // The class/constructor for this collection's model type.
            model: Model,

            // Whether this collection should send model identifiers as JSON
            // in the body of a delete request, instead of a query parameter.
            useDeleteBody: true,
        });
    }

    /**
     * @returns {Object} Parameters to use for replacement in route patterns.
     */
    getRouteParameters(): Record<string, any> {
        return merge({}, super.getRouteParameters(), this._attributes, {
            page: this._page,
        });
    }

    /**
     * Removes all errors from the models in this collection.
     */
    clearErrors(): void {
        each(this.models, method('clearErrors'));
    }

    /**
     * Resets model state, ie. `loading`, etc back to their initial states.
     */
    clearState(): void {
        Vue.set(this, 'loading', false);
        Vue.set(this, 'saving', false);
        Vue.set(this, 'deleting', false);
        Vue.set(this, 'fatal', false);
    }

    /**
     * Removes all models from this collection.
     */
    clearModels(): void {
        let models: Model[] = this.models;

        // Clear the model store, but keep a reference.
        Vue.set(this, 'models', []);

        // Notify each model that it has been removed from this collection.
        each(models, (model: Model): void => {
            this.onRemove(model);
        });
    }

    /**
     * Removes all models from this collection.
     */
    clear(): void {
        this.clearModels();
        this.clearState();
    }

    /**
     * Syncs all models in this collection. This method delegates to each model
     * so follows the same signature and effects as `Model.sync`.
     */
    sync(): void {
        each(this.models, method('sync'));
    }

    /**
     * Resets all models in this collection. This method delegates to each model
     * so follows the same signature and effects as `Model.reset`.
     *
     * @param {string|string[]} attribute
     */
    reset(...attribute: string[]): void {
        each(this.models, method('reset', ...attribute));
    }

    /**
     * Returns the number of models in this collection.
     */
    size(): number {
        return size(this.models);
    }

    /**
     * @returns {boolean} `true` if the collection is empty, `false` otherwise.
     */
    isEmpty(): boolean {
        return this.size() === 0;
    }

    /**
     * @returns {Object} A native representation of this collection that will
     *                   determine the contents of JSON.stringify(collection).
     */
    toJSON(): Model[] {
        return this.models;
    }

    /**
     * @returns {Promise}
     */
    validate(): Promise<(ValidationResultErrorFinalResult)[]> {
        let validations = this.models.map((model): Promise<ValidationResultErrorFinalResult> => model.validate());

        return Promise.all(validations)
            .then((errors: ValidationResultErrorFinalResult[]): ValidationResultErrorFinalResult[] => {
                return every(errors, isEmpty) ? [] : errors;
            });

    }

    /**
     * Create a new model of this collection's model type.
     *
     * @param {Object} attributes
     *
     * @returns {Model} A new instance of this collection's model.
     */
    createModel(attributes: Record<string, any>): Record<string, any> {
        return new (this.model())(attributes);
    }

    /**
     * Removes a model from the model registry.
     *
     * @param {Model} model
     */
    removeModelFromRegistry(model: Model): void {
        unset(this._registry, model._uid);
    }

    /**
     * @return {Boolean} true if this collection has the model in its registry.
     */
    hasModelInRegistry(model: Model): boolean {
        return has(this._registry, model._uid);
    }

    /**
     * Adds a model from the model registry.
     *
     * @param {Model} model
     */
    addModelToRegistry(model: Model): void {
        set(this._registry, model._uid, 1);
    }

    /**
     * Called when a model has been added to this collection.
     *
     * @param {Model} model
     */
    onAdd(model: Model): void {
        model.registerCollection(this);
        this.addModelToRegistry(model);
        this.emit('add', {model});
    }

    /**
     * Adds a model to this collection.
     *
     * This method returns a single model if only one was given, but will return
     * an array of all added models if an array was given.
     *
     * @param {Model|Array|Object} model Adds a model instance or plain object,
     *                                   or an array of either, to this collection.
     *                                   A model instance will be created and
     *                                   returned if passed a plain object.
     *
     * @returns {Model|Array} The added model or array of added models.
     */
    add(model: Model[]): Model[];
    add(model?: Model | Partial<Model> | Record<string, any>): Model;
    add(model?: Model | Model[] | Partial<Model> | Record<string, any>): Model | Model[] | Partial<Model> | Record<string, any> | void {

        // If given an array, assume an array of models and add them all.
        if (isArray(model)) {
            return filter(map(model as Model[], this.add));
        }

        // Objects should be converted to model instances first, then added.
        if (isPlainObject(model)) {
            return this.add(this.createModel(model as Partial<Model> | Record<string, any>));
        }

        // This is also just to catch a potential bug. All models should have
        // an auto id so this would indicate an unexpected state.
        if (!this.isModel(model)) {
            throw new Error('Expected a model, plain object, or array of either');
        }

        // Make sure we don't add the same model twice.
        if (this.hasModelInRegistry(model as Model)) {
            return;
        }

        // Add the model instance to this collection.
        this.models.push(model as Model);
        this.onAdd(model as Model);

        // We're assuming that the collection is not loading once a model is added.
        Vue.set(this, 'loading', false);

        return model;
    }

    /**
     * Called when a model has been removed from this collection.
     *
     * @param {Model} model
     */
    onRemove(model: Model): void {
        model.unregisterCollection(this);
        this.removeModelFromRegistry(model);
        this.emit('remove', {model});
    }

    /**
     * Removes a model at a given index.
     *
     * @param  {number} index

     * @returns {Model} The model that was removed, or `undefined` if invalid.
     * @throws  {Error} If a model could not be found at the given index.
     */
    _removeModelAtIndex(index: number): Model | undefined {
        if (index < 0) {
            return;
        }

        let model: Model = get(this.models, index);
        Vue.delete(this.models, index);
        this.onRemove(model);

        return model;
    }

    /**
     * Removes a `Model` from this collection.
     *
     * @param  {Model} model
     *
     * @return {Model}
     */
    _removeModel(model: Model): Model | undefined {
        return this._removeModelAtIndex(this.indexOf(model));
    }

    /**
     * Removes the given model from this collection.
     *
     * @param  {Model|Object|Array} model Model to remove, which can be a `Model`
     *                                    instance, an object to filter by,
     *                                    a function to filter by, or an array
     *                                    of any of the above to remove multiple.
     *
     * @return {Model|Model[]} The deleted model or an array of models if a filter
     *                         or array type was given.
     *
     * @throws {Error} If the model is an invalid type.
     */
    remove(model: Model): Model;
    remove(model: Model[] | Partial<Model> | ((model: Model) => boolean)): Model[];
    remove(model: Model | Model[] | Partial<Model> | ((model: Model) => boolean)): Model | Model[] | undefined {
        if (!model) {
            throw new Error('Expected function, object, array, or model to remove');
        }

        // Support using a predicate to remove all models it returns true for.
        // Alternatively support an object of values to filter by.
        if (isFunction(model) || isPlainObject(model)) {
            return this.remove(filter(this.models, model));
        }

        // Support removing multiple models at the same time if an array was
        // given. A model would otherwise always be an object so this is safe.
        if (isArray(model)) {
            return filter(map<Model, Model>(model, this.remove));
        }

        // This is just to catch a potential bug. All models should have
        // an auto id here so this would indicate an unexpected state.
        if (!this.isModel(model)) {
            throw new Error('Model to remove is not a valid model');
        }

        return this._removeModel(model as Model);
    }

    /**
     * Determines whether a given value is an instance of a model.
     *
     * @param  {*} candidate A model candidate
     *
     * @return {boolean} `true` if the given `model` is an instance of Model.
     */
    isModel(candidate: any): boolean {
        return isObject(candidate)
            && has(candidate, '_attributes')
            && has(candidate, '_uid');
    }

    /**
     * Returns the zero-based index of the given model in this collection.
     *
     * @see {@link https://lodash.com/docs/#findIndex}
     *
     * @return {number} the index of a model in this collection, or -1 if not found.
     */
    indexOf(model: Model): number {
        let filter: Model | { _uid: string } = model;

        // Getting the index of a model instance can be optimised.
        if (this.isModel(filter)) {

            // Constant time check, if the registry doesn't have a record of
            // the model, we know it's not in the collection.
            if (!has(this._registry, model._uid)) {
                return -1;
            }

            // There is no need to filter on the entire object, because the
            // unique ID of the model is all we need to identify it.
            filter = {_uid: model._uid};
        }

        return findIndex(this.models, filter);
    }

    /**
     * @param {string|function|Object} where
     *
     * @return {Model} The first model that matches the given criteria, or
     *                 `undefined` if none could be found.
     *
     * @see {@link https://lodash.com/docs/#find}
     */
    find(where: Predicate): Model | undefined {
        return find<Model>(this.models, where);
    }

    /**
     * Creates a new collection of the same type that contains only the models
     * for which the given predicate returns `true` for, or matches by property.
     *
     * @see {@link where}
     *
     * Important: Even though this returns a new collection, the references to
     *            each model are preserved, so changes will propagate to both.
     *
     * @param {function|Object|string} predicate Receives `model`.
     *
     * @returns {Collection}
     */
    filter(predicate: Predicate): Collection {
        let result: Collection = this.clone();

        result.models = filter(result.models, predicate) as Model[];
        return result;
    }

    /**
     * Returns the models for which the given predicate returns `true` for,
     * or models that match attributes in an object.
     *
     * @see {@link https://lodash.com/docs/#filter}
     *
     * @param {function|Object|string} predicate Receives `model`.
     *
     * @returns {Model[]}
     */
    where(predicate: Predicate): Model[] {
        return filter<Model>(this.models, predicate);
    }

    /**
     * Returns an array that contains the returned result after applying a
     * function to each model in this collection.
     *
     * @see {@link https://lodash.com/docs/#map}
     *
     * @param {function} callback Receives `model`.
     *
     * @return {Model[]}
     */
    map<T = Model>(callback: string | ((model: Model) => T)): T[] {
        return map<Model, T>(this.models, callback as _.ArrayIterator<Model, T>);
    }

    // TODO:  as (string | _.ArrayIterator<Model, T>)

    /**
     * Iterates through all models, calling a given callback for each one.
     *
     * @see {@link https://lodash.com/docs/#each}
     *
     * @param {function} callback Receives `model` and `index`.
     */
    each(callback: (model: Model) => void): void {
        return each(this.models, callback) as unknown as void;
    }

    /**
     * Reduces this collection to a value which is the accumulated result of
     * running each model through `iteratee`, where each successive invocation
     * is supplied the return value of the previous.
     *
     * If `initial` is not given, the first model of the collection is used
     * as the initial value.
     *
     * @param {function} iteratee Invoked with three arguments:
     *                            (result, model, index)
     *
     * @param {*} [initial] The initial value to use for the `result`.
     *
     * @returns {*} The final value of result, after the last iteration.
     */
    reduce<U = Model>(iteratee: (result: U | undefined, model: Model, index: number) => U, initial?: U): U | undefined {

        // Use the first model as the initial value if an initial was not given.
        if (arguments.length === 1) {
            initial = this.first() as (U | undefined);
        }

        return reduce(this.models, iteratee, initial);
    }

    /**
     * @param {function|string} iteratee Attribute name or callback to determine
     *                                   which values to sum by. Invoked with a
     *                                   single argument `model`.
     *
     * @returns {number} Sum of all models, accessed by attribute or callback.
     */
    sum(iteratee: ((model: Model) => number) | string): number {
        return sumBy(this.models, iteratee);
    }

    /**
     * Returns an object composed of keys generated from the results of running
     * each model through `iteratee`. The corresponding value of each key is the
     * number of times the key was returned by iteratee.
     *
     * @see {@link https://lodash.com/docs/#countBy}
     *
     * @returns {Object}
     */
    count(iteratee: (model: Model) => any): Record<string, number> {
        return countBy(this.models, iteratee);
    }

    /**
     * Sorts this collection's models using a comparator. This method performs
     * a stable sort (it preserves the original sort order of equal elements).
     *
     * @see {@link https://lodash.com/docs/#sortBy}
     *
     * @param {function|string} comparator Attribute name or attribute function,
     *                                     invoked with a single arg `model`.
     */
    sort(comparator: ((model: Model) => any) | string): void {
        Vue.set(this, 'models', sortBy(this.models, comparator));
    }

    /**
     * @param {Model|Object} model
     *
     * @returns {boolean} `true` if this collection contains the given model,
     *                    `false` otherwise.
     */
    has(model: Model): boolean {
        return this.indexOf(model) >= 0;
    }

    /**
     * @returns {Model|undefined} The first model of this collection.
     */
    first(): Model | undefined {
        return first(this.models);
    }

    /**
     * @returns {Model|undefined} The last model of this collection.
     */
    last(): Model | undefined {
        return last(this.models);
    }

    /**
     * Removes and returns the first model of this collection, if there was one.
     *
     * @returns {Model|undefined} Removed model or undefined if there were none.
     */
    shift(): Model | undefined {
        if (!this.isEmpty()) {
            return this._removeModelAtIndex(0);
        }
    }

    /**
     * Removes and returns the last model of this collection, if there was one.
     *
     * @returns {Model|undefined} Removed model or undefined if there were none.
     */
    pop(): Model | undefined {
        if (!this.isEmpty()) {
            return this._removeModelAtIndex(this.size() - 1);
        }
    }

    /**
     * Replaces all models in this collection with those provided. This is
     * effectively equivalent to `clear` and `add`, and will result in an empty
     * collection if no models were provided.
     *
     * @param {Model|Model[]} models Models to replace the current models with.
     */
    replace(models: Model | Model[]): void {
        this.clearModels();
        this.add(values(models));
    }

    /**
     * Returns the query parameters that should be used when paginating.
     *
     * @return {Object}
     */
    getPaginationQuery(): { page: number | null } {
        return {
            page: this._page,
        };
    }

    /**
     * @inheritDoc
     */
    getFetchQuery(): Record<string, any> {
        if (this.isPaginated()) {
            return this.getPaginationQuery();
        }

        return super.getFetchQuery();
    }

    /**
     * @param {Object} response
     *
     * @returns {Array|null} Models from the response.
     */
    getModelsFromResponse(response: Response): any {
        let models: unknown = response.getData();

        // An empty, non-array response indicates that we didn't intend to send
        // any models in the response. This means that the current models are
        // already up to date, as no changes are necessary.
        if (isNil(models) || models === '') {
            return null;
        }

        // We're making an assumption here that paginated models are returned
        // within the "data" field of the response.
        if (this.isPaginated()) {
            return get(models, 'data', models);
        }

        return models;
    }

    /**
     * Called when a save request was successful.
     *
     * @param {Object} response
     */
    onSaveSuccess(response: Response): void {

        // Model data returned in the response.
        let saved: unknown = this.getModelsFromResponse(response);

        // All the models that are currently being saved.
        let saving: Model[] = this.getSavingModels();

        // Empty response is similar to an empty response returned when saving
        // a model: assume that the attributes are the saved state, so sync.
        if (isNil(saved)) {
            each(saving, method('sync'));

        } else {

            // There is no sensible alternative to an array here, so anyting else
            // is considered an exception that indicates an unexpected state.
            if (!isArray(saved)) {
                throw this.createResponseError('Response data must be an array or empty', response);
            }

            // Check that the number of models returned in the response matches
            // the number of models that were saved. If these are not equal, it's
            // not possible to map saved data to the saving models.
            if (saved.length !== saving.length) {
                throw this.createResponseError('Expected the same number of models in the response', response);
            }

            // Update every model with its respective response data.
            // A strict requirement and assumption is that the models returned
            // in the response are in the same order as they are in the collection.
            each(saved, (data, index): void => {
                saving[index].onSaveSuccess(new ProxyResponse(
                    200, data, response.getHeaders()
                ));
            });
        }

        Vue.set(this, 'saving', false);
        Vue.set(this, 'fatal', false);

        this.emit('save', {error: null});
    }

    /**
     * @returns {Model[]} Models in this collection that are in a "saving" state.
     */
    getSavingModels(): Model[] {
        return filter(this.models, 'saving');
    }

    /**
     * @returns {Model[]} Models in this collection that are in a "deleting" state.
     */
    getDeletingModels(): Model[] {
        return filter(this.models, 'deleting');
    }

    /**
     * Applies an array of validation errors to this collection's models.
     *
     * @param  {Array}   errors
     * @param  {integer} status Response status
     */
    applyValidationErrorArray(errors: any[]): void {
        let models: Model[] = this.getSavingModels();

        // To allow matching errors with models, it's a strict requirement and
        // assumption that the array of errors returned in the response must have
        // the same number of elements as there are models being saved.
        if (errors.length !== models.length) {
            throw this.createResponseError('Array of errors must equal the number of models');
        }

        // Set every model's errors in a way that emulates how saving a model
        // would fail in the same way.
        //
        // A strict requirement and assumption is that the models returned
        // in the response are in the same order as they are in the collection.
        each(models, (model, index): void => {
            model.setErrors(errors[index]);
            Vue.set(model, 'saving', false);
            Vue.set(model, 'fatal', false);
        });
    }

    /**
     * Applies an object of validation errors keyed by model identifiers.
     *
     * @param  {Array}   errors
     * @param  {integer} status Response status
     */
    applyValidationErrorObject(errors: Record<string, Record<string, string | string[]>>): void {
        let lookup: Record<string, Model> = keyBy(this.models, (model): string => model.identifier());

        each(errors, (errors, identifier): void => {
            let model: Model = get(lookup, identifier);

            if (model) {
                model.setErrors(errors);
            }
        });
    }

    /**
     * Sets validation errors on this collection's models.
     *
     * @param {Array|Object} errors Either an array of length equal to the number
     *                              of models in this collection, or an object
     *                              of errors keyed by model identifiers.
     */
    setErrors(errors: any[] | Record<string, Record<string, string | string[]>>): void {

        // Support an array of errors, one for each model in the collection.
        if (isArray(errors)) {
            this.applyValidationErrorArray(errors);

            // Support an object of errors keyed by model identifiers.
        } else if (isPlainObject(errors)) {
            this.applyValidationErrorObject(errors);
        }
    }

    /**
     * @returns {Array} An array of this collection's validation errors.
     */
    getErrors(): Record<string, string | string[]>[] {
        return map(this.models, 'errors');
    }

    /**
     * Called when a save request resulted in a validation error.
     *
     * @param {Object} response
     */
    onSaveValidationFailure(error: any): void {
        let response: any = error.getResponse();
        let errors: any = response.getValidationErrors();

        if (!isPlainObject(errors) && !isArray(errors)) {
            throw this.createResponseError('Validation errors must be an object or array', response);
        }

        this.setErrors(errors);

        Vue.set(this, 'fatal', false);
        Vue.set(this, 'saving', false);
    }

    /**
     * Called when a save request resulted in an unexpected error,
     * eg. an internal server error (500)
     *
     * @param {Error}  error
     * @param {Object} response
     */
    onFatalSaveFailure(error: any, response?: any): void {
        each(this.getSavingModels(), (model): void => {
            model.onFatalSaveFailure(error, response);
        });

        Vue.set(this, 'fatal', true);
        Vue.set(this, 'saving', false);
    }

    /**
     * Called when a save request failed.
     *
     * @param {Error}  error
     * @param {Object} response
     */
    onSaveFailure(error: any): void {
        if (this.isBackendValidationError(error)) {
            this.onSaveValidationFailure(error);

            // Not a validation error, so something else went wrong.
        } else {
            this.onFatalSaveFailure(error);
        }

        this.emit('save', {error});
    }

    /**
     * @returns {Array} The data to use for saving.
     */
    getSaveData(): Record<string, any> {
        return map(this.getSavingModels(), method('getSaveData'));
    }

    /**
     * Sets the page on this collection, enabling pagination. To disable
     * pagination on this collection, pass page as `null` or `undefined`.
     *
     * @param {number|boolean} [page] Page number, or `null` to disable.
     *
     * @returns {Collection} This collection.
     */
    page(page: number | boolean): this {
        // Disable pagination if a valid page wasn't provided.
        if (isNil(page)) {
            Vue.set(this, '_page', NO_PAGE);

            // Page was provided, so we should either set the page or disable
            // pagination entirely if the page is `false`.
        } else {
            Vue.set(this, '_page', max([1, toSafeInteger(page)]));
        }

        return this;
    }

    /**
     * @returns {integer|null} The page that this collection is on.
     */
    getPage(): number | null {
        return this._page;
    }

    /**
     * @returns {boolean} Whether this collection is currently paginated.
     */
    isPaginated(): boolean {
        return this._page !== NO_PAGE;
    }

    /**
     * @returns {boolean} Whether this collection is on the last page,
     *                            ie. there won't be more results that follow.
     */
    isLastPage(): boolean {
        return this._page === LAST_PAGE;
    }

    /**
     * Responsible for adjusting the page and appending of models that were
     * received by a paginated fetch request.
     *
     * @param {Model[]} models
     */
    applyPagination(models: Model[]): void {

        // If no models were returned in the response we can assume that
        // we're now on the last page, and we should not continue.
        if (isEmpty(models)) {
            Vue.set(this, '_page', LAST_PAGE);

            // Otherwise, there were at least one model, and we can safely
            // assume that we want to increment the page number.
        } else {
            Vue.set(this, '_page', (this._page as number) + 1);
            this.add(models);
        }
    }

    /**
     * Called when a fetch request was successful.
     *
     * @param {Object} response
     */
    onFetchSuccess(response: Response): void {
        let models: any = this.getModelsFromResponse(response);

        // There is no sensible alternative to an array here, so anyting else
        // is considered an exception that indicates an unexpected state.
        if (!isArray(models)) {
            throw new ResponseError('Expected an array of models in fetch response');
        }

        // Append via pagination.
        if (this.isPaginated()) {
            this.applyPagination(models);

            // Replace all current models with the fetched ones.
        } else {
            this.replace(models);
        }

        Vue.set(this, 'loading', false);
        Vue.set(this, 'fatal', false);

        this.emit('fetch', {error: null});
    }

    /**
     * Called when a fetch request failed.
     *
     * @param {Error}  error
     */
    onFetchFailure(error: any): void {
        this.clearErrors();

        Vue.set(this, 'fatal', true);
        Vue.set(this, 'loading', false);

        this.emit('fetch', {error});
    }

    /**
     * Called before a fetch request is made.
     *
     * @returns {boolean|undefined} `false` if the request should not be made.
     */
    onFetch(): Promise<RequestOperation> {
        return new Promise((resolve): void => {

            // Don't fetch if there are no more results to be fetched.
            if (this.isPaginated() && this.isLastPage()) {
                return resolve(Base.REQUEST_SKIP);
            }

            // Because we're fetching new data, we can assume that this collection
            // is now loading. This allows the template to indicate a loading state.
            Vue.set(this, 'loading', true);
            resolve(Base.REQUEST_CONTINUE);
            return;
        });
    }

    /**
     * Called when a delete request was successful.
     *
     * @param {Object} response
     */
    onDeleteSuccess(response: Response): void {
        Vue.set(this, 'deleting', false);
        Vue.set(this, 'fatal', false);

        each(this.getDeletingModels(), (model): void => {
            model.onDeleteSuccess(response);
        });

        this.emit('delete', {error: null});
    }

    /**
     * Called when a delete request resulted in a general error.
     *
     * @param {Error}  error
     * @param {Object} response
     */
    onDeleteFailure(error: any): void {
        Vue.set(this, 'fatal', true);
        Vue.set(this, 'deleting', false);

        each(this.getDeletingModels(), (model): void => {
            model.onDeleteFailure(error);
        });

        this.emit('delete', {error});
    }

    /**
     * Called before a save request is made.
     *
     * @returns {boolean} Either `true` or false` if the request should not be
     *                    made, where `true` indicates that the request should
     *                    be considered a "success" rather than a "cancel".
     *
     */
    onSave(): Promise<RequestOperation> {
        // Don't save if we're already busy saving this collection.
        // This prevents things like accidental double clicks.
        if (this.saving) {
            return Promise.resolve(Base.REQUEST_SKIP);
        }

        let valid = true;
        let tasks: Promise<RequestOperation | void>[] = this.models.map((model): Promise<RequestOperation | void> => {
            return model.onSave().catch((error): void => {
                if (error instanceof ValidationError) {
                    valid = false;
                } else {
                    throw error;
                }
            });
        });

        // Call 'onSave' on each model so that the models can set their state
        // accordingly, and indicate whether a validation failure should occur.
        return Promise.all(tasks).then((): RequestOperation => {
            if (!valid) {
                throw new ValidationError(this.getErrors());
            }

            Vue.set(this, 'saving', true);
            return Base.REQUEST_CONTINUE;
        });
    }

    /**
     * Collect all model identifiers.
     *
     * @returns {Array}
     */
    getIdentifiers(models: Model[]): string[] {
        return map(models, method('identifier'));
    }

    /**
     * @inheritDoc
     */
    getDeleteBody(): string[] | {} {
        if (this.getOption('useDeleteBody')) {
            return this.getIdentifiers(this.getDeletingModels());
        }

        return {};
    }

    /**
     * @returns {string} The query parameter key to use for model identifiers.
     */
    getDeleteQueryIdenitifierKey(): string {
        return 'id';
    }

    /**
     * @inheritDoc
     */
    getDeleteQuery(): Record<string, string> {

        // Don't use query parameters if we want send the request data in the body.
        if (this.getOption('useDeleteBody')) {
            return {};
        }

        // Collect all the identifiers of the models being deleted.
        let models: Model[] = this.getDeletingModels();
        let identifier: string = this.getDeleteQueryIdenitifierKey();
        let identifiers: string[] = this.getIdentifiers(models);

        return {[identifier]: join(identifiers, ',')};
    }

    /**
     * Called before a delete request is made.
     *
     * @returns {boolean} `false` if the request should not be made.
     */
    onDelete(): Promise<RequestOperation> {
        if (this.deleting) {
            return Promise.resolve(Base.REQUEST_SKIP);
        }

        return Promise.all(this.models.map((m): Promise<RequestOperation> => m.onDelete()))
            .then((): RequestOperation => {
                // No need to do anything if no models should be deleted.
                if (isEmpty(this.getDeletingModels())) {
                    return Base.REQUEST_REDUNDANT;
                }

                Vue.set(this, 'deleting', true);
                return Base.REQUEST_CONTINUE;
            });
    }

    /**
     * Convert collection to Array. All models inside are converted to JSON
     *
     * @return {object[]} converted collection
     */
    toArray(): Record<string, any>[] {
        return this.map((model): Record<string, any> => model.toJSON());
    }
}

export default Collection;

export type Predicate<T = boolean> = ((model: Model) => T) | string | Record<string, any> | Model | Partial<Model>;
