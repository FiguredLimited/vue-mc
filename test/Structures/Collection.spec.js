import moxios from 'moxios'
import {assert, expect} from 'chai'
import {Model, Collection} from '../../src/index.js'
import {email, string} from '../../src/Validation/index.js'
import * as _ from 'lodash';

moxios.delay = 1;

function expectRequestToBeSkipped(request, done) {
    let error = new Error("Request was not skipped");
    let delay = 2;

    request.then(() => done(error)).catch(() => done(error));
    _.delay(done, delay);
}

/**
 * Unit tests for Collection.js
 */
describe('Collection', () => {

    describe('_uid', () => {
        it('should automatically generate unique incrementing ids', () => {
            let base = (new Collection())._uid;

            expect((new Collection())._uid).to.equal(_.toString(_.toSafeInteger(base) + 1));
            expect((new Collection())._uid).to.equal(_.toString(_.toSafeInteger(base) + 2));
            expect((new Collection())._uid).to.equal(_.toString(_.toSafeInteger(base) + 3));
        });
    })

    describe('toString', () => {
        it('should return the expected string representation', () => {
            let c = new Collection();
            expect(`${c}`).to.equal(`<Collection #${c._uid}>`);
        })

        it('should use the class name of the extending class', () => {
            class C extends Collection {}
            let c = new C();
            expect(`${c}`).to.equal(`<C #${c._uid}>`);
        })
    })

    describe('setOptions', () => {
        it('should merge recursively', () => {
            let m = new Model({}, null, {
                methods: {
                    patch: 'CONSTRUCTOR',
                }
            });

            expect(m.getOption('methods.patch')).to.equal('CONSTRUCTOR');
            expect(m.getOption('methods.fetch')).to.equal('GET');
        })

        it('should should merge with instance options', () => {
            let m = new class extends Model {
                options() {
                    return {
                        methods: {
                            update: 'INSTANCE',
                            patch:  'INSTANCE',
                        }
                    }
                }
            }({}, null, {
                methods: {
                    patch: 'CONSTRUCTOR',
                }
            });

            expect(m.getOption('methods.patch')).to.equal('CONSTRUCTOR');
            expect(m.getOption('methods.update')).to.equal('INSTANCE');
            expect(m.getOption('methods.fetch')).to.equal('GET');
        })
    })

    describe('get', () => {
        it('should return an attribute that was set by the constructor', () => {
            let c = new Collection([], {}, {a: 1});
            expect(c.get('a')).to.equal(1);
        })

        it('should return an attribute that was set by "set"', () => {
            let c = new Collection([], {}, {});
            c.set('a', 1);
            expect(c.get('a')).to.equal(1);
        })

        it('should return the fallback of an attribute that has not been set', () => {
            let c = new Collection([], {}, {});
            expect(c.get('a', 1)).to.equal(1);
        })
    })

    describe('set', () => {
        it('should set the value of an attribute', () => {
            let c = new Collection([], {}, {});
            c.set('a', 1);
            expect(c.get('a')).to.equal(1);
        })

        it('should set multiple attributes if given an object', () => {
            let c = new Collection([], {}, {});
            c.set({
                a: 1,
                b: 2,
            });

            expect(c.get('a')).to.equal(1);
            expect(c.get('b')).to.equal(2);
        })

        it('should override a previous value', () => {
            let c = new Collection([], {}, {a: 1});
            c.set('a', 2);

            expect(c.get('a')).to.equal(2);
        })
    })

    describe('on', () => {
        it('should register event listener', () => {
            let c = new Collection();
            let f = () => {}
            c.on('test', f)

            expect(c._listeners).to.deep.equal({test: [f]});
        })
    })

    describe('emit', () => {
        it('should emit event to all listeners', () => {
            let c = new Collection();

            let count = 0;

            let calls = {
                a: false,
                b: false,
                c: false,
            }

            c.on('test', () => { calls.a = true; count++; });
            c.on('test', () => { calls.b = true; count++; });
            c.on('test', () => { calls.c = true; count++; });

            c.emit('test');

            expect(count).to.equal(3);

            expect(calls.a).to.equal(true);
            expect(calls.b).to.equal(true);
            expect(calls.c).to.equal(true);
        })

        it('should not mind if we emit when no listeners exist', () => {
            let c = new Collection();
            c.emit('test');
        })

        it('should emit all events even if some are rejected', () => {
            let c = new Collection();

            let count = 0;

            let calls = {
                a: false,
                b: false,
                c: false,
            }

            c.on('test', () => { calls.a = true; count++; });
            c.on('test', () => { calls.b = true; count++; return false; });
            c.on('test', () => { calls.c = true; count++; return false; });

            c.emit('test');

            expect(count).to.equal(2);

            expect(calls.a).to.equal(true);
            expect(calls.b).to.equal(true);
            expect(calls.c).to.equal(false);
        })
    })

    describe('getRouteParameters', () => {
        it('should include attributes', () => {
            let c = new Collection([], {}, {a: 1});
            expect(c.getRouteParameters().a).to.equal(1);
        })

        it('should include page', () => {
            let c = new Collection([], {}, {});
            c.page(5);
            expect(c.getRouteParameters().page).to.equal(5);
        })

        it('should include page even if not set', () => {
            let c = new Collection([], {}, {});
            expect(c.getRouteParameters().page).to.equal(null);
        })
    })

    describe('getURL', () => {
        it('should return basic route', () => {
            let C = class extends Collection {
                routes() { return {'fetch': 'http://domain.com/path'} }
            }

            let c = new C();
            expect(c.getFetchURL()).to.equal('http://domain.com/path');
        })

        it('should return route with replaced parameters', () => {
            let c = new class extends Collection {
                routes() { return {'fetch': 'http://domain.com/{page}'} }
            }

            c.page(5);
            expect(c.getFetchURL()).to.equal('http://domain.com/5');
        })

        it('should use the route resolver', () => {
            let c = new class extends Collection {
                routes() {
                    return {
                        'fetch': 'http://domain.com/:page'
                    }
                }
                getRouteResolver() {
                    return (key, parameters) => {
                        return _.reduce(parameters, (result, value, key) => {
                            return _.replace(result, ':' + key, _.toString(value));
                        }, key);
                    }
                }
            }

            c.page(5);
            expect(c.getFetchURL()).to.equal('http://domain.com/5');
        })

        it('should fail when a route key is not defined', () => {
            let c = new class extends Collection {
                routes() { return {} }
            }

            try {
                c.getFetchURL();
            } catch (e) {
                return;
            }

            assert.fail();
        })

        it('should render undefined parameters', () => {
            let C = class extends Collection {
                routes() { return {'fetch': 'http://domain.com/{opt}'} }
            }

            let c = new C([], {opt: undefined});
            expect(c.getFetchURL()).to.equal('http://domain.com/undefined');
        })

        it('should render null parameters', () => {
            let C = class extends Collection {
                routes() { return {'fetch': 'http://domain.com/{page}'} }
            }

            let c = new C([], {page: null});
            expect(c.getFetchURL()).to.equal('http://domain.com/null');
        })
    })

    describe('add', () => {
        it('should support adding a model', () => {
            let c = new (class extends Collection {});
            let m = new Model();
            c.add(m);

            expect(m.collections).to.deep.equal([c]);
            expect(c.models).to.deep.equal([m]);
        })

        it('should support adding a plain object', () => {
            let c = new (class extends Collection {});
            let m = c.add({a: 1});

            expect(m.collections).to.deep.equal([c]);
            expect(c.models).to.deep.equal([m]);

            expect(m.a).to.equal(1);
            expect(m.$.a).to.equal(1);
        })

        it('should support adding an array of models', () => {
            let c = new (class extends Collection {});

            let m1 = new Model();
            let m2 = new Model();

            let added = c.add([m1, m2]);

            expect(added).to.deep.equal([m1, m2]);

            expect(m1.collections).to.deep.equal([c]);
            expect(m2.collections).to.deep.equal([c]);

            expect(c.models).to.deep.equal([m1, m2]);
        })

        it('should support adding an array of plain objects', () => {
            let c = new (class extends Collection {});

            let obj1 = {a: 1};
            let obj2 = {b: 2};

            let added = c.add([obj1, obj2]);

            let m1 = added[0];
            let m2 = added[1];

            expect(m1.attributes).to.deep.equal(obj1);
            expect(m2.attributes).to.deep.equal(obj2);

            // Make sure that we're not using the same object reference.
            expect(m1.attributes).to.not.equal(obj1);
            expect(m2.attributes).to.not.equal(obj2);

            expect(m1.collections).to.deep.equal([c]);
            expect(m2.collections).to.deep.equal([c]);

            expect(c.models).to.deep.equal([m1, m2]);
        })

        it('should fail if we try to add a non-object-like model', () => {
            try {
                (new Collection()).add(5);
            } catch (e) {
                return;
            }
            assert.fail();
        })

        it('should return one model if adding one', () => {
            let c = new Collection();
            expect(c.add({})).to.be.an('object');
            expect(c.add({})).to.be.an.instanceof(Model);
        })

        it('should return an array of models when adding many', () => {
            let c  = new Collection();
            let m1 = new Model();
            let m2 = new Model();

            let added = c.add([m1, m2])

            expect(added).to.be.an('array');
            expect(added[0]).to.be.an.instanceof(Model);
        })

        it('should return an array of models when adding many plain objects', () => {
            let c = new Collection();

            let added = c.add([{a: 1}, {a: 2}])

            expect(added).to.be.an('array');

            expect(added[0]).to.be.an.instanceof(Model);
            expect(added[1]).to.be.an.instanceof(Model);

            expect(added[0].a).to.equal(1);
            expect(added[1].a).to.equal(2);
        })

        it('should emit "add" on add', (done) => {
            let c = new Collection();
            c.on('add', (event) => {
                expect(event.target).to.equal(c);
                expect(event.model.a).to.equal(1);
                expect(event.model).to.be.an.instanceof(Model);
                done();
            })
            c.add({a: 1});
        })

        it('should not allow adding the same model more than once', () => {
            let c = new Collection();

            let adds = 0;
            c.on('add', () => { adds++; })

            let m = c.add({id: 1});
            c.add(m);
            c.add(m);

            expect(adds).to.equal(1);
            expect(c.models).to.deep.equal([m]);
        })

        it('should fail if we try to add something that is not a model', (done) => {
            let c = new Collection();
            try {
                c.add(new Error());
            } catch (e) {
                expect(e.message).to.equal('Expected a model, plain object, or array of either');
                done();
            }
        })
    })

    describe('clear', () => {
        it('should clear all models', () => {
            let c = new Collection();
            c.add({a: 1});
            c.add({b: 2});
            c.add({c: 3});

            expect(c.length).to.equal(3);
            c.clear();

            expect(c.length).to.equal(0);
            expect(c.models).to.be.empty;
        })

        it('should emit "remove" for each model that is cleared', () => {
            let c = new Collection();

            let m1 = c.add({id: 1, removed: false});
            let m2 = c.add({id: 2, removed: false});
            let m3 = c.add({id: 3, removed: false});

            c.on('remove', (e) => {
                e.model.removed = true;
            });

            c.clear();

            expect(m1.removed).to.equal(true);
            expect(m2.removed).to.equal(true);
            expect(m3.removed).to.equal(true);
        })

        it('should unregister all cleared models from the collection', () => {
            let c = new Collection();
            let m = new Model();

            c.add(m);
            expect(m.collections.length).to.equal(1);

            c.clear();
            expect(m.collections.length).to.equal(0);
        })
    })

    describe('validate', () => {
        it('should validate all models', () => {
            let c  = new Collection();

            let M1 = class extends Model {
                validation() {
                    return {
                        a: email,
                        b: string,
                    }
                }
            }

            let M2 = class extends Model {
                validation() {
                    return {
                        c: email,
                    }
                }
            }

            let m1 = c.add(new M1({a: 1, b: 2}));
            let m2 = c.add(new M2({c: 3}));

            expect(c.validate()).to.equal(false);
            expect(m1.errors).to.to.have.property('a');
            expect(m1.errors).to.to.have.property('b');

            expect(m2.errors).to.to.have.property('c');
        })

        it('should pass with no models', () => {
            let c  = new Collection();
            expect(c.validate()).to.equal(true);
        })

        it('should pass with no models that have validation', () => {
            let c = new Collection([{}, {}]);
            expect(c.validate()).to.equal(true);
        })
    })

    describe('clearErrors', () => {
        it('should clear validation errors from all models', () => {
            let c = new Collection();
            let m = new Model();

            m._errors = {a: 1};

            c.add(m);
            c.clearErrors();

            expect(m._errors).to.deep.equal({});
        })
    })

    describe('constructor', () => {
        it('should support initial model array', () => {
            let c = new Collection();
        })

        it('should support initial objects', () => {
            let c = new Collection([{a: 1}], {});
            expect(c.models[0].get('a')).to.equal(1);
        })

        it('should be okay with an empty initial model array', () => {
            let c = new Collection();
            expect(c.models).to.deep.equal([]);
        })

        it('should be okay with an undefined or null model array', () => {
            let c1 = new Collection(undefined);
            let c2 = new Collection(null);

            expect(c1.models).to.deep.equal([]);
            expect(c2.models).to.deep.equal([]);
        })

        it('should be okay with an undefined or null options object', () => {
            let c1 = new Collection([], undefined);
            let c2 = new Collection([], null);

            expect(c1._options).to.deep.equal(c1.getDefaultOptions());
            expect(c2._options).to.deep.equal(c2.getDefaultOptions());
        })

        it('should be okay with an empty options object', () => {
            let c = new Collection([], {});
            expect(c._options).to.deep.equal(c.getDefaultOptions());
        })

        it('should set attributes', () => {
            let c = new Collection([], {}, {a: 1});
            expect(c.get('a')).to.equal(1);
        })

        it('should set default attributes', () => {
            let c = new class extends Collection {
                defaults() {
                    return {
                        a: 1,
                    }
                }
            }([], {}, {b: 2});

            expect(c.get('a')).to.equal(1);
            expect(c.get('b')).to.equal(2);
        })
    })


    describe('isLastPage', () => {
        it('should return true if is paginated and on the last page', (done) => {
            let c = new class extends Collection {
                routes() { return { fetch: 'fetch/url/here' }}
            }

            moxios.withMock(() => {
                c.page(1);
                c.fetch().then(() => {
                    expect(c.isLastPage()).to.equal(true);
                    done();
                });

                moxios.wait(() => {
                    moxios.requests.mostRecent().respondWith({
                        status: 200,
                        response: [],
                    })
                })
            })

        })

        it('should return false if is paginated and not on the last page', (done) => {
            let c = new class extends Collection {
                routes() { return { fetch: 'fetch/url/here' }}
            }

            moxios.withMock(() => {
                c.page(1);
                c.fetch().then(() => {
                    expect(c.isLastPage()).to.equal(false);
                    done();
                });

                moxios.wait(() => {
                    moxios.requests.mostRecent().respondWith({
                        status: 200,
                        response: [{id: 1},{id: 2}],
                    })
                })
            })
        })
    })

    describe('isPaginated', () => {
        it('should return true if paginated', () => {
            let c = new Collection();
            c.page(1);
            expect(c.isPaginated()).to.equal(true);
        })

        it('should return false if not paginated', () => {
            let c = new Collection();
            expect(c.isPaginated()).to.equal(false);
        })
    })

    describe('paginate', () => {
        it('should support no args, to enable pagination on page 1', () => {
            let c = new Collection();
            c.page(1);
            expect(c.getPage()).to.equal(1);
            expect(c.isPaginated()).to.equal(true);

        })

        it('should support setting the current page', () => {
            let c = new Collection();
            c.page(5);
            expect(c.getPage()).to.equal(5);
            expect(c.isPaginated()).to.equal(true);
        })

        it('should support disabling with null', () => {
            let c = new Collection();
            c.page(null);
            expect(c.getPage()).to.equal(null);
            expect(c.isPaginated()).to.equal(false);
        })

        it('should support disabling with undefined', () => {
            let c = new Collection();
            c.page(undefined);
            expect(c.getPage()).to.equal(null);
            expect(c.isPaginated()).to.equal(false);
        })
    })

    describe('filter', () => {
        it('should support a callable predicate', () => {
            let c = new Collection();

            let m1 = c.add({id: 1});
            let m2 = c.add({id: 2});
            let m3 = c.add({id: 3});

            let f = c.filter((model) => { return model.id & 1});

            expect(f.models).to.deep.equal([m1, m3]);
        })

        it('should support an object predicate', () => {
            let c = new Collection();

            let m1 = c.add({id: 1});
            let m2 = c.add({id: 2});
            let m3 = c.add({id: 3});

            let f = c.filter({id: 2});

            expect(f.models).to.deep.equal([m2]);
        })

        it('should support a column predicate', () => {
            let c = new Collection();

            let m1 = c.add({value:  0});
            let m2 = c.add({value: 10});
            let m3 = c.add({value: 20});

            let f = c.filter('value');

            expect(f.models).to.deep.equal([m2, m3]);
        })
    })

    describe('find', () => {
        it('should support a callable predicate', () => {
            let c = new Collection();

            let m1 = c.add({id: 1});
            let m2 = c.add({id: 2});
            let m3 = c.add({id: 3});

            let f = c.find((model) => { return model.id === 2});

            expect(f).to.equal(m2);
        })

        it('should support an object predicate', () => {
            let c = new Collection();

            let m1 = c.add({id: 1});
            let m2 = c.add({id: 2});
            let m3 = c.add({id: 3});

            let f = c.find({id: 2});

            expect(f).to.equal(m2);
        })

        it('should support a column predicate', () => {
            let c = new Collection();

            let m1 = c.add({value:  0});
            let m2 = c.add({value:  0});
            let m3 = c.add({value: 10});

            let f = c.find('value');

            expect(f).to.equal(m3);
        })
    })

    describe('first', () => {
        it('should return the first model', () => {
            let c = new Collection();

            let m1 = c.add({id: 1});
            let m2 = c.add({id: 2});
            let m3 = c.add({id: 3});

            expect(c.first()).to.equal(m1);
        })

        it('should return undefined when the collection is empty', () => {
            let c = new Collection();
            expect(c.first()).to.be.undefined;
        })
    })

    describe('last', () => {
        it('should return the last model', () => {
            let c = new Collection();

            let m1 = c.add({id: 1});
            let m2 = c.add({id: 2});
            let m3 = c.add({id: 3});

            expect(c.last()).to.equal(m3);
        })

        it('should return undefined when the collection is empty', () => {
            let c = new Collection();
            expect(c.last()).to.be.undefined;
        })
    })

    describe('length', () => {
        it('should return the number of models in the collection', () => {
            let c = new Collection();
            expect(c.length).to.equal(0);

            c.add({a: 1});
            expect(c.length).to.equal(1);

            c.pop();
            expect(c.length).to.equal(0);
        })
    })

    describe('map', () => {
        it('should return an array using the results of a function', () => {
            let c = new Collection();

            let m1 = c.add({id: 1});
            let m2 = c.add({id: 2});
            let m3 = c.add({id: 3});

            expect(c.map((model) => { return model.id })).to.deep.equal([1, 2, 3]);
        })

        it('should return an array using the results of a column', () => {
            let c = new Collection();

            let m1 = c.add({id: 1});
            let m2 = c.add({id: 2});
            let m3 = c.add({id: 3});

            expect(c.map('id')).to.deep.equal([1, 2, 3]);
        })
    })

    describe('has', () => {
        it('should return true when given a model instance that is in the collection', () => {
            let c = new Collection();
            let a = c.add({a: 1, b: 2});
            let x = c.add({x: 5, y: 6});

            expect(c.has(a)).to.be.true;
            expect(c.has(x)).to.be.true;
        })

        it('should return true when given an object that matches model attributes', () => {
            let c = new Collection();
            let a = c.add({a: 1, b: 2});
            let x = c.add({x: 5, y: 6});

            expect(c.has({a: 1, b: 2})).to.be.true;
            expect(c.has({x: 5, y: 6})).to.be.true;
        })

        it('should return true when a partial object match is found', () => {
            let c = new Collection();
            let a = c.add({a: 1, b: 2});
            let x = c.add({x: 5, y: 6});

            expect(c.has({a: 1})).to.be.true;
            expect(c.has({x: 5})).to.be.true;
        })

        it('should return false when given a model instance that is not in the collection', () => {
            let c = new Collection();
            let a = new Model({a: 1, b: 2});
            let x = new Model({x: 5, y: 6});

            c.add(a);

            expect(c.has(a)).to.be.true;
            expect(c.has(x)).to.be.false;
        })

        it('should return false when given an object that does not match model attributes', () => {
            let c = new Collection();
            let a = c.add({a: 1, b: 2});
            let x = c.add({x: 5, y: 6});

            expect(c.has({a: 2, b: 3})).to.be.false;
            expect(c.has({x: 6, y: 7})).to.be.false;
        })

        it('should return false when a partial object match was not found', () => {
            let c = new Collection();
            let a = c.add({a: 1, b: 2});
            let x = c.add({x: 5, y: 6});

            expect(c.has({a: 8})).to.be.false;
            expect(c.has({x: 9})).to.be.false;
        })
    })

    describe('indexOf', () => {
        it('should return the first index of a model', () => {
            let c = new Collection();

            let m1 = c.add({id: 1});
            let m2 = c.add({id: 2});
            let m3 = c.add({id: 3});

            expect(c.indexOf(m1)).to.equal(0);
            expect(c.indexOf(m2)).to.equal(1);
            expect(c.indexOf(m3)).to.equal(2);
        })

        it('should return the first index of an object matching a model', () => {
            let c = new Collection();

            let m1 = c.add({id: 1});
            let m2 = c.add({id: 2});
            let m3 = c.add({id: 3});

            expect(c.indexOf({id: 2})).to.equal(1);
        })

        it('should return -1 when the model cant be found', () => {
            let c = new Collection();

            let m1 = c.add({id: 1});
            let m2 = c.add({id: 2});
            let m3 = c.add({id: 3});

            expect(c.indexOf({id: 5})).to.equal(-1);
        })
    })

    describe('isEmpty', () => {
        it('should return true when empty', () => {
            let c = new Collection();
            expect(c.isEmpty()).to.equal(true);
        })

        it('should return false when not empty', () => {
            let c = new Collection([{a: 1}]);
            expect(c.isEmpty()).to.equal(false);
        })
    })

    describe('pop', () => {
        it('should remove and return the last model', () => {
            let c = new Collection();

            let m1 = c.add({id: 1});
            let m2 = c.add({id: 2});
            let m3 = c.add({id: 3});

            expect(c.pop()).to.equal(m3);
            expect(c.pop()).to.equal(m2);
            expect(c.pop()).to.equal(m1);
        })

        it('should do nothing and return undefined if empty', () => {
            let c = new Collection();
            expect(c.pop()).to.be.undefined;
        })

        it('should emit "remove" the collection with the model context', (done) => {
            let c = new Collection();
            let m = c.add({id: 1});

            c.on('remove', (e) => {
                expect(e.model).to.equal(m);
                done();
            });

            c.pop();
        })

        it('should unregister the collection from the model', () => {
            let c = new Collection();
            let m = c.add({id: 1});

            expect(m.collections.length).to.equal(1);
            c.pop();
            expect(m.collections.length).to.equal(0);
        })
    })

    describe('reduce', () => {
        it('should reduce all values to a single result', () => {
            let c = new Collection();

            let m1 = c.add({id: 1});
            let m2 = c.add({id: 2});
            let m3 = c.add({id: 3});

            let r = c.reduce((result, model, collection) => {
                return result + model.id;

            }, 4);

            expect(r).to.equal(10);
        })

        it('should receive args (result, model, index)', (done) => {
            let c = new Collection();

            let m1 = c.add({id: 1});
            let m2 = c.add({id: 2});
            let m3 = c.add({id: 3});

            let i = 0;

            c.reduce((result, model, index) => {
                expect(result).to.equal(4);
                expect(model).to.equal(m1);
                expect(index).to.equal(i++);
                done();

            }, 4);
        })

        it('should use the first model as initial if initial not provided', (done) => {
            let c = new Collection();

            let m1 = c.add({id: 1});
            let m2 = c.add({id: 2});
            let m3 = c.add({id: 3});

            let r = c.reduce((result, model, collection) => {
                expect(result).to.equal(m1);
                done();
            });
        })

        it('should use a provided undefined initial', () => {
            let c = new Collection();

            let m1 = c.add({id: 1});
            let m2 = c.add({id: 2});
            let m3 = c.add({id: 3});

            let r = c.reduce((result, model, collection) => {
                return (result || 0) + model.id;
            }, undefined);

            expect(r).to.equal(6);
        })
    })

    describe('remove', () => {
        it('should remove a given model', () => {
            let c = new Collection();
            let m = c.add({id: 1});
            c.remove(m);
            expect(c.models).to.be.empty;
        })

        it('should fail if model is null', (done) => {
            let c = new Collection();
            try {
                c.remove(null);
            } catch (e) {
                expect(e.message).to.equal('Expected function, object, array, or model to remove');
                done()
            }
        })

        it('should fail if model is undefined', (done) => {
            let c = new Collection();
            try {
                c.remove(undefined);
            } catch (e) {
                expect(e.message).to.equal('Expected function, object, array, or model to remove');
                done()
            }
        })

        it('should fail if model is false', (done) => {
            let c = new Collection();
            try {
                c.remove(false);
            } catch (e) {
                expect(e.message).to.equal('Expected function, object, array, or model to remove');
                done()
            }
        })

        it('should support removing by predicate', () => {
            let c = new Collection();
            let m1 = c.add({id: 1})
            let m2 = c.add({id: 2})
            let m3 = c.add({id: 3})

            c.remove((model) => { return model.id & 1});
            expect(c.models).to.deep.equal([m2]);
        })

        it('should support removing by exact plain object attribute match', () => {
            let c = new Collection();
            let m1 = c.add({id: 1})
            let m2 = c.add({id: 2})
            let m3 = c.add({id: 3})

            c.remove({id: 2});
            expect(c.models).to.deep.equal([m1, m3]);
        })

        it('should support removing by partial plain object attribute match', () => {
            let c = new Collection();
            let m1 = c.add({id: 1, name: 'One'})
            let m2 = c.add({id: 2, name: 'Two'})
            let m3 = c.add({id: 3, name: 'Three'})

            c.remove({id: 2});
            expect(c.models).to.deep.equal([m1, m3]);
        })

        it('should support removing an array of multiple objects', () => {
            let c = new Collection();
            let m1 = c.add({id: 1, name: 'One'})
            let m2 = c.add({id: 2, name: 'Two'})
            let m3 = c.add({id: 3, name: 'Three'})

            c.remove([{id: 2}, {id: 3}]);
            expect(c.models).to.deep.equal([m1]);
        })

        it('should support removing an array of models', () => {
            let c = new Collection();
            let m1 = c.add({id: 1, name: 'One'})
            let m2 = c.add({id: 2, name: 'Two'})
            let m3 = c.add({id: 3, name: 'Three'})

            c.remove([m1, m2]);
            expect(c.models).to.deep.equal([m3]);
        })

        it('should fail if given model does not have a unique ID', (done) => {
            let c = new Collection();
            try {
                c.remove(new Error());
            } catch (e) {
                expect(e.message).to.equal('Model to remove is not a valid model');
                done()
            }
        })

        it('should skip remove if the collection does not contain the model', () => {
            let c = new Collection();
            let m1 = c.add({id: 1});
            let m2 = c.add({id: 2});
            let m3 = new Model({id: 3});

            c.remove(m3);
            expect(c.models).to.deep.equal([m1, m2]);
        })

        it('should unregister the collection from the model on remove', () => {
            let c = new Collection();
            let m = c.add({id: 1});
            c.remove(m);
            expect(m.collections).to.be.empty;
        })

        it('should emit "remove" on the collection for a single model', (done) => {
            let c = new Collection();
            let m = c.add({id: 1});

            c.on('remove', (e) => {
                expect(e.model).to.equal(m);
                done();
            })

            c.remove(m);
        })

        it('should emit "remove" on the collection for all models removed', () => {
            let c = new Collection();
            let m1 = c.add({id: 1, removed: false});
            let m2 = c.add({id: 2, removed: false});
            let m3 = c.add({id: 3, removed: false});

            c.on('remove', (e) => {
                e.model.removed = true;
            })

            c.remove([m1, m2, m3]);

            expect(m1.removed).to.equal(true);
            expect(m2.removed).to.equal(true);
            expect(m3.removed).to.equal(true);
        })

        it('should return all models removed', () => {
            let c = new Collection();
            let m1 = c.add({id: 1});
            let m2 = c.add({id: 2});
            let m3 = c.add({id: 3});

            let removed = c.remove([m1, m2, m3]);

            expect(removed).to.deep.equal([m1, m2, m3]);
        })

        it('should return a single model when removing only one', () => {
            let c = new Collection();
            let m1 = c.add({id: 1});
            let m2 = c.add({id: 2});
            let m3 = c.add({id: 3});

            let removed = c.remove(m1);

            expect(removed).to.equal(m1);
        })

        it('should return an array of models when removing by predicate', () => {
            let c = new Collection();
            let m1 = c.add({id: 1});
            let m2 = c.add({id: 2});
            let m3 = c.add({id: 3});

            let removed = c.remove((model) => { return model.id === 1});

            expect(removed).to.deep.equal([m1]);
        })

        it('should return an array of models when removing by object', () => {
            let c = new Collection();
            let m1 = c.add({id: 1});
            let m2 = c.add({id: 2});
            let m3 = c.add({id: 3});

            let removed = c.remove({id: 1});

            expect(removed).to.deep.equal([m1]);
        })

        it('should only return models that were removed', () => {
            let c = new Collection();
            let m1 = c.add({id: 1});
            let m2 = new Model({id: 2}); // Don't add to the collection
            let m3 = c.add({id: 3});

            let removed = c.remove([m1, m2, m3]);

            expect(removed).to.deep.equal([m1, m3]);
        })
    })

    describe('replace', () => {
        it('should replace all current models with the new ones', () => {
            let c = new Collection();
            let a = [new Model({id: 1}), new Model({id: 2})];

            c.add({id: 3});
            c.replace(a);

            expect(c.models).to.deep.equal(a);
        })

        it('should effectively remove all if replacing with empty array', () => {
            let c = new Collection();
            c.add({id: 1});
            c.add({id: 2});
            c.add({id: 3});
            c.replace([]);

            expect(c.models).to.be.empty;
        })

        it('should effectively remove all if replacing with empty object', () => {
            let c = new Collection();
            c.add({id: 1});
            c.add({id: 2});
            c.add({id: 3});
            c.replace({});

            expect(c.models).to.be.empty;
        })

        it('should effectively remove all if replacing with null', () => {
            let c = new Collection();
            c.add({id: 1});
            c.add({id: 2});
            c.add({id: 3});
            c.replace(null);

            expect(c.models).to.be.empty;
        })

        it('should effectively remove all if replacing with undefined', () => {
            let c = new Collection();
            c.add({id: 1});
            c.add({id: 2});
            c.add({id: 3});
            c.replace(undefined);

            expect(c.models).to.be.empty;
        })

        it('should support replacing with plain objects', () => {
            let c = new Collection();

            c.add({id: 1});
            c.replace([{a: 1}, {b: 2}]);

            expect(c.models[0].attributes).to.deep.equal({a: 1});
            expect(c.models[1].attributes).to.deep.equal({b: 2});
        })

        it('should fail when passing a non-empty non-array replacement', (done) => {
            let c = new Collection();

            c.add({id: 1});

            try {
                c.replace({a: 1});
            } catch (e) {
                expect(e.message).to.equal('Expected a model, plain object, or array of either');
                done();
            }
        })
    })

    describe('reset', () => {
        it('should reset all models in the collection', () => {
            let c = new Collection();
            let m1 = c.add({id: 1});
            let m2 = c.add({id: 2});

            m1.id = 5;
            m2.id = 6;

            let resets = 0;
            m1.on('reset', () => { resets++; })
            m2.on('reset', () => { resets++; })

            c.reset();

            expect(resets).to.equal(2);

            expect(m1.id).to.equal(1);
            expect(m2.id).to.equal(2);
        })

        it('should do nothing when the collection is empty', () => {
            let c = new Collection();
            c.reset();
        })
    })

    describe('shift', () => {
        it('should remove and return the first model', () => {
            let c = new Collection();

            let m1 = c.add({id: 1});
            let m2 = c.add({id: 2});
            let m3 = c.add({id: 3});

            expect(c.shift()).to.equal(m1);
            expect(c.shift()).to.equal(m2);
            expect(c.shift()).to.equal(m3);
        })

        it('should do nothing and return undefined if empty', () => {
            let c = new Collection();
            expect(c.shift()).to.be.undefined;
        })

        it('should emit "remove" the collection with the model context', (done) => {
            let c = new Collection();
            let m = c.add({id: 1});

            c.on('remove', (e) => {
                expect(e.model).to.equal(m);
                done();
            });

            c.shift();
        })

        it('should unregister the collection from the model', () => {
            let c = new Collection();
            let m = c.add({id: 1});

            expect(m.collections.length).to.equal(1);
            c.shift();
            expect(m.collections.length).to.equal(0);
        })
    })

    describe('size', () => {
        it('should return the number of models in the collection', () => {
            let c = new Collection();
            expect(c.size()).to.equal(0);

            c.add({a: 1});
            expect(c.size()).to.equal(1);

            c.pop();
            expect(c.size()).to.equal(0);
        })
    })

    describe('sort', () => {
        it('should sort the models in the collection using a callback', () => {
            let c = new Collection();
            let m1 = c.add({id: 1, value: 300});
            let m2 = c.add({id: 2, value: 100});
            let m3 = c.add({id: 3, value: 200});

            c.sort((model) => {
                return model.value;
            });

            expect(c.models).to.deep.equal([m2, m3, m1]);
        })

        it('should sort the models in the collection using a column comparator', () => {
            let c = new Collection();
            let m1 = c.add({id: 1, value: 300});
            let m2 = c.add({id: 2, value: 100});
            let m3 = c.add({id: 3, value: 200});

            c.sort('value');
            expect(c.models).to.deep.equal([m2, m3, m1]);
        })
    })

    describe('sum', () => {
        it('should sum all models based on a column name', () => {
            let c = new Collection();
            c.add({value: 150});
            c.add({value: 250});
            c.add({value: 350});

            expect(c.sum('value')).to.equal(750);
        })

        it('should sum all models even if column does not exist', () => {
            let c = new Collection();
            c.add({value: 150});
            c.add({x    : 250});
            c.add({y    : 350});

            expect(c.sum('x')).to.equal(250);
        })

        it('should sum all models based on a callback', () => {
            let c = new Collection();
            c.add({value: 150});
            c.add({value: 250});
            c.add({value: 350});

            let sum = c.sum((model) => { return model.value * 2});

            expect(sum).to.equal(1500);
        })

        it('should return 0 if the collection is empty', () => {
            let c = new Collection();
            expect(c.sum('value')).to.equal(0);
        })

        it('should return 0 if called without a callback', () => {
            expect((new Collection()).sum()).to.equal(0);
        })
    })

    describe('count', () => {
        it ('should count by key', () => {
            let c = new Collection([{a: 'X'}, {a: 'X'}, {a: 'Y'}]);
            expect(c.count('a')).to.deep.equal({'X': 2, 'Y': 1});
        })

        it ('should count using a callback', () => {
            let c = new Collection([{a: 'X'}, {a: 'X'}, {a: 'Y'}]);
            expect(c.count((m) => m.a)).to.deep.equal({'X': 2, 'Y': 1});
        })
    })

    describe('each', () => {
        it ('should iterate through each model', () => {
            let c = new Collection([{a: 'X'}, {a: 'X'}, {a: 'Y'}]);

            let collected = [];
            let position  = 0;

            c.each((model, index) => {
                expect(index).to.equal(position++);
                collected.push(model);
            });

            expect(collected).to.deep.equal(c.models);
        })
    })

    describe('sync', () => {
        it('should reset all models in the collection', () => {
            let c = new Collection();
            let m1 = c.add({id: 1});
            let m2 = c.add({id: 2});

            m1.id = 5;
            m2.id = 6;

            let emits = 0;
            m1.on('sync', () => { emits++; })
            m2.on('sync', () => { emits++; })

            c.sync();

            expect(emits).to.equal(2);

            expect(m1.id).to.equal(5);
            expect(m2.id).to.equal(6);

            expect(m1.$.id).to.equal(5);
            expect(m2.$.id).to.equal(6);
        })

        it('should do nothing when the collection is empty', () => {
            let c = new Collection();
            c.sync();
        })
    })

    describe('toJSON', () => {
        it('should return the toJSON of all the models', () => {
            let c = new Collection();
            let m1 = c.add({id: 1});
            let m2 = c.add({id: 2});

            expect(JSON.stringify(c)).to.equal('[{"id":1},{"id":2}]');
        })

        it('should honour model override', () => {
            let c = new Collection();
            let m = new class extends Model {
                toJSON() {
                    return {a: 1}
                }
            }

            c.add(m);
            expect(JSON.stringify(c)).to.equal('[{"a":1}]');
        })

        it('should honour collection override', () => {
            let c = new class extends Collection {
                toJSON() {
                    return [{a: 1}]
                }
            }

            expect(JSON.stringify(c)).to.deep.equal('[{"a":1}]');
        })
    })

    describe('delete', () => {
        it('should handle successful delete with empty return', (done) => {
            let c = new class extends Collection {
                routes() { return {delete: '/delete' }}
            }

            c.add(new Model({id: 1}));
            c.add(new Model({id: 2}));

            moxios.withMock(() => {
                c.delete().then((response) => {
                    done();
                });

                moxios.wait(() => {
                    moxios.requests.mostRecent().respondWith({
                        status: 200
                    })
                })
            })
        })

        it('should use body if "useDeleteBody" option is set', (done) => {
            let c = new class extends Collection {
                routes() { return {delete: '/delete'}}
            }

            c.setOption('useDeleteBody', true);

            c.add(new Model({id: 1}));
            c.add(new Model({id: 2}));

            moxios.withMock(() => {
                c.delete()

                moxios.wait(() => {
                    let request = moxios.requests.mostRecent();

                    expect(request.config.params).to.be.empty;
                    expect(request.config.data).to.equal('[1,2]');
                    done();
                })
            })
        })

        it('should skip if already deleting', () => {
            let c = new class extends Collection {
                routes() { return {delete: '/delete'}}
            }

            c.add(new Model({id: 1}));
            c.add(new Model({id: 2}));

            c.deleting = true;
            expect(c.deleting).to.equal(true);

            c.on('delete', () => {
                throw 'Did not expect to handle event'
            });

            c.delete().then((response) => {
                expect(response).to.be.null;
                done();
            });
        })

        it('should skip if there are no models to delete', (done) => {
            let c = new class extends Collection {
                routes() { return {delete: '/delete'}}
            }

            c.delete().then((response) => {
                expect(response).to.be.null;
                done();
            })
        })

        it('should skip if there are no effective models to delete', (done) => {
            let c = new class extends Collection {
                routes() { return {delete: '/delete'}}
            }

            let m1 = c.add({a: 1});
            let m2 = c.add({a: 2});
            let m3 = c.add({a: 3});

            m1.deleting = true;
            m2.deleting = true;
            m3.deleting = true;

            c.delete().then((response) => {
                expect(response).to.be.null;
                done();
            })
        })

        it('should emit event on success', (done) => {
            let c = new class extends Collection {
                routes() { return {delete: '/delete'}}
            }

            c.add(new Model({id: 1}));
            c.add(new Model({id: 2}));

            c.on('delete', (event) => {
                expect(event.error).to.be.null;
                done();
            });

            moxios.withMock(() => {
                c.delete();

                moxios.wait(() => {
                    moxios.requests.mostRecent().respondWith({
                        status: 200
                    })
                })
            })
        })

        it('should emit event on failure', (done) => {
            let c = new class extends Collection {
                routes() { return {delete: '/delete'}}
            }

            c.add(new Model({id: 1}));
            c.add(new Model({id: 2}));

            c.on('delete', (event) => {
                expect(event.error).to.not.be.null;
                done();
            });

            moxios.withMock(() => {
                c.delete().catch(() => {});

                moxios.wait(() => {
                    moxios.requests.mostRecent().respondWith({
                        status: 500
                    })
                })
            })
        })

        it('should use delete route override', (done) => {
            let c = new class extends Collection {
                getDeleteRoute() { return '/override/delete/route'; }
            }

            c.add(new Model({id: 1}));
            c.add(new Model({id: 2}));

            c.setOption('useDeleteBody', false);

            moxios.withMock(() => {
                c.delete();

                moxios.wait(() => {
                    let request = moxios.requests.mostRecent();
                    expect(request.url).to.equal('/override/delete/route?id=1,2');
                    done();
                })
            })
        })

        it('should use delete headers override', (done) => {
            let c = new class extends Collection {
                routes() { return {delete: '/delete'}}
                getDeleteHeaders() { return {test: 'yes'} }
            }

            c.add(new Model({id: 1}));
            c.add(new Model({id: 2}));

            moxios.withMock(() => {
                c.delete();

                moxios.wait(() => {
                    let request = moxios.requests.mostRecent();
                    expect(request.headers.test).to.equal('yes');
                    done();
                })
            })
        })

        it('should use default headers override', (done) => {
            let c = new class extends Collection {
                routes() { return {delete: '/delete'}}
                getDefaultHeaders() { return {test: 'yes'} }
            }

            c.add(new Model({id: 1}));
            c.add(new Model({id: 2}));

            moxios.withMock(() => {
                c.delete();

                moxios.wait(() => {
                    let request = moxios.requests.mostRecent();
                    expect(request.headers.test).to.equal('yes');
                    done();
                })
            })
        })

        it('should use default headers with delete headers override', (done) => {
            let c = new class extends Collection {
                routes() { return {delete: '/delete'}}
                getDefaultHeaders() { return {test: 'yes'} }
                getDeleteHeaders() { return {test: 'no'} }
            }

            c.add(new Model({id: 1}));
            c.add(new Model({id: 2}));

            moxios.withMock(() => {
                c.delete();

                moxios.wait(() => {
                    let request = moxios.requests.mostRecent();
                    expect(request.headers.test).to.equal('no');
                    done();
                })
            })
        })

        it('should use delete method override', (done) => {
            let c = new class extends Collection {
                routes() { return {delete: '/delete'}}
                getDeleteMethod() { return 'PATCH' }
            }

            c.add(new Model({id: 1}));
            c.add(new Model({id: 2}));

            moxios.withMock(() => {
                c.delete();

                moxios.wait(() => {
                    let request = moxios.requests.mostRecent();
                    expect(request.config.method).to.equal('patch');
                    done();
                })
            })
        })

        it('should use delete query parameters override', (done) => {
            let c = new class extends Collection {
                routes()   { return {delete: '/delete'}}
                getDeleteQuery() { return {a: 1} }
            }

            c.add(new Model({id: 1}));
            c.add(new Model({id: 2}));

            moxios.withMock(() => {
                c.delete();

                moxios.wait(() => {
                    let request = moxios.requests.mostRecent();
                    expect(request.url).to.equal('/delete?a=1');
                    done();
                })
            })
        })

        it('should be fatal on fatal error', (done) => {
            let c = new class extends Collection {
                routes() { return {delete: '/delete'}}
            }

            c.add(new Model({id: 1}));
            c.add(new Model({id: 2}));

            moxios.withMock(() => {
                expect(c.fatal).to.equal(false);
                c.delete().catch((error) => {
                    expect(c.fatal).to.equal(true);
                    done();
                })

                moxios.wait(() => {
                    moxios.requests.mostRecent().respondWith({
                        status: 500
                    })
                })
            })
        })

        it('should be non-fatal on success', (done) => {
            let c = new class extends Collection {
                routes() { return {delete: '/delete'}}
            }

            c.add(new Model({id: 1}));
            c.add(new Model({id: 2}));

            moxios.withMock(() => {
                expect(c.fatal).to.equal(false);
                c.delete().then((response) => {
                    expect(c.fatal).to.equal(false);
                    done();
                })

                moxios.wait(() => {
                    moxios.requests.mostRecent().respondWith({
                        status: 200
                    })
                })
            })
        })

        it('should set deleting to true on delete', (done) => {
            let c = new class extends Collection {
                routes() { return {delete: '/delete'}}
            }

            c.add(new Model({id: 1}));
            c.add(new Model({id: 2}));

            moxios.withMock(() => {
                expect(c.deleting).to.equal(false);

                c.delete().then((response) => {
                    expect(c.deleting).to.equal(false);
                    done();
                })

                expect(c.deleting).to.equal(true);

                moxios.wait(() => {
                    moxios.requests.mostRecent().respondWith({
                        status: 200
                    })
                })
            })
        })

        it('should set deleting to false on delete success', (done) => {
            let c = new class extends Collection {
                routes() { return {delete: '/delete'}}
            }

            c.add(new Model({id: 1}));
            c.add(new Model({id: 2}));

            moxios.withMock(() => {
                expect(c.deleting).to.equal(false);
                c.delete().then((response) => {
                    expect(c.deleting).to.equal(false);
                    done();
                })

                expect(c.deleting).to.equal(true);

                moxios.wait(() => {
                    moxios.requests.mostRecent().respondWith({
                        status: 200
                    })
                })
            })
        })

        it('should set deleting to false on delete failure', (done) => {
            let c = new class extends Collection {
                routes() { return {delete: '/delete'}}
            }

            c.add(new Model({id: 1}));
            c.add(new Model({id: 2}));

            moxios.withMock(() => {
                expect(c.deleting).to.equal(false);
                c.delete().catch((error) => {
                    expect(c.deleting).to.equal(false);
                    done();
                })

                expect(c.deleting).to.equal(true);

                moxios.wait(() => {
                    moxios.requests.mostRecent().respondWith({
                        status: 500
                    })
                })
            })
        })

        it('should remove all models on delete', (done) => {
            let c = new class extends Collection {
                routes() { return {delete: '/delete'}}
            }

            let m1 = new Model();
            let m2 = new Model();

            c.add(m1);
            c.add(m2);

            let removed = 0;

            c.on('remove', (e) => {
                removed++;
            })

            moxios.withMock(() => {
                expect(c.models).to.not.be.empty;

                c.delete().then((response) => {
                    expect(c.models).to.be.empty;
                    expect(removed).to.equal(2);

                    expect(m1.collections).to.be.empty;
                    expect(m2.collections).to.be.empty;

                    done();
                });

                moxios.wait(() => {
                    moxios.requests.mostRecent().respondWith({
                        status: 200
                    });
                })
            })
        })
    })

    describe('save', () => {
        it('should not save when already saving', () => {
            let c = new class extends Collection {
                routes() { return {save: '/save'}}
            }

            c.add({a: 1});
            c.add({a: 2});

            c.saving = true;
            c.save().then((response) => {
                expect(response).to.be.null;
                done();
            });
        })

        it('should fail if a model fails validation', (done) => {
            let c = new class extends Collection {
                routes() { return {save: '/save'}}
            }

            let m = new class extends Model {
                validation() {
                    return {
                        email: email,
                    }
                }

                defaults() {
                    return {
                        email: "email@domain.com",
                    }
                }
            }

            c.add(m);
            m.email = 5;

            c.save().catch((error) => {
                done();
            });
        })

        it('should fail if a model throws an exception in `onSave`', (done) => {
            let c = new class extends Collection {
                routes() { return {save: '/save'}}
            }

            let m = new class extends Model {
                onSave() {
                    throw new Error('Not for saving!')
                }
            }

            c.add(m);

            c.save().catch((error) => {
                done();
            });
        })

        it('should set saving to true on save', (done) => {
            let c = new class extends Collection {
                routes() { return {save: '/save'}}
            }

            let m1 = c.add({a: 1});
            let m2 = c.add({a: 2});

            moxios.withMock(() => {
                c.save();
                expect(c.saving).to.equal(true);
                done();
            })
        })

        it('should sync all models if the response is empty', (done) => {
            let c = new class extends Collection {
                routes() { return {save: '/save'}}
            }

            let m1 = c.add({a: 1});
            let m2 = c.add({a: 2});

            m1.a = 10;
            m2.a = 20;

            moxios.withMock(() => {
                c.save().then((response) => {
                    expect(m1.a).to.equal(10);
                    expect(m1.$.a).to.equal(10);

                    expect(m2.a).to.equal(20);
                    expect(m2.$.a).to.equal(20);

                    done();
                });

                moxios.wait(() => {
                    moxios.requests.mostRecent().respondWith({
                        status: 200,
                    });
                })
            })
        })

        it('should sync all models if the response is an empty string', (done) => {
            let c = new class extends Collection {
                routes() { return {save: '/save'}}
            }

            let m1 = c.add({a: 1});
            let m2 = c.add({a: 2});

            m1.a = 10;
            m2.a = 20;

            moxios.withMock(() => {
                c.save().then((response) => {
                    expect(m1.a).to.equal(10);
                    expect(m1.$.a).to.equal(10);

                    expect(m2.a).to.equal(20);
                    expect(m2.$.a).to.equal(20);

                    done();
                });

                moxios.wait(() => {
                    moxios.requests.mostRecent().respondWith({
                        status: 200,
                        response: '',
                    });
                })
            })
        })

        it('should fail when saving models but received an empty array', (done) => {
            let c = new class extends Collection {
                routes() { return {save: '/save'}}
            }

            let m1 = c.add({a: 1});
            let m2 = c.add({a: 2});

            moxios.withMock(() => {
                c.save().catch((error) => {
                    expect(error.message).to.equal('Expected the same number of models in the response');
                    done();
                });

                moxios.wait(() => {
                    moxios.requests.mostRecent().respondWith({
                        status: 200,
                        response: [],
                    });
                })
            })
        })

        it('should fail if response data is not resolved to an array', (done) => {
            let c = new class extends Collection {
                routes() { return {save: '/save'}}
            }

            let m1 = c.add({a: 1});
            let m2 = c.add({a: 2});

            moxios.withMock(() => {
                c.save().catch((error) => {
                    expect(error.message).to.equal('Response data must be an array or empty');
                    done();
                });

                moxios.wait(() => {
                    moxios.requests.mostRecent().respondWith({
                        status: 200,
                        response: '5',
                    });
                })
            })
        })

        it('should fail if the number of models returned does not match what was sent', (done) => {
            let c = new class extends Collection {
                routes() { return {save: '/save'}}
            }

            let m1 = c.add({a: 1});
            let m2 = c.add({a: 2});

            moxios.withMock(() => {
                c.save().catch((error) => {
                    expect(error.message).to.equal('Expected the same number of models in the response');
                    done();
                });

                moxios.wait(() => {
                    moxios.requests.mostRecent().respondWith({
                        status: 200,
                        response: [
                            {a: 1},
                            {a: 2},
                            {a: 3}, // This is an extra one
                        ],
                    });
                })
            })
        })

        it('should update all models with attribute data returned in the response', (done) => {
            let c = new class extends Collection {
                routes() { return {save: '/save'}}
            }

            let m1 = c.add({a: 1});
            let m2 = c.add({a: 2});

            moxios.withMock(() => {
                c.save().then((response) => {
                    expect(m1.a).to.equal(10);
                    expect(m1.id).to.equal(1);

                    expect(m1.$.a).to.equal(10);
                    expect(m1.$.id).to.equal(1);

                    expect(m2.a).to.equal(20);
                    expect(m2.id).to.equal(2);

                    expect(m2.$.a).to.equal(20);
                    expect(m2.$.id).to.equal(2);

                    done();
                });

                moxios.wait(() => {
                    moxios.requests.mostRecent().respondWith({
                        status: 200,
                        response: [
                            {id: 1, a: 10},
                            {id: 2, a: 20},
                        ],
                    });
                })
            })
        })

        it('should update all models with identifiers returned in the response', (done) => {
            let c = new class extends Collection {
                routes() { return {save: '/save'}}
            }

            let m1 = c.add({a: 1});
            let m2 = c.add({a: 2});

            moxios.withMock(() => {
                c.save().then((response) => {
                    expect(m1.id).to.equal(1);
                    expect(m1.$.id).to.equal(1);
                    expect(m2.id).to.equal(2);
                    expect(m2.$.id).to.equal(2);

                    done();
                });

                moxios.wait(() => {
                    moxios.requests.mostRecent().respondWith({
                        status: 200,
                        response: [
                            1, 2
                        ],
                    });
                })
            })
        })

        it('should not allow overwrite of identifier if option is not set', (done) => {
            let c = new class extends Collection {
                routes() { return {save: '/save'}}
            }

            let m1 = c.add({a: 1, id: 1});
            let m2 = c.add({a: 2, id: 2});

            moxios.withMock(() => {
                c.save().catch((error) => {
                    expect(error.message).to.equal('Not allowed to overwrite model identifier');
                    done();
                });

                moxios.wait(() => {
                    moxios.requests.mostRecent().respondWith({
                        status: 200,
                        response: [
                            4, 5
                        ],
                    });
                })
            })
        })

        it('should clear errors on success', (done) => {
            let c = new class extends Collection {
                routes() { return {save: '/save'}}
            }

            let m1 = c.add({a: 1, id: null});
            let m2 = c.add({a: 2, id: null});

            m1._errors = {a: 'bad!'};

            moxios.withMock(() => {
                c.save().then((response) => {
                    expect(m1.errors).to.be.empty;
                    done();
                });

                moxios.wait(() => {
                    moxios.requests.mostRecent().respondWith({
                        status: 200,
                        response: [
                            1, 2
                        ],
                    });
                })
            })
        })

        it('should set saving to false on success', (done) => {
            let c = new class extends Collection {
                routes() { return {save: '/save'}}
            }

            let m1 = c.add({a: 1});
            let m2 = c.add({a: 2});

            moxios.withMock(() => {
                c.save().then((response) => {
                    expect(c.saving).to.equal(false);
                    done();
                });

                moxios.wait(() => {
                    moxios.requests.mostRecent().respondWith({
                        status: 200
                    });
                })
            })
        })

        it('should set fatal to false on success', (done) => {
            let c = new class extends Collection {
                routes() { return {save: '/save'}}
            }

            let m1 = c.add({a: 1});
            let m2 = c.add({a: 2});

            moxios.withMock(() => {
                c.fatal = true;

                c.save().then((response) => {
                    expect(c.fatal).to.equal(false);
                    done();
                });

                moxios.wait(() => {
                    moxios.requests.mostRecent().respondWith({
                        status: 200
                    });
                })
            })
        })

        it('should emit save on all models that were saved', (done) => {
            let c = new class extends Collection {
                routes() { return {save: '/save'}}
            }

            let m1 = c.add({a: 1, flag: false});
            let m2 = c.add({a: 2, flag: false});

            m1.on('save', (e) => { e.target.flag = true; });
            m2.on('save', (e) => { e.target.flag = true; });

            moxios.withMock(() => {
                c.save().then((response) => {
                    expect(m1.flag).to.equal(true);
                    expect(m2.flag).to.equal(true);
                    done();
                });

                moxios.wait(() => {
                    moxios.requests.mostRecent().respondWith({
                        status: 200,
                        response: [
                            {id: 1, a: 10},
                            {id: 2, a: 20}
                        ],
                    });
                })
            })
        })

        it('should emit save event on success', (done) => {
            let c = new class extends Collection {
                routes() { return {save: '/save'}}
            }

            let m1 = c.add({a: 1});
            let m2 = c.add({a: 2});

            c.on('save', () => { done(); });

            moxios.withMock(() => {
                c.save();

                moxios.wait(() => {
                    moxios.requests.mostRecent().respondWith({
                        status: 200
                    });
                })
            })
        })

        it('should fail if validation error response data is not valid', (done) => {
            let c = new class extends Collection {
                routes() { return {save: '/save'}}
            }

            let m1 = c.add({a: 1});
            let m2 = c.add({a: 2});

            moxios.withMock(() => {
                c.save().catch((error) => {
                    done();
                });

                moxios.wait(() => {
                    moxios.requests.mostRecent().respondWith({
                        status: 422,
                        response: '5'
                    });
                })
            })
        })

        it('should fail if number of validation errors returned does not match the number of saving models', (done) => {
            let c = new class extends Collection {
                routes() { return {save: '/save'}}
            }

            let m1 = c.add({a: 1});
            let m2 = c.add({a: 2});

            moxios.withMock(() => {
                c.save().catch((error) => {
                    expect(error.message).to.equal('Array of errors must equal the number of models')
                    done();
                });

                moxios.wait(() => {
                    moxios.requests.mostRecent().respondWith({
                        status: 422,
                        response: [
                            {a: ['Bad!']},
                        ]
                    });
                })
            })
        })

        it('should set errors on the models corresponding to the models saved', (done) => {
            let c = new class extends Collection {
                routes() { return {save: '/save'}}
            }

            let m1 = c.add({a: 1});
            let m2 = c.add({a: 2});

            moxios.withMock(() => {
                c.save().catch((error) => {
                    expect(error).to.not.be.null;
                    expect(m1.errors).to.deep.equal({a: ['Error!']})
                    expect(m2.errors).to.deep.equal({a: ['Invalid!']})
                    done();
                });

                moxios.wait(() => {
                    moxios.requests.mostRecent().respondWith({
                        status: 422,
                        response: [
                            {a: ['Error!']},
                            {a: ['Invalid!']},
                        ]
                    });
                })
            })
        })

        it('should set errors on the models corresponding to the models saved using identifiers', (done) => {
            let c = new class extends Collection {
                routes() { return {save: '/save'}}
            }

            let m1 = c.add({id: 1, a: 'x'});
            let m2 = c.add({id: 2, a: 'y'});
            let m3 = c.add({id: 3, a: 'z'});

            moxios.withMock(() => {
                c.save().catch((error) => {
                    expect(error).to.not.be.null;
                    expect(m1.errors).to.deep.equal({a: ['Error!']})
                    expect(m2.errors).to.be.empty;
                    expect(m3.errors).to.deep.equal({a: ['Bad!']})
                    done();
                });

                moxios.wait(() => {
                    moxios.requests.mostRecent().respondWith({
                        status: 422,
                        response: {
                            [m1.identifier()]: {a: ['Error!']},
                            [m3.identifier()]: {a: ['Bad!']},
                        }
                    });
                })
            })
        })

        it('should set fatal to false on the models on validation error', (done) => {
            let c = new class extends Collection {
                routes() { return {save: '/save'}}
            }

            let m1 = c.add({a: 1});
            let m2 = c.add({a: 2});

            moxios.withMock(() => {
                m1.fatal = true;
                m2.fatal = true;

                c.save().catch((error) => {
                    expect(m1.fatal).to.equal(false);
                    expect(m2.fatal).to.equal(false);
                    done();
                });

                moxios.wait(() => {
                    moxios.requests.mostRecent().respondWith({
                        status: 422,
                        response: [
                            {a: ['A!']},
                            {a: ['B!']},
                        ]
                    });
                })
            })
        })

        it('should set fatal to false on validation error', (done) => {
            let c = new class extends Collection {
                routes() { return {save: '/save'}}
            }

            let m1 = c.add({a: 1});
            let m2 = c.add({a: 2});

            moxios.withMock(() => {
                c.fatal = true;

                c.save().catch((error) => {
                    expect(c.fatal).to.equal(false);
                    done();
                });

                moxios.wait(() => {
                    moxios.requests.mostRecent().respondWith({
                        status: 422,
                        response: [
                            {a: ['A!']},
                            {a: ['B!']},
                        ]
                    });
                })
            })
        })

        it('should set saving to false on failure', (done) => {
            let c = new class extends Collection {
                routes() { return {save: '/save'}}
            }

            let m1 = c.add({a: 1});
            let m2 = c.add({a: 2});

            moxios.withMock(() => {
                c.save().catch((error) => {
                    expect(c.saving).to.equal(false);
                    done();
                });

                moxios.wait(() => {
                    moxios.requests.mostRecent().respondWith({
                        status: 500,
                    });
                })
            })
        })

        it('should set fatal to true on all saving models on fatal failure', (done) => {
            let c = new class extends Collection {
                routes() { return {save: '/save'}}
            }

            let m1 = c.add({a: 1});
            let m2 = c.add({a: 2});

            moxios.withMock(() => {
                c.save().catch((error) => {
                    expect(m1.fatal).to.equal(true);
                    expect(m2.fatal).to.equal(true);

                    expect(m1.saving).to.equal(false);
                    expect(m2.saving).to.equal(false);

                    done();
                });

                moxios.wait(() => {
                    moxios.requests.mostRecent().respondWith({
                        status: 500,
                    });
                })
            })
        })

        it('should set fatal to true on fatal failure', (done) => {
            let c = new class extends Collection {
                routes() { return {save: '/save'}}
            }

            let m1 = c.add({a: 1});
            let m2 = c.add({a: 2});

            moxios.withMock(() => {
                c.save().catch((error) => {
                    expect(c.fatal).to.equal(true);
                    expect(c.saving).to.equal(false);

                    done();
                });

                moxios.wait(() => {
                    moxios.requests.mostRecent().respondWith({
                        status: 500,
                    });
                })
            })
        })

        it('should emit event on fatal failure', (done) => {
            let c = new class extends Collection {
                routes() { return {save: '/save'}}
            }

            let m1 = c.add({a: 1});
            let m2 = c.add({a: 2});

            c.on('save', (event) => {
                expect(event.error).to.not.be.null;
                done();
            })

            moxios.withMock(() => {
                c.save().catch(() => {});

                moxios.wait(() => {
                    moxios.requests.mostRecent().respondWith({
                        status: 500,
                    });
                })
            })
        })

        it('should emit save failure event on validation failure', (done) => {
            let c = new class extends Collection {
                routes() { return {save: '/save'}}
            }

            let m1 = c.add({a: 1});
            let m2 = c.add({a: 2});

            c.on('save', (event) => {
                expect(event.error).to.not.be.null;
                done();
            })

            moxios.withMock(() => {
                c.save().catch(() => {});

                moxios.wait(() => {
                    moxios.requests.mostRecent().respondWith({
                        status: 422,
                        response: [
                            {a: 'A!'},
                            {a: 'B!'},
                        ]
                    });
                })
            })
        })

        it('should use save route override', (done) => {
            let c = new class extends Collection {
                getSaveRoute() { return '/override/save/route'; }
            }

            c.add(new Model({id: 1}));
            c.add(new Model({id: 2}));

            moxios.withMock(() => {
                c.save();

                moxios.wait(() => {
                    let request = moxios.requests.mostRecent();
                    expect(request.url).to.equal('/override/save/route');
                    done();
                })
            })
        })

        it('should use save headers override', (done) => {
            let c = new class extends Collection {
                routes() { return {save: '/save'}}
                getSaveHeaders() { return {test: 'yes'} }
            }

            c.add(new Model({id: 1}));
            c.add(new Model({id: 2}));

            moxios.withMock(() => {
                c.save();

                moxios.wait(() => {
                    let request = moxios.requests.mostRecent();
                    expect(request.headers.test).to.equal('yes');
                    done();
                })
            })
        })

        it('should use default headers override', (done) => {
            let c = new class extends Collection {
                routes() { return {save: '/save'}}
                getDefaultHeaders() { return {test: 'yes'} }
            }

            c.add(new Model({id: 1}));
            c.add(new Model({id: 2}));

            moxios.withMock(() => {
                c.save();

                moxios.wait(() => {
                    let request = moxios.requests.mostRecent();
                    expect(request.headers.test).to.equal('yes');
                    done();
                })
            })
        })

        it('should use default headers with save headers override', (done) => {
            let c = new class extends Collection {
                routes() { return {save: '/save'}}
                getDefaultHeaders() { return {test: 'yes'} }
                getSaveHeaders() { return {test: 'no'} }
            }

            c.add(new Model({id: 1}));
            c.add(new Model({id: 2}));

            moxios.withMock(() => {
                c.save();

                moxios.wait(() => {
                    let request = moxios.requests.mostRecent();
                    expect(request.headers.test).to.equal('no');
                    done();
                })
            })
        })

        it('should use save method override', (done) => {
            let c = new class extends Collection {
                routes() { return {save: '/save'}}
                getSaveMethod() { return 'PATCH' }
            }

            c.add(new Model({id: 1}));
            c.add(new Model({id: 2}));

            moxios.withMock(() => {
                c.save();

                moxios.wait(() => {
                    let request = moxios.requests.mostRecent();
                    expect(request.config.method).to.equal('patch');
                    done();
                })
            })
        })

        it('should use save query parameters override', (done) => {
            let c = new class extends Collection {
                routes()   { return {save: '/save'}}
                getSaveQuery() { return {a: 1} }
            }

            c.add(new Model({id: 1}));
            c.add(new Model({id: 2}));

            moxios.withMock(() => {
                c.save();

                moxios.wait(() => {
                    let request = moxios.requests.mostRecent();
                    expect(request.url).to.equal('/save?a=1');
                    done();
                })
            })
        })
    })

    describe('fetch', () => {

        it('should use fetch route override', (done) => {
            let c = new class extends Collection {
                getFetchRoute() { return '/override/fetch/route'; }
            }

            c.add(new Model({id: 1}));
            c.add(new Model({id: 2}));

            moxios.withMock(() => {
                c.fetch();

                moxios.wait(() => {
                    let request = moxios.requests.mostRecent();
                    expect(request.url).to.equal('/override/fetch/route');
                    done();
                })
            })
        })

        it('should use fetch headers override', (done) => {
            let c = new class extends Collection {
                routes() { return {fetch: '/fetch'}}
                getFetchHeaders() { return {test: 'yes'} }
            }

            c.add(new Model({id: 1}));
            c.add(new Model({id: 2}));

            moxios.withMock(() => {
                c.fetch();

                moxios.wait(() => {
                    let request = moxios.requests.mostRecent();
                    expect(request.headers.test).to.equal('yes');
                    done();
                })
            })
        })

        it('should use default headers override', (done) => {
            let c = new class extends Collection {
                routes() { return {fetch: '/fetch'}}
                getDefaultHeaders() { return {test: 'yes'} }
            }

            c.add(new Model({id: 1}));
            c.add(new Model({id: 2}));

            moxios.withMock(() => {
                c.fetch();

                moxios.wait(() => {
                    let request = moxios.requests.mostRecent();
                    expect(request.headers.test).to.equal('yes');
                    done();
                })
            })
        })

        it('should use default headers with fetch headers override', (done) => {
            let c = new class extends Collection {
                routes() { return {fetch: '/fetch'}}
                getDefaultHeaders() { return {test: 'yes'} }
                getFetchHeaders() { return {test: 'no'} }
            }

            c.add(new Model({id: 1}));
            c.add(new Model({id: 2}));

            moxios.withMock(() => {
                c.fetch();

                moxios.wait(() => {
                    let request = moxios.requests.mostRecent();
                    expect(request.headers.test).to.equal('no');
                    done();
                })
            })
        })

        it('should use fetch method override', (done) => {
            let c = new class extends Collection {
                routes() { return {fetch: '/fetch'}}
                getFetchMethod() { return 'PATCH' }
            }

            c.add(new Model({id: 1}));
            c.add(new Model({id: 2}));

            moxios.withMock(() => {
                c.fetch();

                moxios.wait(() => {
                    let request = moxios.requests.mostRecent();
                    expect(request.config.method).to.equal('patch');
                    done();
                })
            })
        })

        it('should use fetch query parameters override', (done) => {
            let c = new class extends Collection {
                routes()   { return {fetch: '/fetch'}}
                getFetchQuery() { return {a: 1} }
            }

            c.add(new Model({id: 1}));
            c.add(new Model({id: 2}));

            moxios.withMock(() => {
                c.fetch();

                moxios.wait(() => {
                    let request = moxios.requests.mostRecent();
                    expect(request.url).to.equal('/fetch?a=1');
                    done();
                })
            })
        })

        it('should not skip if already fetching', () => {
            let c = new class extends Collection {
                routes() { return {fetch: '/fetch'}}
            }

            c.loading = true;

            moxios.withMock(() => {
                c.fetch().then((response) => {
                    expect(response).to.not.be.null;
                    done();
                });

                moxios.wait(() => {
                    moxios.requests.mostRecent().respondWith({
                        status: 200,
                        response: [],
                    });
                })
            })
        })

        it('should skip if paginated and on last page', (done) => {
            let c = new class extends Collection {
                routes() { return {fetch: '/fetch'}}
            }

            c.page(1);

            moxios.withMock(() => {
                c.fetch().then((response) => {
                    // console.log(response);
                    expectRequestToBeSkipped(c.fetch(), done);
                });
            
                moxios.wait(() => {
                    moxios.requests.mostRecent().respondWith({
                        status: 200,
                        response: []
                    });
                });
            });
        })

        it('should set loading to true on fetch', (done) => {
            let c = new class extends Collection {
                routes() { return {fetch: '/fetch'}}
            }

            moxios.withMock(() => {
                c.loading = false;
                expect(c.loading).to.equal(false);
                c.fetch();
                expect(c.loading).to.equal(true);
                done();
            });
        })

        it('should replace on non-paginated success', (done) => {
            let c = new class extends Collection {
                routes() { return {fetch: '/fetch'}}
            }

            c.add({id: 1}); // Replace this

            moxios.withMock(() => {
                c.fetch().then((response) => {
                    expect(c.models.length).to.equal(1);
                    expect(c.models[0].attributes).to.deep.equal({id: 100});
                    done();
                });

                moxios.wait(() => {
                    moxios.requests.mostRecent().respondWith({
                        status: 200,
                        response: [
                            {id: 100},
                        ]
                    });
                });
            })
        })

        it('should set loading to false on non-paginated success', (done) => {
            let c = new class extends Collection {
                routes() { return {fetch: '/fetch'}}
            }

            moxios.withMock(() => {
                c.fetch().then((response) => {
                    expect(c.loading).to.equal(false);
                    done();
                });

                moxios.wait(() => {
                    moxios.requests.mostRecent().respondWith({
                        status: 200,
                        response: [
                            {id: 1},
                        ]
                    });
                });
            })
        })

        it('should set fatal to false on non-paginated success', (done) => {
            let c = new class extends Collection {
                routes() { return {fetch: '/fetch'}}
            }

            moxios.withMock(() => {
                c.fatal = true;

                c.fetch().then((response) => {
                    expect(c.fatal).to.equal(false);
                    done();
                });

                moxios.wait(() => {
                    moxios.requests.mostRecent().respondWith({
                        status: 200,
                        response: [
                            {id: 1},
                        ]
                    });
                });
            })
        })

        it('should set loading to false on paginated success', (done) => {
            let c = new class extends Collection {
                routes() { return {fetch: '/fetch'}}
            }

            c.page(1);

            moxios.withMock(() => {
                 c.fetch().then((response) => {
                    expect(c.loading).to.equal(false);
                    done();
                });

                moxios.wait(() => {
                    moxios.requests.mostRecent().respondWith({
                        status: 200,
                        response: [
                            {id: 1},
                        ]
                    });
                });
            })
        })

        it('should set fatal to false on paginated success', (done) => {
            let c = new class extends Collection {
                routes() { return {fetch: '/fetch'}}
            }

            c.page(1);

            moxios.withMock(() => {
                c.fatal = true;

                c.fetch().then((response) => {
                    expect(c.fatal).to.equal(false);
                    done();
                });

                moxios.wait(() => {
                    moxios.requests.mostRecent().respondWith({
                        status: 200,
                        response: [
                            {id: 1},
                        ]
                    });
                });
            })
        })

        it('should set page to last page if no models returned during pagination', (done) => {
            let c = new class extends Collection {
                routes() { return {fetch: '/fetch'}}
            }

            c.page(1);

            moxios.withMock(() => {
                c.fetch().then((response) => {
                    expect(c.isLastPage()).to.equal(true);
                    done();
                });

                moxios.wait(() => {
                    moxios.requests.mostRecent().respondWith({
                        status: 200,
                        response: []
                    });
                });
            })
        })

        it('should append on pagination and increment page', (done) => {
            let c = new class extends Collection {
                routes() { return {fetch: '/fetch'}}
            }

            c.page(1);

            moxios.withMock(() => {
                c.fetch().then((response) => {
                    expect(c.isLastPage()).to.equal(false);
                    expect(c.getPage()).to.equal(2);
                    done();
                });

                moxios.wait(() => {
                    moxios.requests.mostRecent().respondWith({
                        status: 200,
                        response: [
                            {a: 1},
                        ]
                    });
                });
            })
        })

        it('should fail if response is missing', (done) => {
            let c = new class extends Collection {
                routes() { return {fetch: '/fetch'}}
            }

            moxios.withMock(() => {
                c.fetch().catch((error) => {
                    expect(error.message).to.equal('Expected an array of models in fetch response');
                    done();
                });

                moxios.wait(() => {
                    moxios.requests.mostRecent().respondWith({
                        status: 200
                    });
                });
            })
        })

        it('should fail if response is blank', (done) => {
            let c = new class extends Collection {
                routes() { return {fetch: '/fetch'}}
            }

            moxios.withMock(() => {
                c.fetch().catch((error) => {
                    expect(error.message).to.equal('Expected an array of models in fetch response');
                    done();
                });

                moxios.wait(() => {
                    moxios.requests.mostRecent().respondWith({
                        status: 200,
                        response: '',
                    });
                });
            })
        })

        it('should fail if a non-nil response is not an array', (done) => {
            let c = new class extends Collection {
                routes() { return {fetch: '/fetch'}}
            }

            moxios.withMock(() => {
                c.fetch().catch((error) => {
                    expect(error.message).to.equal('Expected an array of models in fetch response');
                    done();
                });

                moxios.wait(() => {
                    moxios.requests.mostRecent().respondWith({
                        status: 200,
                        response: '5',
                    });
                });
            })
        })

        it('should set loading to false on fetch failure', (done) => {
            let c = new class extends Collection {
                routes() { return {fetch: '/fetch'}}
            }

            moxios.withMock(() => {
                c.fetch().catch((error) => {
                    expect(c.loading).to.equal(false);
                    done();
                });

                moxios.wait(() => {
                    moxios.requests.mostRecent().respondWith({
                        status: 500,
                    });
                });
            })
        })
    })

    describe('toArray', () => {
        it('should return an array of all toJSON models', () => {
            let c = new Collection();
            let m1 = c.add({id: 1});
            let m2 = c.add({id: 2});

            let cArray = c.toArray();

            expect(cArray).to.be.an('array');
            expect(cArray).to.have.lengthOf(2);
            expect(JSON.stringify(cArray)).to.equal('[{"id":1},{"id":2}]');
            expect(JSON.stringify(cArray)).to.equal(JSON.stringify(c));
        })
    })
})

