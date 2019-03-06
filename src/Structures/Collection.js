import Vue              from 'vue'
import Base             from './Base.js'
import Model            from './Model.js'
import ResponseError    from '../Errors/ResponseError.js'
import ValidationError  from '../Errors/ValidationError.js'
import ProxyResponse    from '../HTTP/ProxyResponse.js'
import countBy from 'lodash/countBy'
import defaultsDeep from 'lodash/defaultsDeep'
import each from 'lodash/each'
import filter from 'lodash/filter'
import find from 'lodash/find'
import findIndex from 'lodash/findIndex'
import first from 'lodash/first'
import get from 'lodash/get'
import has from 'lodash/has'
import isArray from 'lodash/isArray'
import isEmpty from 'lodash/isEmpty'
import isFunction from 'lodash/isFunction'
import isNil from 'lodash/isNil'
import isObject from 'lodash/isObject'
import isPlainObject from 'lodash/isPlainObject'
import join from 'lodash/join'
import keyBy from 'lodash/keyBy'
import last from 'lodash/last'
import map from 'lodash/map'
import max from 'lodash/max'
import merge from 'lodash/merge'
import method from 'lodash/method'
import reduce from 'lodash/reduce'
import set from 'lodash/set'
import size from 'lodash/size'
import sortBy from 'lodash/sortBy'
import sumBy from 'lodash/sumBy'
import toSafeInteger from 'lodash/toSafeInteger'
import unset from 'lodash/unset'
import values from 'lodash/values'

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

    /**
     * Accessor to support Array.length semantics.
     */
    get length() {
        return this.size();
    }

    /**
     * Creates a new instance, called when using 'new'.
     *
     * @param  {Array}  [models]    Models to add to this collection.
     * @param  {Object} [options]   Extra options to set on this collection.
     */
    constructor(models = [], options = {}, attributes = {}) {
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
    clone() {
        return new (this.constructor)
            (this.getModels(), this.getOptions(), this.getAttributes());
    }

    /**
     * @return {Model} The class/constructor for this collection's model type.
     */
    model() {
        return this.getOption('model');
    }

    /**
     * @return {Object} Default attributes
     */
    defaults() {
        return {};
    }

    /**
     * @return {*} The value of an attribute, or a given fallback if not set.
     */
    get(attribute, fallback) {
        return get(this._attributes, attribute, fallback);
    }

    /**
     * Sets an attribute's value, or an object of attributes.
     *
     * @param {string|Object} attribute
     * @param {*}             value
     */
    set(attribute, value) {
        if (isPlainObject(attribute)) {
            each(attribute, (value, key) => {
                this.set(key, value);
            });

            return;
        }

        Vue.set(this._attributes, attribute, value);
    }

    /**
     * @return {Object}
     */
    getAttributes() {
        return this._attributes;
    }

    /**
     * @return {Model[]}
     */
    getModels() {
        return this.models;
    }

    /**
     * Returns the default options for this model.
     *
     * @returns {Object}
     */
    getDefaultOptions() {
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
    getRouteParameters() {
        return merge({}, super.getRouteParameters(), this._attributes, {
            page: this._page,
        });
    }

    /**
     * Removes all errors from the models in this collection.
     */
    clearErrors() {
        each(this.models, method('clearErrors'));
    }

    /**
     * Resets model state, ie. `loading`, etc back to their initial states.
     */
    clearState() {
        Vue.set(this, 'loading',  false);
        Vue.set(this, 'saving',   false);
        Vue.set(this, 'deleting', false);
        Vue.set(this, 'fatal',    false);
    }

    /**
     * Removes all models from this collection.
     */
    clearModels() {
        let models = this.models;

        // Clear the model store, but keep a reference.
        Vue.set(this, 'models', []);

        // Notify each model that it has been removed from this collection.
        each(models, (model) => {
            this.onRemove(model);
        });
    }

    /**
     * Removes all models from this collection.
     */
    clear() {
        this.clearModels();
        this.clearState();
    }

    /**
     * Syncs all models in this collection. This method delegates to each model
     * so follows the same signature and effects as `Model.sync`.
     */
    sync() {
        each(this.models, method('sync'));
    }

    /**
     * Resets all models in this collection. This method delegates to each model
     * so follows the same signature and effects as `Model.reset`.
     *
     * @param {string|string[]} attribute
     */
    reset(...attribute) {
        each(this.models, method('reset', ...attribute));
    }

    /**
     * Returns the number of models in this collection.
     */
    size() {
        return size(this.models);
    }

    /**
     * @returns {boolean} `true` if the collection is empty, `false` otherwise.
     */
    isEmpty() {
        return this.size() === 0;
    }

    /**
     * @returns {Object} A native representation of this collection that will
     *                   determine the contents of JSON.stringify(collection).
     */
    toJSON() {
        return this.models;
    }

    /**
     * @returns {Promise}
     */
    validate() {
        return Promise.all(this.models.map((model) => model.validate()));
    }

    /**
     * Create a new model of this collection's model type.
     *
     * @param {Object} attributes
     *
     * @returns {Model} A new instance of this collection's model.
     */
    createModel(attributes) {
        return new (this.model())(attributes);
    }

    /**
     * Removes a model from the model registry.
     *
     * @param {Model} model
     */
    removeModelFromRegistry(model) {
        unset(this._registry, model._uid);
    }

    /**
     * @return {Boolean} true if this collection has the model in its registry.
     */
    hasModelInRegistry(model) {
        return has(this._registry, model._uid);
    }

    /**
     * Adds a model from the model registry.
     *
     * @param {Model} model
     */
    addModelToRegistry(model) {
        set(this._registry, model._uid, 1);
    }

    /**
     * Called when a model has been added to this collection.
     *
     * @param {Model} model
     */
    onAdd(model) {
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
    add(model = {}) {

        // If given an array, assume an array of models and add them all.
        if (isArray(model)) {
            return filter(map(model, this.add));
        }

        // Objects should be converted to model instances first, then added.
        if (isPlainObject(model)) {
            return this.add(this.createModel(model));
        }

        // This is also just to catch a potential bug. All models should have
        // an auto id so this would indicate an unexpected state.
        if ( ! this.isModel(model)) {
            throw new Error('Expected a model, plain object, or array of either');
        }

        // Make sure we don't add the same model twice.
        if (this.hasModelInRegistry(model)) {
            return;
        }

        // Add the model instance to this collection.
        this.models.push(model);
        this.onAdd(model);

        // We're assuming that the collection is not loading once a model is added.
        Vue.set(this, 'loading', false);

        return model;
    }

    /**
     * Called when a model has been removed from this collection.
     *
     * @param {Model} model
     */
    onRemove(model) {
        model.unregisterCollection(this);
        this.removeModelFromRegistry(model);
        this.emit('remove', {model });
    }

    /**
     * Removes a model at a given index.
     *
     * @param  {number} index

     * @returns {Model} The model that was removed, or `undefined` if invalid.
     * @throws  {Error} If a model could not be found at the given index.
     */
    _removeModelAtIndex(index) {
        if (index < 0) {
            return;
        }

        let model = get(this.models, index);
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
    _removeModel(model) {
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
    remove(model) {
        if ( ! model) {
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
            return filter(map(model, this.remove));
        }

        // This is just to catch a potential bug. All models should have
        // an auto id here so this would indicate an unexpected state.
        if ( ! this.isModel(model)) {
            throw new Error('Model to remove is not a valid model');
        }

        return this._removeModel(model);
    }

    /**
     * Determines whether a given value is an instance of a model.
     *
     * @param  {*} candidate A model candidate
     *
     * @return {boolean} `true` if the given `model` is an instance of Model.
     */
    isModel(candidate) {
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
    indexOf(model) {
        let filter = model;

        // Getting the index of a model instance can be optimised.
        if (this.isModel(filter)) {

            // Constant time check, if the registry doesn't have a record of
            // the model, we know it's not in the collection.
            if ( ! has(this._registry, model._uid)) {
                return -1;
            }

            // There is no need to filter on the entire object, because the
            // unique ID of the model is all we need to identify it.
            filter = {_uid: model._uid };
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
    find(where) {
        return find(this.models, where);
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
    filter(predicate) {
        let result = this.clone();

        result.models = filter(result.models, predicate);
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
    where(predicate) {
        return filter(this.models, predicate);
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
    map(callback) {
        return map(this.models, callback);
    }

    /**
     * Iterates through all models, calling a given callback for each one.
     *
     * @see {@link https://lodash.com/docs/#each}
     *
     * @param {function} callback Receives `model` and `index`.
     */
    each(callback) {
        return each(this.models, callback);
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
    reduce(iteratee, initial) {

        // Use the first model as the initial value if an initial was not given.
        if (arguments.length === 1) {
            initial = this.first();
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
    sum(iteratee) {
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
    count(iteratee) {
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
    sort(comparator) {
        Vue.set(this, 'models', sortBy(this.models, comparator));
    }

    /**
     * @param {Model|Object} model
     *
     * @returns {boolean} `true` if this collection contains the given model,
     *                    `false` otherwise.
     */
    has(model) {
        return this.indexOf(model) >= 0;
    }

    /**
     * @returns {Model|undefined} The first model of this collection.
     */
    first() {
        return first(this.models);
    }

    /**
     * @returns {Model|undefined} The last model of this collection.
     */
    last() {
        return last(this.models);
    }

    /**
     * Removes and returns the first model of this collection, if there was one.
     *
     * @returns {Model|undefined} Removed model or undefined if there were none.
     */
    shift() {
        if ( ! this.isEmpty()) {
            return this._removeModelAtIndex(0);
        }
    }

    /**
     * Removes and returns the last model of this collection, if there was one.
     *
     * @returns {Model|undefined} Removed model or undefined if there were none.
     */
    pop() {
        if ( ! this.isEmpty()) {
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
    replace(models) {
        this.clearModels();
        this.add(values(models));
    }

    /**
     * Returns the query parameters that should be used when paginating.
     *
     * @return {Object}
     */
    getPaginationQuery() {
        return {
            page: this._page,
        }
    }

    /**
     * @inheritDoc
     */
    getFetchQuery() {
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
    getModelsFromResponse(response) {
        let models = response.getData();

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
    onSaveSuccess(response) {

        // Model data returned in the response.
        let saved = this.getModelsFromResponse(response);

        // All the models that are currently being saved.
        let saving = this.getSavingModels();

        // Empty response is similar to an empty response returned when saving
        // a model: assume that the attributes are the saved state, so sync.
        if (isNil(saved)) {
            each(saving, method('sync'));

        } else {

            // There is no sensible alternative to an array here, so anyting else
            // is considered an exception that indicates an unexpected state.
            if ( ! isArray(saved)) {
                throw new ResponseError(
                    'Response data must be an array or empty',
                    response);
            }

            // Check that the number of models returned in the response matches
            // the number of models that were saved. If these are not equal, it's
            // not possible to map saved data to the saving models.
            if (saved.length !== saving.length) {
                throw new ResponseError(
                    'Expected the same number of models in the response',
                    response);
            }

            // Update every model with its respective response data.
            // A strict requirement and assumption is that the models returned
            // in the response are in the same order as they are in the collection.
            each(saved, (data, index) => {
                saving[index].onSaveSuccess(new ProxyResponse(
                    200, data, response.getHeaders()
                ));
            });
        }

        Vue.set(this, 'saving', false);
        Vue.set(this, 'fatal',  false);

        this.emit('save', {error: null });
    }

    /**
     * @returns {Model[]} Models in this collection that are in a "saving" state.
     */
    getSavingModels() {
        return filter(this.models, 'saving');
    }

    /**
     * @returns {Model[]} Models in this collection that are in a "deleting" state.
     */
    getDeletingModels() {
        return filter(this.models, 'deleting');
    }

    /**
     * Applies an array of validation errors to this collection's models.
     *
     * @param  {Array}   errors
     * @param  {integer} status Response status
     */
    applyValidationErrorArray(errors) {
        let models = this.getSavingModels();

        // To allow matching errors with models, it's a strict requirement and
        // assumption that the array of errors returned in the response must have
        // the same number of elements as there are models being saved.
        if (errors.length !== models.length) {
            throw new ResponseError(
                'Array of errors must equal the number of models');
        }

        // Set every model's errors in a way that emulates how saving a model
        // would fail in the same way.
        //
        // A strict requirement and assumption is that the models returned
        // in the response are in the same order as they are in the collection.
        each(models, (model, index) => {
            model.setErrors(errors[index]);
            Vue.set(model, 'saving', false);
            Vue.set(model, 'fatal',  false);
        });
    }

    /**
     * Applies an object of validation errors keyed by model identifiers.
     *
     * @param  {Array}   errors
     * @param  {integer} status Response status
     */
    applyValidationErrorObject(errors) {
        let lookup = keyBy(this.models, (model) => model.identifier());

        each(errors, (errors, identifier) => {
            let model = get(lookup, identifier);

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
    setErrors(errors) {

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
    getErrors() {
        return map(this.models, 'errors');
    }

    /**
     * Called when a save request resulted in a validation error.
     *
     * @param {Object} response
     */
    onSaveValidationFailure(error) {
        let response = error.getResponse();
        let errors = response.getValidationErrors();

        if ( ! isPlainObject(errors) && ! isArray(errors)) {
            throw new ResponseError(
                'Validation errors must be an object or array', response);
        }

        this.setErrors(errors);

        Vue.set(this, 'fatal',  false);
        Vue.set(this, 'saving', false);
    }

    /**
     * Called when a save request resulted in an unexpected error,
     * eg. an internal server error (500)
     *
     * @param {Error}  error
     * @param {Object} response
     */
    onFatalSaveFailure(error, response) {
        each(this.getSavingModels(), (model) => {
            model.onFatalSaveFailure(error, response);
        });

        Vue.set(this, 'fatal',  true);
        Vue.set(this, 'saving', false);
    }

    /**
     * Called when a save request failed.
     *
     * @param {Error}  error
     * @param {Object} response
     */
    onSaveFailure(error) {
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
    getSaveData() {
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
    page(page) {
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
    getPage() {
        return this._page;
    }

    /**
     * @returns {boolean} Whether this collection is currently paginated.
     */
    isPaginated() {
        return this._page !== NO_PAGE;
    }

    /**
     * @returns {boolean} Whether this collection is on the last page,
     *                            ie. there won't be more results that follow.
     */
    isLastPage() {
        return this._page === LAST_PAGE;
    }

    /**
     * Responsible for adjusting the page and appending of models that were
     * received by a paginated fetch request.
     *
     * @param {Model[]} models
     */
    applyPagination(models) {

        // If no models were returned in the response we can assume that
        // we're now on the last page, and we should not continue.
        if (isEmpty(models)) {
            Vue.set(this, '_page', LAST_PAGE);

        // Otherwise, there were at least one model, and we can safely
        // assume that we want to increment the page number.
        } else {
            Vue.set(this, '_page', this._page + 1);
            this.add(models);
        }
    }

    /**
     * Called when a fetch request was successful.
     *
     * @param {Object} response
     */
    onFetchSuccess(response) {
        let models = this.getModelsFromResponse(response);

        // There is no sensible alternative to an array here, so anyting else
        // is considered an exception that indicates an unexpected state.
        if ( ! isArray(models)) {
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
        Vue.set(this, 'fatal',   false);

        this.emit('fetch', {error: null });
    }

    /**
     * Called when a fetch request failed.
     *
     * @param {Error}  error
     */
    onFetchFailure(error) {
        this.clearErrors();

        Vue.set(this, 'fatal',   true);
        Vue.set(this, 'loading', false);

        this.emit('fetch', {error});
    }

    /**
     * Called before a fetch request is made.
     *
     * @returns {boolean|undefined} `false` if the request should not be made.
     */
    onFetch() {
        return new Promise((resolve, reject) => {

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
    onDeleteSuccess(response) {
        Vue.set(this, 'deleting', false);
        Vue.set(this, 'fatal',    false);

        each(this.getDeletingModels(), (model) => {
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
    onDeleteFailure(error) {
        Vue.set(this, 'fatal',    true);
        Vue.set(this, 'deleting', false);

        each(this.getDeletingModels(), (model) => {
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
    onSave() {
        // Don't save if we're already busy saving this collection.
        // This prevents things like accidental double clicks.
        if (this.saving) {
            return Promise.resolve(Base.REQUEST_SKIP);
        }

        let valid = true;
        let tasks = this.models.map((model) => {
            return model.onSave().catch((error) => {
                if (error instanceof ValidationError) {
                    valid = false;
                } else {
                    throw error;
                }
            });
        });

        // Call 'onSave' on each model so that the models can set their state
        // accordingly, and indicate whether a validation failure should occur.
        return Promise.all(tasks).then(() => {
            if ( ! valid) {
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
    getIdentifiers(models) {
        return map(models, method('identifier'));
    }

    /**
     * @inheritDoc
     */
    getDeleteBody() {
        if (this.getOption('useDeleteBody')) {
            return this.getIdentifiers(this.getDeletingModels());
        }

        return {};
    }

    /**
     * @returns {string} The query parameter key to use for model identifiers.
     */
    getDeleteQueryIdenitifierKey() {
        return 'id';
    }

    /**
     * @inheritDoc
     */
    getDeleteQuery() {

        // Don't use query parameters if we want send the request data in the body.
        if (this.getOption('useDeleteBody')) {
            return {};
        }

        // Collect all the identifiers of the models being deleted.
        let models      = this.getDeletingModels();
        let identifier  = this.getDeleteQueryIdenitifierKey();
        let identifiers = this.getIdentifiers(models);

        return {[identifier]: join(identifiers, ',') };
    }

    /**
     * Called before a delete request is made.
     *
     * @returns {boolean} `false` if the request should not be made.
     */
    onDelete() {
        if (this.deleting) {
            return Promise.resolve(Base.REQUEST_SKIP);
        }

        return Promise.all(this.models.map((m) => m.onDelete())).then(() => {

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
    toArray() {
        return this.map(model => model.toJSON());
    }
}

export default Collection;
