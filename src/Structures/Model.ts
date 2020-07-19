import Vue from 'vue';
import castArray from 'lodash/castArray';
import cloneDeep from 'lodash/cloneDeep';
import defaults from 'lodash/defaults';
import defaultTo from 'lodash/defaultTo';
import each from 'lodash/each';
import filter from 'lodash/filter';
import first from 'lodash/first';
import flow from 'lodash/flow';
import get from 'lodash/get';
import has from 'lodash/has';
import head from 'lodash/head';
import invert from 'lodash/invert';
import isArray from 'lodash/isArray';
import isEmpty from 'lodash/isEmpty';
import isEqual from 'lodash/isEqual';
import isFunction from 'lodash/isFunction';
import isNil from 'lodash/isNil';
import isObject from 'lodash/isObject';
import isObjectLike from 'lodash/isObjectLike';
import isPlainObject from 'lodash/isPlainObject';
import isString from 'lodash/isString';
import isUndefined from 'lodash/isUndefined';
import keys from 'lodash/keys';
import mapValues from 'lodash/mapValues';
import merge from 'lodash/merge';
import once from 'lodash/once';
import pick from 'lodash/pick';
import values from 'lodash/values';

import Base, {HttpMethods, Options, RequestOperation, RequestType} from './Base';
import Collection from './Collection';
import ResponseError from '../Errors/ResponseError';
import Response from "../HTTP/Response";
import {Rule} from "../Validation";
import ProxyResponse from '../HTTP/ProxyResponse';
import {Method} from "axios";

/**
 * Reserved keywords that can't be used for attribute or option names.
 */
const RESERVED = invert([
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
 * Recursive deep copy helper that honours the "clone" function of models and
 * collections. This is required to support nested instances.
 *
 * @param {Object} source
 * @param {Object} target
 * @param {Array}  keys     Optional
 */
const copyFrom = function(source: Record<string, any>, target: Record<string, any>, keys?: string[]): void {
    if (keys) {
        source = pick(source, keys);
    }

    each(source, (value, key): void => {
        if (isArray(value)) {
            Vue.set(target, key, []);
            copyFrom(value, target[key]);

        } else if (isPlainObject(value)) {
            Vue.set(target, key, {});
            copyFrom(value, target[key]);

        } else if (isObject(value) && isFunction((value as Collection | Model).clone)) {
            Vue.set(target, key, (value as Collection | Model).clone());

        } else {
            Vue.set(target, key, cloneDeep(value));
        }
    });
};

/**
 * Base model class.
 */
class Model extends Base {
    [key: string]: any;
    readonly loading!: boolean;
    readonly saving!: boolean;
    readonly deleting!: boolean;
    readonly fatal!: boolean;

    private readonly _attributes!: Record<string, any>;
    private readonly _collections!: Collection[];

    private readonly _reference!: Record<string, any>;
    private _mutations!: Record<string, Mutation>;
    private readonly _errors!: Record<string, string[]>;

    /**
     * A convenience wrapper around the model's attributes that are saved.
     * This is similar to the `saved` method, but instead of accessing a single
     * property it returns the whole saved object, so that you can do something
     * like model.$.attribute when you want to display it somewhere.
     *
     * @returns {Object} This model's saved, reference data.
     */
    get $(): Record<string, any> {
        return this._reference;
    }

    /**
     * @returns {Object} This model's "active" state attributes.
     */
    get attributes(): Record<string, any> {
        return this._attributes;
    }

    /**
     * @returns {Object} The collection that this model is registered to.
     */
    get collections(): Collection[] {
        return values(this._collections);
    }

    /**
     * @returns {Object} This model's errors, which are cleared automatically.
     */
    get errors(): Record<string, string | string[]> {
        return this.getErrors();
    }

    /**
     * Creates a new instance, called when using 'new'.
     *
     * @param  {Object}     [attributes]  Model attributes
     * @param  {Collection} [collection]  Collection that this model belongs to.
     * @param  {Object}     [options]     Options to set on the model.
     */
    constructor(attributes = {}, collection: Collection | null = null, options = {}) {
        super(options);

        Vue.set(this, '_collections', {});  // Collections that contain this model.
        Vue.set(this, '_reference',   {});  // Saved attribute state.
        Vue.set(this, '_attributes',  {});  // Active attribute state.
        Vue.set(this, '_mutations',   {});  // Mutator cache.
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
     * Creates a copy of this model, with the same attributes and options. The
     * clone will also belong to the same collections as the subject.
     *
     * @returns {Model}
     */
    clone(): Model {
        let attributes: Record<string, any> = {};
        let reference: Record<string, any>  = {};

        // Clone all attributes and their descriptors.
        copyFrom(this._attributes, attributes);
        copyFrom(this._reference, reference);

        // Create a copy.
        let clone: Model = new (this.constructor as typeof Model)();

        // Make sure that the clone belongs to the same collections.
        clone.registerCollection(this.collections);

        // Make sure that the clone has the same existing options.
        clone.setOptions(this.getOptions());

        Vue.set(clone, '_reference', reference);
        Vue.set(clone, '_attributes', attributes);

        return clone;
    }

    /**
     * Prepare certain methods to only be called once. These are methods that
     * are expected to return the same data every time.
     *
     * @see {@link https://lodash.com/docs/#once}
     */
    memoize(): void {
        let memoized = [
            'validation',  //   \
            'defaults',    //   | These do not need to be evaluated every time.
            'routes',      //  /
        ];

        each(memoized, (name): void => this[name] = once(this[name]));
    }

    /**
     * Returns the model's identifier value.
     */
    identifier(): string {
        return this.saved(this.getOption('identifier'));
    }

    /**
     * @returns {Object} An empty representation of this model.
     *                   It's important that all model attributes have a default
     *                   value in order to be reactive in Vue.
     */
    defaults(): Record<string, any> {
        return {};
    }

    /**
     * @returns {Object} Attribute mutations keyed by attribute name.
     */
    mutations(): Record<string, Mutation | Mutation[]> {
        return {};
    }

    /**
     * Add validation rules here, or use option?
     */
    validation(): Record<string, Rule> {
        return {};
    }

    /**
     * Returns the default options for this model.
     *
     * @returns {Object}
     */
    getDefaultOptions(): ModelOptions {
        return merge({}, super.getDefaultOptions(), {

            // The attribute that should be used to uniquely identify this model.
            identifier: 'id',

            // Whether this model should allow an existing identifier to be
            // overwritten on update.
            overwriteIdentifier: false,

            // Whether this model should perform a "patch" on update,
            // which will only send changed attributes in the request.
            patch: false,

            // Whether this model should save even if no attributes have changed
            // since the last time they were synced. If set to `false` and no
            // changes have been made, the request will be considered a success.
            saveUnchanged: true,

            // Whether this model should only use the first validation error it
            // receives, rather than an array of errors.
            useFirstErrorOnly: false,

            // Whether this model should validate an attribute that has changed.
            // This would only affect the errors of the changed attribute and
            // will only be applied if the value is not a blank string.
            validateOnChange: false,

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
     * Compiles all mutations into pipelines that can be executed quickly.
     */
    compileMutators(): void {
        this._mutations = mapValues(this.mutations(), (m: Mutation | Mutation[]): Mutation => flow(m as Mutation[]));
    }

    /**
     * @returns {Object} Parameters to use for replacement in route patterns.
     */
    getRouteParameters(): Record<string, any> {
        return merge({}, super.getRouteParameters(), this._attributes);
    }

    /**
     * Registers a collection on this model. When this model is created it will
     * automatically be added to the collection. Similarly, when this model is
     * delete it will be remove from the collection. Registering the same
     * collection more than once has no effect.
     *
     * @param {Collection} collection
     */
    registerCollection(collection: Collection | Collection[]): void {
        if (isArray(collection)) {
            each(collection, this.registerCollection);
            return;
        }

        if (isNil(collection) || isUndefined(collection._uid)) {
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
    unregisterCollection(collection: Collection): void {
        if (isArray(collection)) {
            each(collection, this.unregisterCollection);
            return;
        }

        if (isNil(collection) || isUndefined(collection._uid)) {
            throw new Error('Collection is not valid');
        }

        Vue.delete(this._collections, collection._uid);
    }

    /**
     * Reverts all attributes back to their defaults, and completely removes all
     * attributes that don't have defaults. This will also sync the reference
     * attributes, and is not reversable.
     */
    clearAttributes(): void {
        let defaults: Record<string, any> = this.defaults();

        Vue.set(this, '_attributes', cloneDeep(defaults));
        Vue.set(this, '_reference',  cloneDeep(defaults));
    }

    /**
     * Reverts all attributes back to their defaults, and completely removes all
     * attributes that don't have defaults. This will also sync the reference
     * attributes, and is not reversable.
     */
    clear(): void {
        this.clearAttributes();
        this.clearErrors();
        this.clearState();
    }

    /**
     * Resets model state, ie. `loading`, etc back to their initial states.
     */
    clearState(): void {
        Vue.set(this, 'loading',  false);
        Vue.set(this, 'saving',   false);
        Vue.set(this, 'deleting', false);
        Vue.set(this, 'fatal',    false);
    }

    /**
     * Assigns all given model data to the model's attributes and reference.
     * This will also fill any gaps using the model's default attributes.
     *
     * @param {Object} attributes
     *
     * @returns {Object} The attributes that were assigned to the model.
     */
    assign(attributes: Record<string, any>): void {
        this.set(defaults({}, attributes, cloneDeep(this.defaults())));
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
    reset(attribute: string | string[]): void {

        // Reset specific attributes.
        if (attribute) {
            copyFrom(this._reference, this._attributes, castArray(attribute));

        // Reset all attributes if one or more specific ones were not given.
        } else {
            copyFrom(this._reference, this._attributes);
        }

        this.clearErrors();
        this.emit('reset');
    }

    /**
     * @returns {*} The value of an attribute after applying its mutations.
     */
    mutated(attribute: string, value: any): any {
        let mutator: Mutation = get(this._mutations, attribute);

        if (mutator) {
            return mutator(value);
        }

        return value;
    }

    /**
     * Mutates either specific attributes or all attributes if none provided.
     * @param {string|string[]|undefined} attribute
     */
    mutate(attribute?: string | string[]): void {
        if (isUndefined(attribute)) {
            each(this._attributes, (value, attribute): void => {
                Vue.set(this._attributes, attribute, this.mutated(attribute, value));
            });

        // Only mutate specific attributes.
        } else {
            each(castArray(attribute), (attribute): void => {
                let current: any = this.get(attribute);
                let mutated: any = this.mutated(attribute, current);

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
    sync(attribute?: string | string[]): void {

        // Mutate all attributes before we sync them, if required to do so.
        if (this.getOption('mutateBeforeSync')) {
            this.mutate(attribute);
        }

        // We're cloning deep to avoid multiple references to the same object,
        // otherwise updating the attributes will also update the reference.
        // Set each saved attribute to its active equivalent.
        let active: Record<string, any> = cloneDeep(this._attributes);

        // Sync either specific attributes or all attributes if none provided.
        if (isUndefined(attribute)) {
            Vue.set(this, '_reference', active);

        } else {
            each(castArray(attribute), (attribute): void => {
                Vue.set(this._reference, attribute, get(active, attribute));
            });
        }

        this.emit('sync');
    }

    /**
     * Registers an attribute on this model so that it can be accessed directly
     * on the model, passing through `get` and `set`.
     */
    registerAttribute(attribute: string): void {

        // Protect against unwillingly using an attribute name that already
        // exists as an internal property or method name.
        if (has(RESERVED, attribute)) {
            throw new Error(`Can't use reserved attribute name '${attribute}'`);
        }

        // Create dynamic accessors and mutations so that we can update the
        // model directly while also keeping the model attributes in sync.
        Object.defineProperty(this, attribute, {
            get: (): any => this.get(attribute),
            set: <T>(value: T): T | undefined => this.set(attribute, value),
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
    set<T = any>(attribute: string | Record<string, any>, value?: T): T | undefined {

        // Allow batch set of multiple attributes at once, ie. set({...});
        if (isPlainObject(attribute)) {
            each(attribute as Record<string, any>, (value, key): void => {
                this.set(key, value);
            });

            return;
        }

        let defined: boolean = this.has(attribute as string);

        // Only register the pass-through property if it's not already set up.
        // If it already exists on the instance, we know it has been.
        if ( ! defined) {
            this.registerAttribute(attribute as string);
        }

        // Current value of the attribute, or `undefined` if not set
        let previous: any = this.get(attribute as string);

        // Run the attribute's mutations if required to do so on change.
        if (this.getOption('mutateOnChange')) {
            value = this.mutated(attribute as string, value);
        }

        Vue.set(this._attributes, attribute as string, value);

        // Only consider a change if the attribute was already defined.
        let changed: boolean = defined && ! isEqual(previous, value);

        if (changed) {

            // Validate on change only if it's not the first time it's set.
            if (this.getOption('validateOnChange')) {
                Vue.nextTick((): Promise<ValidationResultErrorFinalResult> => this.validateAttribute(attribute as string));
            }

            // Emit the change event after
            this.emit('change', {attribute, previous, value});
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
    unset(attribute: string | string[]): void {

        // We're cloning deep to avoid multiple references to the same object,
        // otherwise updating the attributes will also update the reference.
        let defaults: Record<string, any> = cloneDeep(this.defaults());

        // Unset either specific attributes or all attributes if none provided.
        let attributes: string | string[] = defaultTo(attribute, keys(this._attributes));

        // Unset either specific attributes or all attributes if none provided.
        each(castArray(attributes), (attribute): void => {
            if (this.has(attribute)) {
                Vue.set(this._attributes, attribute, get(defaults, attribute));
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
    get(attribute: string, fallback?: any): any {
        return get(this._attributes, attribute, fallback);
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
    saved(attribute: string, fallback?: any): any {
        return get(this._reference, attribute, fallback);
    }

    /**
     * Determines if the model has an attribute.
     *
     * @param  {string}  attribute
     * @returns {boolean} `true` if an attribute exists, `false` otherwise.
     *                   Will return true if the object exists but is undefined.
     */
    has(attribute: string): boolean {
        return has(this._attributes, attribute);
    }

    /**
     * @return {Array}
     */
    getValidateRules(attribute: string): Rule[] {
        return castArray(get(this.validation(), attribute, [] as Rule[]));
    }

    /**
     * Validates a specific attribute of this model, and sets errors for it.
     *
     * @returns {boolean} `true` if valid, `false` otherwise.
     */
    validateAttribute(attribute: string): Promise<ValidationResultErrorFinalResult> {
        if (!this.has(attribute)) {
            return Promise.reject(new Error(`'${attribute}' is not defined`));
        }

        let value: any              = this.get(attribute);
        let rules: Rule[]           = this.getValidateRules(attribute);
        let tasks: ValidationTask[] = rules.map((rule): true | string => rule(value, attribute, this));

        // Check if any nested values should be validated also.
        if (this.getOption('validateRecursively')) {
            if (isFunction(get(value, 'validate'))) {
                tasks.push((value as Model).validate());
            }
        }

        return (Promise.all(tasks) as Promise<ValidationResultError[]>)
            .then((errors: ValidationResultError[]): ValidationResultErrorFinalResult => {

                // Unpack a nested error set.
                if (isArray(errors) && isArray(first(errors))) {
                    errors = first(errors as ValidationResult[]) as ValidationResultError[];
                }

                // Errors will always be messages or nested error objects.
                errors = filter(errors, (e): boolean => isString(e) || isObject(e)) as ValidationResultError[];

                // Set errors for the model being validated.
                this.setAttributeErrors(attribute, errors);

                // Check to see if we should yield only the first error.
                if (this.getOption('useFirstErrorOnly') && !isEmpty(errors)) {
                    return first(errors)!;
                }

                return errors;
            });
    }

    /**
     * Validates all attributes.
     *
     * @param {Object} [attributes] One or more attributes to validate.
     *
     * @returns {Promise}
     */
    validate(attributes?: string | string[]): Promise<ValidationResultErrorFinalResult> {
        if (isUndefined(attributes)) {
            attributes = Object.keys(this._attributes);
        }

        // Support a single, string attribute.
        if (isString(attributes)) {
            return this.validateAttribute(attributes).then((errors): Record<string, string> => {
                return (!isEmpty(errors) ? {[attributes as string]: errors} : {}) as Record<string, string>;
            });
        }

        // Support an array of attributes to validate.
        if (isArray(attributes)) {
            let $errors: Record<string, ValidationResultErrorFinalResult> = {};

            let tasks: Promise<void>[] = attributes.map((attribute): Promise<void> => {
                return this.validateAttribute(attribute).then((errors: ValidationResultErrorFinalResult): void => {
                    if (!isEmpty(errors)) {
                        $errors[attribute] = errors;
                    }
                });
            });

            return Promise.all(tasks).then((): Record<string, ValidationResultErrorFinalResult> => $errors);
        }

        return Promise.reject(new Error("Invalid argument for validation attributes"));
    }

    /**
     * @returns {Object} A native representation of this model that will determine
     *                   the contents of JSON.stringify(model).
     */
    toJSON(): Record<string, any> {
        return this._attributes;
    }

    /**
     * Adds this model to all registered collections.
     */
    addToAllCollections(): void {
        each(this._collections, (collection): void => {
            collection.add(this);
        });
    }

    /**
     * Removes this model from all registered collections.
     */
    removeFromAllCollections(): void {
        each(this._collections, (collection): void => {
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
    changed(): string[] | false {
        let changed: string[] = [];

        each(this._attributes, (value, attribute): void => {
            if ( ! isEqual(value, this.saved(attribute))) {
                changed.push(attribute);
            }
        });

        return ! isEmpty(changed) ? changed : false;
    }

    /**
     * Called when a fetch request was successful.
     */
    onFetchSuccess(response: Response): void {
        let attributes: any = response.getData();

        // A fetch request must receive *some* data in return.
        if (isEmpty(attributes)) {
            throw this.createResponseError("No data in fetch response", response);
        }

        this.assign(attributes as Record<string, any>);

        Vue.set(this, 'fatal',   false);
        Vue.set(this, 'loading', false);

        this.emit('fetch', {error: null});
    }

    /**
     * Called when a fetch request failed.
     *
     * @param {Error}  error
     */
    onFetchFailure(error: any): void {
        Vue.set(this, 'fatal',   true);
        Vue.set(this, 'loading', false);

        this.emit('fetch', {error});
    }

    /**
     * @returns {string} The key to use when generating the `patch` URL.
     */
    getPatchRoute(): Method {
        return this.getRoute('patch', 'save') as Method;
    }

    /**
     * @returns {string} The key to use when generating the `create` URL.
     */
    getCreateRoute(): Method {
        return this.getRoute('create', 'save') as Method;
    }

    /**
     * @returns {string} The key to use when generating the `update` URL.
     */
    getUpdateRoute(): Method {
        if (this.shouldPatch()) {
            return this.getPatchRoute();
        }

        return this.getRoute('update', 'save') as Method;
    }

    /**
     * @returns {string} The method to use when making an update request.
     */
    getUpdateMethod(): Method {
        return this.shouldPatch() ? this.getPatchMethod() : super.getUpdateMethod();
    }

    /**
     * @returns {string} The method to use when making an save request.
     */
    getSaveMethod(): Method {
        return this.isNew() ? this.getCreateMethod() : this.getUpdateMethod();
    }

    /**
     * @inheritDoc
     */
    getSaveRoute(): Method {
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
    shouldPatch(): boolean {
        return Boolean(this.getOption('patch'));
    }

    /**
     * @returns {Object} The data to send to the server when saving this model.
     */
    getSaveData(): Record<string, any> {
        // Only use changed attributes if patching.
        if (this.isExisting() && this.shouldPatch()) {
            // @ts-ignore
            // Since this.changed() can return false, this doesn't match the typings of _.pick(),
            // but it won't affect the actual result.
            return pick(this._attributes, this.changed(), this.getOption('identifier'));
        }

        return this._attributes;
    }

    /**
     * @returns {*} A potential identifier parsed from response data.
     */
    parseIdentifier(data: any): any {
        return data;
    }

    /**
     * @returns {boolean} Whether the given identifier is considered a valid
     *                   identifier value for this model.
     */
    isValidIdentifier(identifier: any): boolean {
        return Boolean(identifier);
    }

    /**
     * @returns {boolean} Whether this model allows an existing identifier to be
     *                    overwritten on update.
     */
    shouldAllowIdentifierOverwrite(): boolean {
        return Boolean(this.getOption('overwriteIdentifier'));
    }

    /**
     * Updates the model data with data returned from the server.
     *
     * @param {Object} response
     */
    update(data: Record<string, any>): void {

        // No content means we don't want to update the model at all.
        // The attributes that we passed in the request should now be considered
        // the source of truth, so we should update the reference attributes here.
        if ( ! data || (isObjectLike(data) && isEmpty(data))) {
            this.sync();

        // A plain object implies that we want to update the model data.
        // It's not a requirement to respond with a complete dataset,
        // eg. a response to a patch request might return partial data.
        } else if (isPlainObject(data)) {
            this.assign(defaults({}, data, this._attributes));

        // There is some data, but it's not an object, so we can assume that the
        // response only returned an identifier for this model.
        } else {
            let identifier: any = this.parseIdentifier(data);

            // It's possible that the response didn't actually return a valid
            // identifier, so before we try to use it we should make sure that
            // we're not accidentially assigning the wrong data as identifiers.
            if (this.isValidIdentifier(identifier)) {

                // The current identifier of this model.
                let current: string = this.identifier();

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
                this.set(this.getOption('identifier'), identifier);
                this.sync();

            } else {
                throw new Error('Expected an empty response, object, or valid identifier');
            }
        }
    }

    /**
     * Sets errors for a specific attribute. Support the ability to clear error
     * by passing an empty value.
     *
     * @param {string}       attribute
     * @param {string|array} errors
     */
    setAttributeErrors(attribute: string, errors?: string | string[] | ValidationResultError[]): void {
        if (isEmpty(errors)) {
            Vue.delete(this._errors, attribute);
        } else {
            Vue.set(this._errors, attribute, castArray(errors));
        }
    }

    /**
     * Sets the errors on this model.
     *
     * @param {Object} errors
     */
    setErrors(errors?: Record<string, string | string[]>): void {
        if (isEmpty(errors)) {
            Vue.set(this, '_errors', {});
            return;
        }

        each(errors, (errors, attribute): void => {
            this.setAttributeErrors(attribute, errors);
        });
    }

    /**
     * @returns {Object} Validation errors on this model.
     */
    getErrors(): Record<string, string | string[]> {
        if (this.getOption('useFirstErrorOnly')) {
            return mapValues(this._errors, head) as Record<string, string>;
        }

        return this._errors;
    }

    /**
     * Clears all errors on this model.
     */
    clearErrors(): void {
        this.setErrors({});
        Vue.set(this, 'fatal', false);
    }

    /**
     * Called when a save request was successful.
     *
     * @param {Object|null} response
     */
    onSaveSuccess(response: ProxyResponse): void {
        let action;

        // Clear errors because the request was successful.
        this.clearErrors();

        if (response) {
            let responseData = response.getData();

            // Find if it's a create or update action
            action = 'update';
            if (response.getStatus() === 201 ||
                ( ! this.saved('id') && (isPlainObject(responseData) && get(responseData, 'id')))) {
                action = 'create'
            }

            // Update this model with the data that was returned in the response.
            this.update(responseData);
        }

        Vue.set(this, 'saving', false);
        Vue.set(this, 'fatal',  false);

        // Automatically add to all registered collections.
        this.addToAllCollections();

        this.emit('save.success', {error: null});

        if (action) {
            this.emit(action, {error: null});
        }
    }

    /**
     * Called when a save request resulted in a validation error.
     *
     * @param {Object} errors
     */
    onSaveValidationFailure(error: ResponseError): void {
        let errors: Record<string, any> | null = error.getResponse()!.getValidationErrors();

        if ( ! isPlainObject(errors)) {
            throw this.createResponseError('Validation errors must be an object', error.getResponse());
        }

        this.setErrors(errors as Record<string, any>);

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
    onFatalSaveFailure(error: any, response: Response | undefined): void {
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
    onSaveFailure(error: any, response: Response | undefined): void {
        if (this.isBackendValidationError(error)) {
            this.onSaveValidationFailure(error);
        } else {
            this.onFatalSaveFailure(error, response);
        }

        this.emit('save.failure', {error});
    }

    /**
     * Called when a delete request was successful.
     */
    onDeleteSuccess(response: Response): void {
        this.clear();
        this.removeFromAllCollections();

        Vue.set(this, 'deleting', false);
        Vue.set(this, 'fatal',    false);

        this.emit('delete', {error: null});
    }

    /**
     * Called when a delete request resulted in a general error.
     *
     * @param {Error}  error
     */
    onDeleteFailure(error: any): void {
        Vue.set(this, 'deleting', false);
        Vue.set(this, 'fatal',    true);

        this.emit('delete', {error});
    }

    /**
     * Called before a fetch request is made.
     *
     * @returns {boolean|undefined} `false` if the request should not be made.
     */
    onFetch(): Promise<RequestOperation> {
        return new Promise((resolve): void => {
            // Don't fetch if already fetching. This prevents accidental requests
            // that sometimes occur as a result of a double-click.
            if (this.loading) {
                return resolve(Base.REQUEST_SKIP);
            }

            Vue.set(this, 'loading', true);
            return resolve(Base.REQUEST_CONTINUE);
        });
    }

    /**
     * @returns {boolean} whether this model is not persisted yet, ie. has not
     *                    been created yet. The default test is to check if the
     *                    model's identifier is missing.
     */
    isNew(): boolean {
        return isNil(this.identifier());
    }

    /**
     * @returns {boolean} the opposite of `isNew`, returns `true` if this model
     *                    is already persisted somewhere else.
     */
    isExisting(): boolean {
        return ! this.isNew();
    }

    /**
     * Called before a save request is made.
     *
     * @returns {boolean} `false` if the request should not be made.
     */
    onSave(): Promise<RequestOperation> {
        this.emit('save', { error: null });

        return new Promise((resolve, reject): void => {

            // Don't save if we're already busy saving this model.
            // This prevents things like accidental double-clicks.
            if (this.saving) {
                return resolve(Base.REQUEST_SKIP);
            }

            // Don't save if no data has changed, but consider it a success.
            if ( ! this.getOption('saveUnchanged') && ! this.changed()) {
                return resolve(Base.REQUEST_REDUNDANT);
            }

            Vue.set(this, 'saving', true);

            // Mutate attribute before we save if required to do so.
            if (this.getOption('mutateBeforeSave')) {
                this.mutate();
            }

            this.validate().then((errors): void => {
                if (isEmpty(errors)) {
                    return resolve(Base.REQUEST_CONTINUE);
                }

                Vue.set(this, 'saving', false);
                return reject(this.createValidationError(this.errors));
            });
        });
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

        return new Promise((resolve): void => {
            Vue.set(this, 'deleting', true);
            resolve(Base.REQUEST_CONTINUE);
        });
    }
}

export default Model;

interface ModelOptions extends Options {
    [key: string]: any;

    methods?: Partial<Record<RequestType, HttpMethods>>;

    /**
     * The attribute that should be used to uniquely identify this model.
     */
    identifier?: string;

    /**
     * Whether this model should allow an existing identifier to be
     * overwritten on update.
     */
    overwriteIdentifier?: boolean;

    /**
     * Route parameter matching pattern.
     */
    routeParameterPattern?: RegExp;

    /**
     * Whether this model should perform a "patch" on update,
     * which will only send changed attributes in the request.
     */
    patch?: boolean;

    /**
     * Whether this model should save even if no attributes have changed
     * since the last time they were synced. If set to `false` and no
     * changes have been made, the request will be considered a success.
     */
    saveUnchanged?: boolean;

    /**
     * Whether this model should only use the first validation error it
     * receives, rather than an array of errors.
     */
    useFirstErrorOnly?: boolean;

    /**
     * Whether this model should validate an attribute that has changed.
     * This would only affect the errors of the changed attribute and
     * will only be applied if the value is not a blank string.
     */
    validateOnChange?: boolean;

    /**
     * Whether this model should be validated before it is saved. This
     * will cause the request to fail if validation does not pass. This
     * is useful when you only want to validate on demand.
     */
    validateOnSave?: boolean;

    /**
     * Whether this model should validate models and collections within
     * its attribute tree. The result is implicit recursion as each of
     * those instances will also validate their trees, etc.
     */
    validateRecursively?: boolean;

    /**
     * Whether this model should mutate a property as it is changed,
     * before it is set. This is a rare requirement because you usually
     * don't  want to mutate something that you are busy editing.
     */
    mutateOnChange?: boolean;

    /**
     * Whether this model should mutate all attributes before they are
     * synced to the "saved" state. This would include construction,
     * on fetch, on save, and on assign.
     */
    mutateBeforeSync?: boolean;

    /**
     * Whether this model should use mutated values for the attributes
     * in "save" request. This will not mutate the active state.
     */
    mutateBeforeSave?: boolean;
}

export type Mutation = (value: any) => any;

export type ValidationTask        = true | string | Promise<ValidationResult>;
export type ValidationResult      = true | string | AttributesValidationErrors | (string | AttributesValidationErrors)[];
export type ValidationResultError = string | AttributesValidationErrors;
export type ValidationResultErrorFinalResult = ValidationResultError | ValidationResultError[];

export interface AttributesValidationErrors {
    [key: string]: ValidationResultErrorFinalResult;
}
