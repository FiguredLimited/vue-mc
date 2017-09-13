import _                     from 'lodash'
import {autobind}            from 'core-decorators';
import axios                 from 'axios'
import Vue                   from 'vue'
import Abstract              from './Abstract.js'
import Collection            from './Collection.js'
import ResponseError         from '../Errors/ResponseError.js'
import ValidationError       from '../Errors/ValidationError.js'

/**
 * Base model class.
 */
@autobind
class Model extends Abstract {

    /**
     * A convenience wrapper around the model's attributes that are saved.
     * This is similar to the `saved` method, but instead of accessing a single
     * property it returns the whole saved object, so that you can do something
     * like model.$.attribute when you want to display it somewhere.
     *
     * @returns {Object} This model's saved, reference data.
     */
    get $() {
        return this._reference;
    }

    /**
     * @returns {Object} This model's "active" state attributes.
     */
    get attributes() {
        return this._attributes;
    }

    /**
     * @returns {Object} The collection that this model is registered to.
     */
    get collections() {
        return _.values(this._collections);
    }

    /**
     * @returns {Object} This model's errors, which are cleared automatically.
     */
    get errors() {
        return this.getErrors();
    }

    /**
     * Creates a new instance, called when using 'new'.
     *
     * @param  {Object}     [attributes]  Model attributes
     * @param  {Collection} [collection]  Collection that this model belongs to.
     * @param  {Object}     [options]     Options to set on the model.
     */
    constructor(attributes = {}, collection = null, options = {}) {
        super(options);

        Vue.set(this, '_collections', {});  // Collections that contain this model.
        Vue.set(this, '_reference',   {});  // Saved attribute state.
        Vue.set(this, '_attributes',  {});  // Active attribute state.
        Vue.set(this, '_mutators',    {});  // Mutator cache.
        Vue.set(this, '_errors',      {});  // Validation errors.

        this.clearState();

        // Cache certain methods that don't need to be evaluated more than once.
        this.memoize();

        // Cache mutator pipelines so that they can run as a single function.
        this.compileMutators();

        // Assign all given model data to the model's attributes and reference.
        this.assign(attributes);

        // Register the given collection (if any) to the model. This is so that
        // the model can be added to the collection automatically when it is
        // created on save, or removed on delete.
        if (collection) {
            this.registerCollection(collection);
        }
    }

    /**
     * Prepare certain methods to only be called once. These are methods that
     * are expected to return the same data every time.
     *
     * @see {@link https://lodash.com/docs/#once}
     */
    memoize() {
        let memoized = [
            'validation',  //   \
            'defaults',    //   | These do not need to be evaluated every time.
            'routes',      //  /
        ];

        _.each(memoized, (name) => this[name] = _.once(this[name]));
    }

    /**
     * Returns the model's identifier value.
     */
    identifier() {
        return this.get(this.option('identifier'));
    }

    /**
     * @returns {Object} An empty representation of this model.
     *                   It's important that all model attributes have a default
     *                   value in order to be reactive in Vue.
     */
    defaults() {
        return {};
    }

    /**
     * @returns {Object} Attribute mutators keyed by attribute name.
     */
    mutators() {
        return {};
    }

    /**
     * Add validation rules here, or use option?
     */
    validation() {
        return {};
    }

    /**
     * Returns the default options for this model.
     *
     * @returns {Object}
     */
    getDefaultOptions() {
        return _.merge({}, super.getDefaultOptions(), {

            // The attribute that should be used to uniquely identify this model.
            identifier: 'id',

            // Whether this model should allow an existing identifier to be
            // overwritten on update.
            overwriteIdentifier: false,

            // Whether this model should perform a "patch" on update,
            // which will only send changed attributes in the request.
            patch: false,

            // Whether this model should perform a “patch” on update if no
            // changes have been made since the last time this model was synced.
            patchUnchanged: false,

            // Whether this model should validate an attribute that has changed.
            // This would only affect the errors of the changed attribute and
            // will only be applied if the value is not a blank string.
            validateOnChange: false,

            // Whether this model should be validated before it is saved. This
            // will cause the request to fail if validation does not pass. This
            // is useful when you only want to validate on demand.
            validateOnSave: true,

            // Whether this model should validate models and collections within
            // its attribute tree. The result is implicit recursion as each of
            // those instances will also validate their trees, etc.
            validateRecursively: true,

            // Whether this model should mutate a property as it is changed,
            // before it is set. This is a rare requirement because you usually
            // don't  want to mutate something that you are busy editing.
            mutateOnChange: false,

            // Whether this model should mutate all attributes before they are
            // synced to the "saved" state. This would include construction,
            // on fetch, on save, and on assign.
            mutateBeforeSync: true,

            // Whether this model should use mutated values for the attributes
            // in "save" request. This will not mutate the active state.
            mutateBeforeSave: true,
        });
    }

    /**
     * Compiles all mutators into pipelines that can be executed quickly.
     */
    compileMutators() {
        this._mutators = _.mapValues(this.mutators(), (m) => _.flow(m));
    }

    /**
     * @returns {Object} Parameters to use for replacement in route patterns.
     */
    getRouteParameters() {
        return _.merge({}, super.getRouteParameters(), this._attributes);
    }

    /**
     * Registers a collection on this model. When this model is created it will
     * automatically be added to the collection. Similarly, when this model is
     * delete it will be remove from the collection. Registering the same
     * collection more than once has no effect.
     *
     * @param {Collection} collection
     */
    registerCollection(collection) {
        if (_.isArray(collection)) {
            _.each(collection, this.registerCollection);
            return;
        }

        if (_.isNil(collection) || _.isUndefined(collection._uid)) {
            throw new Error('Collection is not valid');
        }

        Vue.set(this._collections, collection._uid, collection);
    }

    /**
     * Removes a collection from this model's collection registry, removing all
     * effects that would occur when creating or deleting this model.
     *
     * Unregistering a collection that isn't registered has no effect.
     *
     * @param {Collection} collection
     */
    unregisterCollection(collection) {
        if (_.isArray(collection)) {
            _.each(collection, this.unregisterCollection);
            return;
        }

        if (_.isNil(collection) || _.isUndefined(collection._uid)) {
            throw new Error('Collection is not valid');
        }

        Vue.delete(this._collections, collection._uid);
    }

    /**
     * Reverts all attributes back to their defaults, and completely removes all
     * attributes that don't have defaults. This will also sync the reference
     * attributes, and is not reversable.
     */
    clearAttributes() {
        let defaults = this.defaults();

        Vue.set(this, '_attributes', _.cloneDeep(defaults));
        Vue.set(this, '_reference',  _.cloneDeep(defaults));
    }

    /**
     * Reverts all attributes back to their defaults, and completely removes all
     * attributes that don't have defaults. This will also sync the reference
     * attributes, and is not reversable.
     */
    clear() {
        this.clearAttributes();
        this.clearErrors();
        this.clearState();
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
     * Assigns all given model data to the model's attributes and reference.
     * This will also fill any gaps with the model's default attribute.
     *
     * @param {Object} attributes
     *
     * @returns {Object} The attributes that were assigned to the model.
     */
    assign(attributes) {
        this.set(_.defaultsDeep({}, attributes, _.cloneDeep(this.defaults())));
        this.sync();
    }

    /**
     * Resets all attributes back to their reference values (source of truth).
     * A good use case for this is when form fields are bound directly to the
     * model's attributes. Changing values in the form fields will change the
     * attributes on the model. On cancel, you can revert the model back to
     * its saved, original state using reset().
     *
     * You can also pass one or an array of attributes to reset.
     *
     * @param {string|string[]} attribute
     */
    reset(attribute) {

        // We're cloning deep to avoid multiple references to the same object,
        // otherwise updating the attributes will also update the reference.
        // Set each attribute to its saved equivalent.
        let saved = _.cloneDeep(this._reference);

        // Reset either specific attributes or all attributes if none provided.
        if (_.isUndefined(attribute)) {
            Vue.set(this, '_attributes', saved);

        } else {
            _.each(_.castArray(attribute), (attribute) => {
                Vue.set(this._attributes, attribute, _.get(saved, attribute));
            });
        }

        this.clearErrors();
        this.emit('reset');
    }

    /**
     * @returns {*} The value of an attribute after applying its mutators.
     */
    mutated(attribute, value) {
        let mutator = _.get(this._mutators, attribute);

        if (mutator) {
            return mutator(value);
        }

        return value;
    }

    /**
     * Mutates either specific attributes or all attributes if none provided.
     * @param {string|string[]|undefined} attribute
     */
    mutate(attribute) {
        if (_.isUndefined(attribute)) {
            _.each(this._attributes, (value, attribute) => {
                Vue.set(this._attributes, attribute, this.mutated(attribute, value));
            });

        // Only mutate specific attributes.
        } else {
            _.each(_.castArray(attribute), (attribute) => {
                let current = this.get(attribute);
                let mutated = this.mutated(attribute, current);

                Vue.set(this._attributes, attribute, mutated);
            });
        }
    }

    /**
     * Sync the current attributes to the reference attributes. This is usually
     * only called on save. We have to clone the values otherwise we
     * end up with references to the same object in both attribute sets.
     *
     * You can also pass one or an array of attributes to sync.
     *
     * @param {string|string[]} attribute
     */
    sync(attribute) {

        // Mutate all attributes before we sync them, if required to do so.
        if (this.option('mutateBeforeSync')) {
            this.mutate(attribute);
        }

        // We're cloning deep to avoid multiple references to the same object,
        // otherwise updating the attributes will also update the reference.
        // Set each saved attribute to its active equivalent.
        let active = _.cloneDeep(this._attributes);

        // Sync either specific attributes or all attributes if none provided.
        if (_.isUndefined(attribute)) {
            Vue.set(this, '_reference', active);

        } else {
            _.each(_.castArray(attribute), (attribute) => {
                Vue.set(this._reference, attribute, _.get(active, attribute));
            });
        }

        this.emit('sync');
    }

    /**
     * Registers an attribute on this model so that it can be accessed directly
     * on the model, passing through `get` and `set`.
     */
    registerAttribute(attribute) {

        // Protect against unwillingly using an attribute name that already
        // exists as an internal property or method name.
        if (this.isReserved(attribute)) {
            throw new Error(`Can't use reserved attribute name '${attribute}'`);
        }

        // Create dynamic accessors and mutators so that we can update the
        // model directly while also keeping the model attributes in sync.
        Object.defineProperty(this, attribute, {
            get: ()      => this.get(attribute),
            set: (value) => this.set(attribute, value),
        });
    }

    /**
     * Sets the value of an attribute and registers the magic "getter" in a way
     * that is compatible with Vue's reactivity. This method should always be
     * used when setting the value of an attribute.
     *
     * @param  {string|Object}  attribute
     * @param  {*}              value
     *
     * @returns {*} The value that was set.
     */
    set(attribute, value) {

        // Allow batch set of multiple attributes at once, ie. @set({...});
        if (_.isPlainObject(attribute)) {
            return _.each(attribute, (value, key) => {
                this.set(key, value);
            });
        }

        // Only register the pass-through property if it's not already set up.
        // If it already exists on the instance, we know it has been.
        if ( ! this.has(attribute)) {
            this.registerAttribute(attribute);
        }

        // Current value of the attribute, or `undefined`
        let previous = this.get(attribute);

        // Run the attribute's mutators if required to do so on change.
        if (this.option('mutateOnChange')) {
            value = this.mutated(attribute, value);
        }

        let changed = ! _.isEqual(previous, value);

        // No change means we can skip the update.
        if (previous && ! changed) {
            return previous;
        }

        // Set the attribute's new value.
        Vue.set(this._attributes, attribute, value);

        // Only emit `change` if the value has changed.
        this.emit('change', {attribute, previous, value});

        // If on-the-fly validation is enabled and the value is not blank,
        // validate the attribute. It's important to skip blank strings
        // otherwise an empty form will immediately fail.
        if (this.option('validateOnChange') && value !== '') {
            Vue.nextTick(() => this.validateAttribute(attribute));
        }

        return value;
    }

    /**
     * Reverts all attributes back to their defaults, or `undefined` if a
     * default value is not defined.
     *
     * You can also pass one or an array of attributes to unset.
     *
     * @param {string|string[]} attribute
     */
    unset(attribute) {

        // We're cloning deep to avoid multiple references to the same object,
        // otherwise updating the attributes will also update the reference.
        let defaults = _.cloneDeep(this.defaults());

        // Unset either specific attributes or all attributes if none provided.
        let attributes = _.defaultTo(attribute, _.keys(this._attributes));

        // Unset either specific attributes or all attributes if none provided.
        _.each(_.castArray(attributes), (attribute) => {
            if (this.has(attribute)) {
                Vue.set(this._attributes, attribute, _.get(defaults, attribute));
            }
        });
    }

    /**
     * Similar to `saved`, returns an attribute's value or a fallback value
     * if this model doesn't have the attribute.
     *
     * @param {string} attribute
     * @param {*}      fallback
     *
     * @returns {*} The value of the attribute or `fallback` if not found.
     */
    get(attribute, fallback) {
        return _.get(this._attributes, attribute, fallback);
    }

    /**
     * Similar to `get`, but accesses the saved attributes instead.
     *
     * This is useful in cases where you want to display an attribute but also
     * change it. For example, a modal with a title based on a model field, but
     * you're also editing that field. The title will be updating reactively if
     * it's bound to the active attribute, so bind to the saved one instead.
     *
     * @param {string} attribute
     * @param {*}      fallback
     *
     * @returns {*} The value of the attribute or `fallback` if not found.
     */
    saved(attribute, fallback) {
        return _.get(this._reference, attribute, fallback);
    }

    /**
     * Determines if the model has an attribute.
     *
     * @param  {string}  attribute
     * @returns {boolean} `true` if an attribute exists, `false` otherwise.
     *                   Will return true if the object exists but is undefined.
     */
    has(attribute) {
        return _.has(this._attributes, attribute);
    }

    /**
     * Validates a specific attribute of this model, and sets errors for it.
     *
     * @returns {boolean} `true` if valid, `false` otherwise.
     */
    validateAttribute(attribute) {
        let value  = this.get(attribute);
        let rules  = this.validation();
        let errors = [];
        let valid  = true;

        if (attribute in rules) {
            let ruleset = _.castArray(rules[attribute]);

            _.each(ruleset, (rule) => {
                let result = rule(value, attribute, this);

                // Rules should return an error message if validation failed.
                if (_.isString(result)) {
                    errors.push(result);
                    valid = false;
                }
            });
        }

        // Defer validation if an attribute is an object that has a `validate`
        // method. The expectation is that the validate function will return
        // `true` if valid, `false` if not, and handle its own errors.
        if (this.option('validateRecursively')) {
            if (_.isFunction(_.get(value, 'validate'))) {
                valid = value.validate() && valid;
            }
        }

        if (_.isEmpty(errors)) {
            Vue.delete(this._errors, attribute);
        } else {
            Vue.set(this._errors, attribute, errors);
        }

        return valid;
    }

    /**
     * Validates an array of attributes.
     *
     * @returns {boolean} `true` if valid, `false` otherwise.
     */
    validateAttributes(attributes) {
        return _.reduce(attributes, (valid, attribute) => {
            return this.validateAttribute(attribute) && valid;

        }, true);
    }

    /**
     * Validates all attributes.
     *
     * @returns {boolean} `true` if valid, `false` otherwise.
     */
    validateAll() {
        return _.reduce(this._attributes, (valid, value, attribute) => {
            return this.validateAttribute(attribute) && valid;

        }, true);
    }

    /**
     * Perform validation on the given attributes, or on all attributes if none
     * were specified. Errors will be set on the model if validation fails.
     *
     * @param {Object} attributes
     *
     * @returns {boolean} `true` if the model passes validation.
     */
    validate(attributes) {
        if ( ! attributes) {
            return this.validateAll();
        }

        if (_.isArray(attributes)) {
            return this.validateAttributes(attributes);
        }

        if (this.has(attributes)) {
            return this.validateAttribute(attributes);
        }

        return true;
    }

    /**
     * @returns {Object} A native representation of this model that will determine
     *                   the contents of JSON.stringify(model).
     */
    toJSON() {
        return this._attributes;
    }

    /**
     * Adds this model to all registered collections.
     */
    addToAllCollections() {
        _.each(this._collections, (collection, id) => {
            collection.add(this);
        });
    }

    /**
     * Removes this model from all registered collections.
     */
    removeFromAllCollections() {
        _.each(this._collections, (collection, id) => {
            collection.remove(this);
        });
    }

    /**
     * Returns an array of attribute names that have changed, or `false` if no
     * changes have been made since the last time this model was synced.
     *
     * @returns {Array|boolean} An array of changed attribute names, or `false`
     *                         if no attributes have changed since the last sync.
     */
    changed() {
        let changed = [];

        _.each(this._attributes, (value, attribute) => {
            if ( ! _.isEqual(value, this.saved(attribute))) {
                changed.push(attribute);
            }
        });

        return ! _.isEmpty(changed) ? changed : false;
    }

    /**
     * Returns model attributes taken from a response.
     */
    getFetchedAttributesFromResponse(response) {
        return this.getResponseData(response);
    }

    /**
     * Called when a fetch request was successful.
     */
    onFetchSuccess(response) {
        let attributes = this.getFetchedAttributesFromResponse(response);

        // A fetch request must receive *some* data in return.
        if (_.isEmpty(attributes)) {
            throw new ResponseError("No data in fetch response", response);
        }

        this.assign(attributes);

        Vue.set(this, 'fatal',   false);
        Vue.set(this, 'loading', false);
    }

    /**
     * Called when a fetch request failed.
     *
     * @param {Error}  error
     * @param {Object} response
     */
    onFetchFailure(error, response) {
        Vue.set(this, 'fatal',   true);
        Vue.set(this, 'loading', false);
    }

    /**
     * @returns {string} The key to use when generating the `patch` URL.
     */
    getPatchRoute() {
        return _.get(this.routes(), 'patch', _.get(this.routes(), 'save'));
    }

    /**
     * @returns {string} The key to use when generating the `create` URL.
     */
    getCreateRoute() {
        return _.get(this.routes(), 'create', _.get(this.routes(), 'save'));
    }

    /**
     * @returns {string} The key to use when generating the `update` URL.
     */
    getUpdateRoute() {
        if (this.shouldPatch()) {
            return this.getPatchRoute();
        }

        return _.get(this.routes(), 'update', _.get(this.routes(), 'save'));
    }

    /**
     * @returns {string} The method to use when making an update request.
     */
    getUpdateMethod() {
        return this.shouldPatch() ? this.getPatchMethod() : super.getUpdateMethod();
    }

    /**
     * @returns {string} The method to use when making an save request.
     */
    getSaveMethod() {
        return this.isNew() ? this.getCreateMethod() : this.getUpdateMethod();
    }

    /**
     * @inheritDoc
     */
    getSaveRoute() {
        if (this.isNew()) {
            return this.getCreateRoute();
        }

        return this.getUpdateRoute();
    }

    /**
     * Returns whether this model should perform a "patch" on update, which will
     * only send changed data in the request, rather than all attributes.
     *
     * @returns {boolean} Whether this model should perform a "patch" on update,
     *                    which will only send changed data in the request,
     *                    rather than all attributes.
     */
    shouldPatch() {
        return Boolean(this.option('patch'));
    }

    /**
     * Returns whether this model should perform a "patch" on update if no
     * changes have been made since the last time this model was synced.
     *
     * @returns {boolean} Whether this model should perform a "patch" on update
     *                    when no changes have occurred.
     */
    shouldPatchUnchanged() {
        return Boolean(this.option('patchUnchanged'));
    }

    /**
     * @returns {Object} The data to send to the server when saving this model.
     */
    getSaveData() {
        let attributes = this._attributes;

        // Only use changed attributes if patching.
        if (this.isExisting() && this.shouldPatch()) {
            attributes = _.pick(attributes, this.changed());
        }

        return attributes;
    }

    /**
     * @returns {boolean} `true`  if the requested resulting in a model creation
     *                           in the backend, rather than an update.
     */
    wasCreated(response) {
        let status = this.getResponseStatus(response);
        let data   = this.getResponseData(response);

        // A "201 CREATED" response is the easiest way to indicate a create.
        if (status === 201) {
            return true;
        }

        // If the model didn't have an identifier but the response returned one,
        // we can assume that the model was created, otherwise the identifier
        // would have already been set on the model.
        if (this.isNew() && _.has(data, this.option('identifier'))) {
            return true;
        }

        return false;
    }

    /**
     * @returns {*} A potential identifier parsed from response data.
     */
    parseIdentifier(data) {
        return data;
    }

    /**
     * @returns {boolean} Whether the given identifier is considered a valid
     *                   identifier value for this model.
     */
    isValidIdentifier(identifier) {
        return Boolean(identifier);
    }

    /**
     * @returns {boolean} Whether this model allows an existing identifier to be
     *                    overwritten on update.
     */
    shouldAllowIdentifierOverwrite() {
        return Boolean(this.option('overwriteIdentifier'));
    }

    /**
     * Updates the model data with data returned from the server.
     *
     * @param {Object} response
     */
    updateOnSave(response) {
        let data = this.getResponseData(response);

        // No content means we don't want to update the model at all.
        // The attributes that we passed in the request should now be considered
        // the source of truth, so we should update the reference attributes here.
        if ( ! data || (_.isObjectLike(data) && _.isEmpty(data))) {
            this.sync();

        // A plain object implies that we want to update the model data.
        // It's not a requirement to respond with a complete dataset,
        // eg. a response to a patch request might return partial data.
        } else if (_.isPlainObject(data)) {
            this.assign(data);

        // There is some data, but it's not an object, so we can assume that the
        // response only returned an identifier for this model.
        } else {
            let identifier = this.parseIdentifier(data);

            // It's possible that the response didn't actually return a valid
            // identifier, so before we try to use it we should make sure that
            // we're not accidentially assigning the wrong data as identifiers.
            if (this.isValidIdentifier(identifier)) {

                // The current identifier of this model.
                let current = this.identifier();

                // If an identifier already exists on this model and the returned
                // identifier is not the same, this almost definitely indicates
                // an unexpected state. The default is to protect against this
                // and fail hard, but this might not always be what we want.
                if (current && (identifier !== current)) {
                    if ( ! this.shouldAllowIdentifierOverwrite()) {
                        throw new Error(`Not allowed to overwrite model identifier`);
                    }
                }

                // Update the identifier and sync the saved data.
                this.set(this.option('identifier'), identifier);
                this.sync();

            } else {
                throw new ResponseError(
                    'Expected an empty response, object, or valid identifier',
                    response
                );
            }
        }
    }

    /**
     * Sets the errors on this model. This should only be called internally.
     *
     * @param {Object} errors
     */
    setErrors(errors) {
        Vue.set(this, '_errors', _.defaultTo(errors, {}));
    }

    /**
     * @returns {Object} Validation errors on this model.
     */
    getErrors() {
        return this._errors = _.defaultTo(this._errors, {});
    }

    /**
     * Clears all errors on this model.
     */
    clearErrors() {
        this.setErrors({});
        Vue.set(this, 'fatal', false);
    }

    /**
     * Called when a save request was successful.
     *
     * @param {Object} response
     */
    onSaveSuccess(response) {

        // Clear errors because the save was successful.
        this.clearErrors();

        // Determine if the model was created (not updated).
        let created = this.wasCreated(response);

        // Update this model with the data that was returned in the response.
        this.updateOnSave(response);

        Vue.set(this, 'saving', false);
        Vue.set(this, 'fatal',  false);

        // Automatically add to all registered collections.
        if (created) {
            this.addToAllCollections();
        }

        this.emit(created ? 'create' : 'update');
    }

    /**
     * Called when a save request resulted in a validation error.
     *
     * @param {Object} errors
     */
    onSaveValidationFailure(errors) {
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
        this.clearErrors();

        Vue.set(this, 'fatal',  true);
        Vue.set(this, 'saving', false);
    }

    /**
     * Called when a save request resulted in a general error.
     *
     * @param {Error}  error
     * @param {Object} response
     */
    onSaveFailure(error, response) {
        if (this.isValidationError(response)) {
            this.onSaveValidationFailure(this.getValidationErrors(response));
            return;
        }

        this.onFatalSaveFailure(error, response);
    }

    /**
     * Called when a delete request was successful.
     */
    onDeleteSuccess(response) {
        this.clear();
        this.removeFromAllCollections();

        Vue.set(this, 'deleting', false);
        Vue.set(this, 'fatal',    false);
    }

    /**
     * Called when a delete request resulted in a general error.
     *
     * @param {Error}  error
     * @param {Object} response
     */
    onDeleteFailure(error, response) {
        Vue.set(this, 'deleting', false);
        Vue.set(this, 'fatal',    true);
    }

    /**
     * Called before a fetch request is made.
     *
     * @returns {boolean|undefined} `false` if the request should not be made.
     */
    onFetch() {

        // Don't fetch if already fetching. This prevents accidental requests
        // that sometimes occur as a result of a double-click.
        if (this.loading) {
            return false;
        }

        // Abort if any of the fetch event listeners returned false.
        if ( ! this.emit('fetch')) {
            return false;
        }

        // Because we're fetching new data, we can assume that this model is
        // now loading. This allows the template to indicate a loading state.
        Vue.set(this, 'loading', true);
    }

    /**
     * @returns {boolean} whether this model is not persisted yet, ie. has not
     *                    been created yet. The default test is to check if the
     *                    model's identifier is missing.
     */
    isNew() {
        return _.isNil(this.identifier());
    }

    /**
     * @returns {boolean} the opposite of `isNew`, returns `true` if this model
     *                    is already persisted somewhere else.
     */
    isExisting() {
        return ! this.isNew();
    }

    /**
     * Called before a save request is made.
     *
     * @param {Collection} [collection] The collection that is saving this model.
     *
     * @returns {boolean} `false` if the request should not be made.
     */
    onSave(collection) {

        // Don't save if we're already busy saving this model.
        // This prevents things like accidental double-clicks.
        if (this.saving) {
            return false;
        }

        // Mutate attribute before we save if required to do so.
        if (this.option('mutateBeforeSave')) {
            this.mutate();
        }

        // Data that will be sent in the save request.
        let data = this.getSaveData();

        // Cancel the request if we're patching but there isn't any data to patch.
        if (this.shouldPatch() && _.isEmpty(data) && ! this.shouldPatchUnchanged()) {
            return false;
        }

        // Validate all attributes before saving.
        if (this.option('validateOnSave') && ! this.validate(_.keys(data))) {
            throw new ValidationError(this.errors);
        }

        // Abort if any of the save event listeners returned false.
        if ( ! this.emit('save', {collection})) {
            return false;
        }

        Vue.set(this, 'saving', true);
    }

    /**
     * Called before a delete request is made.
     *
     * @param {Collection} [collection] The collection that is deleting this model.
     *
     * @returns {boolean} `false` if the request should not be made.
     */
    onDelete(collection) {

        // Don't save if we're already busy deleting this model.
        if (this.deleting) {
            return false;
        }

        // Abort if any of the delete event listeners returned false.
        if ( ! this.emit('delete', {collection})) {
            return false;
        }

        Vue.set(this, 'deleting', true);
    }
}

export default Model;
