import moxios from 'moxios'
import {assert, expect} from 'chai'
import {Model, Collection} from '../../src/index.js'
import ValidationError  from '../../src/Errors/ValidationError.js'
import * as _ from 'lodash';
import * as util from 'util';
import {
    boolean,
    email,
    equal,
    integer,
    min,
    numeric,
    required,
    string,
} from '../../src/Validation/index.js'

/**
 * @type {number} How long moxios has to wait before handling a request.
 */
moxios.delay = 1;

/**
 * Checks that a request was skipped.
 */
function expectRequestToBeSkipped(request, done) {
    let error = new Error("Request was not skipped");
    let delay = 2;

    request.then(() => done(error)).catch(() => done(error));
    _.delay(done, delay);
}

/**
 * Unit tests for Model.js
 */
describe('Model', () => {

    beforeEach(function () {
      moxios.install()
    })

    afterEach(function () {
      moxios.uninstall()
    })

    describe('autobind', () => {
        it('should not invoke getters and setters when instantiated', (done) => {
            let M = class extends Model {
                get test() {
                    done(new Error('Should not invoke getter'));
                }
                set test(value) {
                    done(new Error('Should not invoke setter'));
                }
            }

            let m = new M();
            done();
        })
    })

    describe('_uid', () => {
        it('should automatically generate unique incrementing ids', () => {
            let base = (new Model())._uid;

            expect((new Model())._uid).to.equal(_.toString(_.toSafeInteger(base) + 1));
            expect((new Model())._uid).to.equal(_.toString(_.toSafeInteger(base) + 2));
            expect((new Model())._uid).to.equal(_.toString(_.toSafeInteger(base) + 3));
        });
    })

    describe('$', () => {
        it('should return saved values', () => {
            let m = new Model({a: 1});
            m.a = 2;
            expect(m.$.a).to.equal(1);
        })
    })

    describe('toString', () => {
        it('should return the expected string representation', () => {
            let m = new Model({a: 1});
            expect(`${m}`).to.equal(`<Model #${m._uid}>`);
        })

        it('should use the class name of the extending class', () => {
            class M extends Model {}
            let m = new M();
            expect(`${m}`).to.equal(`<M #${m._uid}>`);
        })
    })

    describe('errors', () => {
        it('should return errors', () => {
            let m = new Model();
            m.setErrors({a: ['Invalid!']});
            expect(m.errors).to.deep.equal({a: ['Invalid!']});
        })

        it('should only return the first error if `useFirstErrorOnly` is set', () => {
            let m = new Model({}, null, {useFirstErrorOnly: true});
            m.setErrors({a: [1, 2, 3], b: [4, 5]});
            expect(m.errors).to.deep.equal({
                a: 1,
                b: 4,
            });
        })
    })

    describe('setOptions', () => {
        it('should merge recursively', () => {
            let m = new Model({}, null, {
                methods: {
                    patch: 'TEST',
                }
            });

            expect(m.getOption('methods.patch')).to.equal('TEST');
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

    describe('getClass', () => {
        it('should return the class name', () => {
            let A = Model;
            let B = class extends A {};
            let C = class extends B {};
            let D = class E extends C {};

            expect((new A()).$class).to.equal('Model');
            expect((new B()).$class).to.equal('B');
            expect((new C()).$class).to.equal('C');
            expect((new D()).$class).to.equal('E');
        })
    })

    describe('on', () => {
        it('should register event listener', () => {
            let m = new Model();
            let f = () => {}
            m.on('test', f)

            expect(m._listeners).to.deep.equal({test: [f]});
        })
    })

    describe('emit', () => {
        it('should emit event to all listeners', () => {
            let m = new Model();

            let count = 0;

            let calls = {
                a: false,
                b: false,
                c: false,
            }

            m.on('test', () => { calls.a = true; count++; });
            m.on('test', () => { calls.b = true; count++; });
            m.on('test', () => { calls.c = true; count++; });

            m.emit('test');

            expect(count).to.equal(3);

            expect(calls.a).to.equal(true);
            expect(calls.b).to.equal(true);
            expect(calls.c).to.equal(true);
        })

        it('should not mind if we emit when no listeners exist', () => {
            let m = new Model();
            m.emit('test');
        })

        it('should emit all events even if some are rejected', () => {
            let m = new Model();

            let count = 0;

            let calls = {
                a: false,
                b: false,
                c: false,
            }

            m.on('test', () => { calls.a = true; count++; });
            m.on('test', () => { calls.b = true; count++; return false; });
            m.on('test', () => { calls.c = true; count++; return false; });

            m.emit('test');

            expect(count).to.equal(2);

            expect(calls.a).to.equal(true);
            expect(calls.b).to.equal(true);
            expect(calls.c).to.equal(false);
        })
    })

    describe('saved', () => {
        it('should return saved values', () => {
            let m = new Model({a: 1});
            m.a = 2;
            expect(m.saved('a')).to.equal(1);
        })
    })

    describe('routes', () => {
        it('should fail when accessing a non-existing route', (done) => {
            (new Model()).save().catch((error) => {
                expect(error.message).to.equal('Invalid or missing route');
                done();
            });
        })
    })

    describe('changed', () => {
        it('should return top-level changed fields', () => {
            let m = new Model({a: 1, b: 2, c: 3});

            m.a = 6;
            expect(m.changed()).to.deep.equal(['a']);

            m.b = 7;
            expect(m.changed()).to.deep.equal(['a', 'b']);

            m.c = 8;
            expect(m.changed()).to.deep.equal(['a', 'b', 'c']);
        })

        it('should return nested changed fields', () => {
            let m = new Model({a: {b: 2, c: 3}});
            m.a.b = 5;
            expect(m.changed()).to.deep.equal(['a']);
        })

        it('should return false when there are no changed fields', () => {
            let m = new Model();
            expect(m.changed()).to.equal(false);
        })

        it('should return false after reset', () => {
            let m = new Model({a: 1});
            m.a = 2;
            m.reset();
            expect(m.changed()).to.equal(false);
        })
    })

    describe('clear', () => {
        it('should revert attributes back to defaults', () => {
            let M = class extends Model {defaults() { return {a: 1} }}
            let m = new M({a: 1, b: 2, c: 3});

            m.a = 5;
            m.clear();

            // Check attributes
            expect(m.a).to.equal(1);
            expect(m.b).to.be.undefined;
            expect(m.c).to.be.undefined;

            // Check reference
            expect(m.$.a).to.equal(1);
            expect(m.$.b).to.be.undefined;
            expect(m.$.c).to.be.undefined;
        })
    })

    describe('clearErrors', () => {
        it('should clear all existing errors', () => {
            let m = new Model();
            m._errors = {a: 'error!'};
            m.clearErrors();
            expect(m.errors).to.deep.equal({});
        })
    })

    describe('constructor', () => {
        it('should support no params', () => {
            let m = new Model();
            expect(m.$).to.deep.equal({});
        })

        it('should support initial attributes', () => {
            let m = new Model({a: 1});
            expect(m.$).to.deep.equal({a: 1});
        })

        it('should support undefined initial attributes', () => {
            let m = new Model(undefined);
            expect(m.$).to.deep.equal({});
        })

        it('should support undefined initial attributes', () => {
            let m = new Model(null);
            expect(m.$).to.deep.equal({});
        })

        it('should support collection as initial register', () => {
            let c = new Collection();
            let m = new Model({}, c);
            expect(m.collections).to.deep.equal([c]);
        })

        it('should support an array of collections as initial register', () => {
            let c1 = new Collection();
            let c2 = new Collection();
            let m  = new Model({}, [c1, c2]);
            expect(m.collections).to.deep.equal([c1, c2]);
        })

        it('should support undefined collection as initial register', () => {
            let m = new Model({}, undefined);
            expect(m.collections).to.deep.equal([]);
        })

        it('should support null collection as initial register', () => {
            let m = new Model({}, null);
            expect(m.collections).to.deep.equal([]);
        })

        it('should support setting options', () => {
            let m = new Model(null, null, {loading: 5});
            expect(m.attributes).to.deep.equal({});
            expect(m.loading).to.equal(false);
            expect(m.getOption('loading')).to.equal(5);
        })

        it('should honour default options', () => {
            let m = new class extends Model {
                options() {
                    return {loading: 5}
                }
            }
            expect(m.loading).to.equal(false);
            expect(m.getOption('loading')).to.equal(5);
        })

        it('should override default options', () => {
            let M = class extends Model {
                options() {
                    return {loading: 5}
                }
            }

            let m = new M(null, null, {loading: 10});
            expect(m.loading).to.equal(false);
            expect(m.getOption('loading')).to.equal(10);
        })

        it('should allow arbitrary options', () => {
            let m = new Model(null, null, {a: 1});
            expect(m.getOption('a')).to.equal(1);
        })
    })

    describe('defaults', () => {
        it('should support default object', () => {
            let M = class extends Model { defaults() { return {a: 1, b: 2} }}
            let m = new M();
            expect(m.$).to.deep.equal({a: 1, b: 2});
        })

        it('should support undefined', () => {
            let M = class extends Model { defaults() {  }}
            let m = new M();
            expect(m.$).to.deep.equal({});
        })
    })

    describe('get', () => {
        it('should return undefined if attribute not found', () => {
            expect((new Model()).get('attr')).to.be.undefined;
        })

        it('should return value of attribute if found', () => {
            expect((new Model({a: 1})).get('a')).to.equal(1);
        })

        it('should return default if attribute not found', () => {
            expect((new Model()).get('b', 5)).to.equal(5);
        })

        it('should not return default if attribute was found', () => {
            expect((new Model({a: 1})).get('a', 5)).to.equal(1);
        })
    })

    describe('has', () => {
        it('should return true if a model has an attribute', () => {
            let m = new Model({a: 1});
            expect(m.has('a')).to.equal(true);
        })

        it('should return true if a model has an attribute that is undefined', () => {
            let m = new Model({a: undefined});
            expect(m.has('a')).to.equal(true);
        })

        it('should return false if a model does not have an attribute', () => {
            let m = new Model({a: 1});
            expect(m.has('b')).to.equal(false);
        })
    })

    describe('validate', () => {

        it('should validate a nested model', (done) => {
            let validated = false;

            let inner = new class extends Model {
                defaults() {
                    return {
                        a: 1,
                    }
                }
                validate() {
                    // Mark that we've validated this model.
                    validated = true;
                    return super.validate();
                }
                validation() {
                    return {
                        a: email,
                    }
                }
            }

            let outer = new Model({inner});

            outer.validate().then((errors) => {
                expect(validated).to.equal(true);
                expect(errors).to.deep.equal({ 
                    inner: [{ 
                        a: ['Must be a valid email address']
                    }]
                });
                expect(inner.errors).to.deep.equal({a: ['Must be a valid email address']});
                done();
            });
        })

        it('should fail if a nested model fails its validation', (done) => {
            let inner = new class extends Model {
                defaults() {
                    return {a: 1}
                }
                validation() {
                    return {a: email}
                }
            }

            let outer = new Model({inner});

            outer.validate().then((errors) => {
                expect(errors).to.deep.equal({ 
                    inner: [{ 
                        a: ['Must be a valid email address']
                    }]
                });
                expect(outer.inner.errors).to.deep.equal({a: ['Must be a valid email address']});
                done();
            })
        })

        it('should not validate a nested model if option is disabled', (done) => {
            let validated = false;

            let inner = new class extends Model {
                defaults() {
                    return {
                        a: 1,
                    }
                }
                validate() {
                    validated = true;
                    return super.validate();
                }
                validation() {
                    return {
                        a: email,
                    }
                }
            }

            let outer = new Model({inner});
            outer.setOption('validateRecursively', false);

            outer.validate().then((errors) => {
                expect(errors).to.be.empty;
                expect(outer.errors).to.be.empty;
                expect(inner.errors).to.be.empty;
                expect(validated).to.equal(false);
                done();
            });
        })

        it('should throw if `false` is given as attribute', (done) => {
            let m = new class extends Model {
                defaults() {
                    return {
                        a: 5,
                    }
                }
                validation() {
                    return {
                        a: email,
                    }
                }
            }

            m.validate(false).then(() => {
                done('Promise should not have been resolved');
            }).catch((error) => {
                expect(error.message).to.equal('Invalid argument for validation attributes');
                done();
            })
        })

        it('should throw if undefined attribute is given', (done) => {
            let m = new class extends Model {
                defaults() {
                    return {
                        a: 5,
                    }
                }
                validation() {
                    return {
                        a: email,
                    }
                }
            }

            m.validate('b').then(() => {
                done('Promise should not have been resolved');
            }).catch((error) => {
                expect(error.message).to.equal("'b' is not defined");
                done();
            })
        })

        it('should validate a single attribute', (done) => {
            let m = new class extends Model {
                options() {
                    return {
                        validateOnChange: false,
                    }
                }
                validation() {
                    return {
                        a: email,
                        b: numeric,
                    }
                }
            }({a: 'not_an_email', b: 'not_numeric'});

            expect(m.errors).to.be.empty;

            m.validate('a').then((errors) => {
                expect(errors).to.deep.equal({a: ['Must be a valid email address']});
                expect(m.errors).to.deep.equal(errors);
                done();
            });
        })

        it('should honour the `useFirstErrorOnly` option', (done) => {
            let m = new class extends Model {
                validation() {
                    return {
                        a: [email, numeric],
                    }
                }
            }({a: 'not_an_email_or_numeric'});

            m.setOption('useFirstErrorOnly', false);
            m.validate().then((errors) => {
                expect(m.errors.a).to.have.lengthOf(2);
                expect(m._errors.a).to.have.lengthOf(2);
                expect(errors.a).to.have.lengthOf(2);

            }).then(() => {
                m.setOption('useFirstErrorOnly', true);
                expect(m.errors.a).to.be.a('string');
                expect(m._errors.a).to.have.lengthOf(2); // internal

                m.validate().then((errors) => {
                    expect(m.errors.a).to.be.a('string');
                    expect(errors.a).to.be.a('string');
                    expect(m._errors.a).to.have.lengthOf(2); // internal

                    done();
                })
            })
        })

        it('should validate a single attribute that passes', (done) => {
            let m = new class extends Model {
                options() {
                    return {
                        validateOnChange: false,
                    }
                }
                validation() {
                    return {
                        a: email,
                        b: numeric,
                    }
                }
            }({a: 'not_an_email', b: 5});

            expect(m.errors).to.be.empty;

            m.validate('b').then((errors) => {
                expect(errors).to.be.empty;
                expect(m.errors).to.deep.equal({});

                m.validate().then((errors) => {
                    expect(errors).to.not.be.empty;
                    expect(m.errors).to.deep.equal({
                        a: ["Must be a valid email address"],
                    });
                    done();
                });
            });

            
        })

        it('should fail when validating an attribute that does not exist', (done) => {
            let m = new class extends Model {
                options() {
                    return {
                        validateOnChange: false,
                    }
                }
                validation() {
                    return {
                        a: email,
                        b: numeric,
                    }
                }
            }({a: 'not_an_email', b: 'not_numeric'});

            expect(m.errors).to.be.empty;

            m.validate('c').then((errors) => {
                done('Promise should not have been resolved');
            }).catch((error) => {
                expect(error.message).to.equal("'c' is not defined");
                done();
            })
        })

        it('should validate an array of attributes', (done) => {
            let m = new class extends Model {
                options() {
                    return {
                        validateOnChange: false,
                    }
                }
                validation() {
                    return {
                        a: email,
                        b: numeric,
                        c: numeric,
                    }
                }
            }({
                a: 'not_an_email', 
                b: 'not_numeric', 
                c: 'not_numeric',
            });

            expect(m.errors).to.be.empty;

            m.validate(['a', 'c']).then((errors) => {
                expect(Object.keys(errors)).to.deep.equal(["a", "c"]);
                expect(Object.keys(m.errors)).to.deep.equal(["a", "c"]);
                expect(Object.keys(m._errors)).to.deep.equal(["a", "c"]);
                done();
            });
        })

        it('should validate all attributes if none given', (done) => {
            let m = new class extends Model {
                options() {
                    return {
                        validateOnChange: false,
                    }
                }
                validation() {
                    return {
                        a: email,
                        b: numeric,
                    }
                }
            }({a: 'not_an_email', b: 'not_numeric'});

            expect(m.errors).to.be.empty;

            m.validate().then((errors) => {
                expect(Object.keys(errors)).to.deep.equal(["a", "b"]);
                expect(Object.keys(m.errors)).to.deep.equal(["a", "b"]);
                expect(Object.keys(m._errors)).to.deep.equal(["a", "b"]);
                done();
            });
        })

        it('should validate the documentation example', (done) => {
            let Task = class extends Model {
                defaults() {
                    return {
                        id:   null,
                        name: '',
                        done: false,
                    }
                }
                validation() {
                    return {
                        id:   integer.and(min(1)).or(equal(null)),
                        name: string.and(required),
                        done: boolean,
                    }
                }
            }

            let task = new Task();
            expect(task.errors).to.be.empty;

            task.validate().then((errors) => {
                expect(errors).to.deep.equal({"name": ["Required"]});
                expect(task.errors).to.deep.equal({"name": ["Required"]});
                expect(task._errors).to.deep.equal({"name": ["Required"]});

                task.set({name: 'Example'});
                task.validate().then((errors) => {
                    expect(errors).to.be.empty;
                    expect(task.errors).to.be.empty;
                    expect(task._errors).to.be.empty;

                    done();
                })
            });
        })

        it('should pass the attribute name to the message context', (done) => {
            let m = new class extends Model {
                defaults() {
                    return {
                        name: '',
                    }
                }
                validation() {
                    return {
                        name: string.format("Can ${attribute} be a string, please?"),
                    }
                }
            }

            m.name = 5;
            m.validate().then((errors) => {
                expect(m.errors).to.deep.equal({"name": ["Can name be a string, please?"]});
                done();
            })
        })
    })

    describe('mutations', () => {
        it('should support an array of mutations', () => {
            let m = new class extends Model {
                mutations() {
                    return {
                        a: [_.toNumber, (v) => (v * 2), _.toString],
                    }
                }
            }({a: '5'}, null, {
                mutateOnChange: true,
                mutateBeforeSync: true,
            });

            expect(m.a).to.equal('20');
        })
    })

    describe('set', () => {
        it('should set attribute if it does not already exist', () => {
            let m = new Model();
            m.set('a', 1);
            expect(m.a).to.equal(1);
            expect(m.$.a).to.be.undefined;
        })

        it('should overwrite attribute if it already exists', () => {
            let m = new Model({a: 1});
            m.set('a', 2);
            expect(m.a).to.equal(2);
            expect(m.$.a).to.equal(1);
        })

        it('should fail when trying to set reserved attribute name', () => {
            try {
                (new Model()).set('loading', 1);
            } catch (e) {
                return;
            }
            assert.fail();
        })

        it('should not mutate values if `mutateOnChange` is false', () => {
            let m = new class extends Model {
                mutations() {
                    return {
                        a: _.toString,
                    }
                }
            }({a: 1}, null, {mutateOnChange: false});

            m.set('a', 5);
            expect(m.a).to.equal(5);
        })

        it('should mutate values if a mutator is set', () => {
            let m = new class extends Model {
                mutations() {
                    return {
                        a: _.toString,
                    }
                }
            }({a: 1}, null, {mutateOnChange: true});

            m.set('a', 5);
            expect(m.a).to.equal('5');
        })

        it('should mutate values if multiple mutations are set', () => {
            let m = new class extends Model {
                mutations() {
                    return {
                        a: [(v) => (v * 2), _.toString],
                    }
                }
            }({a: 1}, null, {mutateOnChange: true});

            m.set('a', 5);
            expect(m.a).to.equal('10');
        })

        it('should emit a change event when a value has changed', (done) => {
            let m = new Model({a: 1});

            m.on('change', function(e) {
                expect(e.target).to.equal(m);
                expect(e.previous).to.equal(1);
                expect(e.value).to.equal(5);
                expect(m.a).to.equal(5);
                done();
            });

            m.set('a', 5);
        })

        it('should not emit a change event when a value is set for the first time', () => {
            let m = new Model();

            m.on('change', function(e) {
                assert.fail('Should not have called the change event');
            });

            m.set('a', 1);
        })

        it('should emit a change event with the mutated value', (done) => {
            let m = new class extends Model {
                mutations() {
                    return {
                        a: (v) => (v * 2),
                    }
                }
            }({a: 1}, null, {
                mutateOnChange: true,
                mutateBeforeSync: false,
            });

            m.on('change', function(e) {
                expect(e.target).to.equal(m);
                expect(e.previous).to.equal(2);
                expect(e.value).to.equal(10);
                expect(m.a).to.equal(10);
                done();
            });

            m.set('a', 5);
        })

        it('should not emit a change event when a value has not changed', () => {
            let m = new class extends Model {
                mutations() {
                    return {
                        a: _.toString,
                    }
                }
            }({a: 1}, null, {mutateBeforeSync: false});

            m.on('change', function(e) {
                assert.fail('Should not have called the "change" event');
            });

            m.set('a', 1);
        })

        it('should validate an attribute on change if option is enabled', (done) => {
            let m = new class extends Model {
                options() {
                    return {
                        validateOnChange: true,
                    }
                }

                validation() {
                    return {
                        a: email,
                    }
                }
            }({a: 1});

            m.on('change', function(e) {
                setTimeout(() => {
                    expect(m.errors.a).to.deep.equal(['Must be a valid email address']);
                    done();
                }, 1);
            });

            m.set('a', 5);
        })

        it('should not validate an attribute on change if option disabled', (done) => {
            let m = new class extends Model {
                options() {
                    return {
                        validateOnChange: false,
                    }
                }

                validation() {
                    return {
                        a: email,
                    }
                }
            }({a: 1});

            m.on('change', function(e) {
                setTimeout(() => {
                    expect(m.a).to.equal(5);
                    expect(m.errors).to.be.empty;
                    done();
                }, 1);
            });

            m.set('a', 5);
        })
    })

    describe('unset', () => {
        it('should revert a value to its default value', () => {
            let M = class extends Model {
                defaults() {
                    return {a: 1};
                }
            }

            let m = new M({a: 5});

            expect(m.a).to.equal(5);
            m.unset('a');
            expect(m.a).to.equal(1);
        })

        it('should not fail if the attribute does not exist', () => {
            let m = new Model();
            m.unset('a');
        })

        it('should revert a value to undefined if it does not have a default', () => {
            let m = new Model({a: 1});

            expect(m.a).to.equal(1);
            m.unset('a');
            expect(m.a).to.be.undefined;
        })

        it('should support unsetting a specific property', () => {
            let m = new Model({a: 1, b: 2});

            m.unset('a');
            expect(m.a).to.be.undefined;
            expect(m.b).to.equal(2);
        })

        it('should support unsetting an array of properties', () => {
            let m = new Model({a: 1, b: 2, c: 3});

            m.unset(['b', 'c']);
            expect(m.a).to.equal(1);
            expect(m.b).to.be.undefined;
            expect(m.c).to.be.undefined;
        })

        it('should revert all values to their default values', () => {
            let m = new class extends Model {
                defaults() {
                    return {a: 1, b: 2, c: 3};
                }
            }

            m.a = 10;
            m.b = 20;
            m.c = 30;

            m.unset();

            expect(m.a).to.equal(1);
            expect(m.b).to.equal(2);
            expect(m.c).to.equal(3);
        })
    })

    describe('reset', () => {
        it('should reset attributes to the reference', () => {
            let m = new Model({a: 1, b: 2});

            expect(m.a).to.equal(1);
            expect(m.b).to.equal(2);
            expect(m.$.a).to.equal(1);
            expect(m.$.b).to.equal(2);

            m.a = 5;
            m.b = 6;

            expect(m.a).to.equal(5);
            expect(m.b).to.equal(6);
            expect(m.$.a).to.equal(1);
            expect(m.$.b).to.equal(2);

            m.reset();

            expect(m.a).to.equal(1);
            expect(m.b).to.equal(2);
            expect(m.$.a).to.equal(1);
            expect(m.$.b).to.equal(2);
        })

        it('should not mind if there are no attributes', () => {
            let m = new Model();
            m.reset();
        })

        it('should not mind if already reset', () => {
            let m = new Model({a: 1, b: 2});
            m.a = 5;

            m.reset();
            m.reset();
        })

        it('should emit "reset" on reset', (done) => {
            let m = new Model();
            m.on('reset', () => {
                done();
            })

            m.reset();
        })

        it('should support resetting a specific property', () => {
            let m = new Model({a: 1, b: 2});
            m.a = 10;
            m.b = 20;

            m.reset('a');
            expect(m.a).to.equal(1);
            expect(m.b).to.equal(20);
        })

        it('should support resetting an array of properties', () => {
            let m = new Model({a: 1, b: 2, c: 3});
            m.a = 10;
            m.b = 20;
            m.c = 30;

            m.reset(['b', 'c']);
            expect(m.a).to.equal(10);
            expect(m.b).to.equal(2);
            expect(m.c).to.equal(3);
        })
    })

    describe('sync', () => {
        it('should sync attributes to the reference', () => {
            let m = new Model({a: 1, b: 2});

            expect(m.a).to.equal(1);
            expect(m.b).to.equal(2);
            expect(m.$.a).to.equal(1);
            expect(m.$.b).to.equal(2);

            m.a = 5;
            m.b = 6;

            expect(m.a).to.equal(5);
            expect(m.b).to.equal(6);
            expect(m.$.a).to.equal(1);
            expect(m.$.b).to.equal(2);

            m.sync();

            expect(m.a).to.equal(5);
            expect(m.b).to.equal(6);
            expect(m.$.a).to.equal(5);
            expect(m.$.b).to.equal(6);
        })

        it('should sync a specific attribute', () => {
            let m = new Model({a: 1, b: 2});

            expect(m.a).to.equal(1);
            expect(m.b).to.equal(2);
            expect(m.$.a).to.equal(1);
            expect(m.$.b).to.equal(2);

            m.a = 5;
            m.b = 6;

            expect(m.a).to.equal(5);
            expect(m.b).to.equal(6);
            expect(m.$.a).to.equal(1);
            expect(m.$.b).to.equal(2);

            m.sync('a');

            expect(m.a).to.equal(5);
            expect(m.b).to.equal(6);
            expect(m.$.a).to.equal(5);
            expect(m.$.b).to.equal(2);
        })

        it('should sync a an array of specific attributes', () => {
            let m = new Model({a: 1, b: 2, c: 3});

            expect(m.a).to.equal(1);
            expect(m.b).to.equal(2);
            expect(m.c).to.equal(3);
            expect(m.$.a).to.equal(1);
            expect(m.$.b).to.equal(2);
            expect(m.$.c).to.equal(3);

            m.a = 5;
            m.b = 6;
            m.c = 7;

            expect(m.a).to.equal(5);
            expect(m.b).to.equal(6);
            expect(m.c).to.equal(7);
            expect(m.$.a).to.equal(1);
            expect(m.$.b).to.equal(2);
            expect(m.$.c).to.equal(3);

            m.sync(['a', 'c']);

            expect(m.a).to.equal(5);
            expect(m.b).to.equal(6);
            expect(m.c).to.equal(7);
            expect(m.$.a).to.equal(5);
            expect(m.$.b).to.equal(2);
            expect(m.$.c).to.equal(7);
        })

        it('should emit "sync" on sync', (done) => {
            let m = new Model();
            m.on('sync', () => {
                done();
            })

            m.sync();
        })

        it('should mutate attributes before sync if option is enabled', () => {
            let m = new class extends Model {
                mutations() {
                    return {
                        a: _.toString,
                    }
                }

            }({a: 1, b: 2}, null, {
                mutateBeforeSync: true,
                mutateOnChange: false,
            });

            expect(m.a).to.equal('1');
            expect(m.b).to.equal(2);

            m.a = 4;
            m.b = 5;

            expect(m.a).to.equal(4);
            expect(m.b).to.equal(5);
            expect(m.$.a).to.equal('1');
            expect(m.$.b).to.equal(2);

            m.sync();

            expect(m.a).to.equal('4');
            expect(m.b).to.equal(5);
            expect(m.$.a).to.equal('4');
            expect(m.$.b).to.equal(5);
        })

        it('should mutate specific attributes before sync if option is enabled', () => {
            let m = new class extends Model {
                mutations() {
                    return {
                        a: _.toString,
                        b: (v) => v * 10,
                    }
                }

            }({a: 1, b: 2}, null, {
                mutateBeforeSync: true,
                mutateOnChange: false,
            });

            expect(m.a).to.equal('1');
            expect(m.b).to.equal(20);

            m.a = 4;
            m.b = 5;

            expect(m.a).to.equal(4);
            expect(m.b).to.equal(5);
            expect(m.$.a).to.equal('1');
            expect(m.$.b).to.equal(20);

            m.sync('b');

            expect(m.a).to.equal(4);
            expect(m.b).to.equal(50);
            expect(m.$.a).to.equal('1');
            expect(m.$.b).to.equal(50);
        })

        it('should not mutate attributes before sync if option is disabled', () => {
            let m = new class extends Model {
                mutations() {
                    return {
                        a: _.toString,
                        b: _.toString,
                    }
                }

            }({a: 1, b: 2}, null, {
                mutateBeforeSync: false,
                mutateOnChange: false,
            });

            expect(m.a).to.equal(1);
            expect(m.b).to.equal(2);

            m.a = 4;
            m.b = 5;

            expect(m.a).to.equal(4);
            expect(m.b).to.equal(5);
            expect(m.$.a).to.equal(1);
            expect(m.$.b).to.equal(2);

            m.sync();

            expect(m.a).to.equal(4);
            expect(m.b).to.equal(5);
            expect(m.$.a).to.equal(4);
            expect(m.$.b).to.equal(5);
        })
    })

    describe('get errors', () => {
        it('should return errors', () => {
            let m = new Model();
            m._errors = {a: 1}
            expect(m.errors).to.deep.equal({a: 1});
        })
    })

    describe('set errors', () => {
        it('should set errors', () => {
            let m = new Model();
            m._errors = {a: 1};
            expect(m.errors).to.deep.equal({a: 1});
        })
    })

    describe('getURL', () => {
        it('should return basic route', () => {
            let M = class extends Model {
                routes() { return {'fetch': 'http://domain.com/path'} }
            }

            let m = new M();
            expect(m.getFetchURL()).to.equal('http://domain.com/path');
        })

        it('should return route with replaced parameters', () => {
            let M = class extends Model {
                routes() { return {'fetch': 'http://domain.com/{path}'} }
            }

            let m = new M({path: 'test'});
            expect(m.getFetchURL()).to.equal('http://domain.com/test');
        })

        it('should use the route resolver', () => {
            let M = class extends Model {
                routes() {
                    return {
                        'fetch': 'http://domain.com/:path'
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

            let m = new M({path: 'test'});
            expect(m.getFetchURL()).to.equal('http://domain.com/test');
        })

        it('should fail when a route key is not defined', () => {
            let m = new class extends Model {
                routes() { return {} }
            }

            try {
                m.getFetchURL();
            } catch (e) {
                return;
            }

            assert.fail();
        })

        it('should replace missing parameters with undefined', () => {
            let M = class extends Model {
                routes() { return {'fetch': 'http://domain.com/{path}'} }
            }

            let m = new M({a: 1});
            expect(m.getFetchURL()).to.equal('http://domain.com/undefined');
        })

        it('should render undefined parameters', () => {
            let M = class extends Model {
                routes() { return {'fetch': 'http://domain.com/{path}'} }
            }

            let m = new M({path: undefined});
            expect(m.getFetchURL()).to.equal('http://domain.com/undefined');
        })

        it('should render null parameters', () => {
            let M = class extends Model {
                routes() { return {'fetch': 'http://domain.com/{path}'} }
            }

            let m = new M({path: null});
            expect(m.getFetchURL()).to.equal('http://domain.com/null');
        })
    })

    describe('toJSON', () => {
        it('should convert attributes to json', () => {
            let m = new Model({a: 1});
            expect(JSON.stringify(m)).to.equal('{"a":1}');
        })

        it('should honour override', () => {
            let M = class extends Model { toJSON() { return {b: 2} }}
            let m = new M({a: 1});
            expect(JSON.stringify(m)).to.equal('{"b":2}');
        })
    })

    describe('registerCollection', () => {
        it('should register a collection', () => {
            let c = new Collection();
            let m = new Model();
            m.registerCollection(c);

            expect(m.collections).to.deep.equal([c]);
        })

        it('should register an array of collections', () => {
            let c1 = new Collection();
            let c2 = new Collection();
            let m  = new Model();

            m.registerCollection([c1, c2]);

            expect(m.collections).to.deep.equal([c1, c2]);
        })

        it('should quietly not allow registering the same collection twice', () => {
            let c = new Collection();
            let m = new Model();

            m.registerCollection(c);
            m.registerCollection(c);

            expect(m.collections).to.deep.equal([c]);
        })

        it('should fail if we pass a null collection', () => {
            let m = new Model();
            try {
                m.registerCollection(null);
            } catch (e) {
                return;
            }
            assert.fail();
        })

        it('should fail if we pass an undefined collection', () => {
            let m = new Model();
            try {
                m.registerCollection(undefined);
            } catch (e) {
                return;
            }
            assert.fail();
        })

        it('should fail when passing an object that is not a collection', () => {
            try {
                (new Model()).registerCollection({a: 1});
            } catch (e) {
                return;
            }
            assert.fail();
        })

        it('should fail when passing a non-object', () => {
            try {
                (new Model()).registerCollection(5);
            } catch (e) {
                return;
            }
            assert.fail();
        })
    })

    describe('unregisterCollection', () => {
        it('should not mind if a collection is not registered', () => {
            let c = new Collection();
            let m = new Model();

            m.unregisterCollection(c);
            expect(m.collections).to.deep.equal([]);
        })

        it('should fail if we pass a null collection', () => {
            let m = new Model();
            try {
                m.unregisterCollection(null);
            } catch (e) {
                return;
            }
            assert.fail();
        })

        it('should fail if we pass an undefined collection', () => {
            let m = new Model();
            try {
                m.unregisterCollection(undefined);
            } catch (e) {
                return;
            }
            assert.fail();
        })

        it('should support unregistering many of the same collection', () => {
            let c = new Collection();
            let m = new Model({}, c);

            m.unregisterCollection(c);
            m.unregisterCollection(c);

            expect(m.collections).to.deep.equal([]);
        })

        it('should unregister an array of collections', () => {
            let c1 = new Collection();
            let c2 = new Collection();
            let m  = new Model({}, [c1, c2]);

            m.unregisterCollection([c1, c2]);

            expect(m.collections).to.deep.equal([]);
        })

        it('should fail when passing an object that is not a collection', () => {
            try {
                (new Model()).unregisterCollection({a: 1});
            } catch (e) {
                return;
            }
            assert.fail();
        })

        it('should fail when passing a non-object', () => {
            try {
                (new Model()).unregisterCollection(5);
            } catch (e) {
                return;
            }
            assert.fail();
        })
    })

    describe('fetch', () => {

        it('should handle successful fetch with attributes return', (done) => {
            let M = class extends Model {
                defaults() { return {id: 1}}
                routes() { return {fetch: '/collection/fetch/{id}'}}
            }

            let m = new M({name: 'John'});

            moxios.withMock(() => {
                m.fetch().then((response) => {
                    expect(m.name).to.equal('Fred');
                    expect(m.$.name).to.equal('Fred');
                    done();
                })

                moxios.wait(() => {
                    let request = moxios.requests.mostRecent();

                    expect(request.url).to.equal('/collection/fetch/1');

                    request.respondWith({
                        status: 200,
                        response: {id: 1, name: 'Fred'}
                    })
                })
            })
        })

        it('should fail when receiving no data on success', (done) => {
            let M = class extends Model {
                defaults() { return {id: 1}}
                routes()   { return {fetch: '/collection/fetch/{id}'}}
            }

            let m = new M({name: 'John'});

            moxios.withMock(() => {
                m.fetch().catch().catch((error) => {
                    expect(error.message).to.equal('No data in fetch response');
                    done();
                })

                moxios.wait(() => {
                    moxios.requests.mostRecent().respondWith({
                        status: 200
                    })
                })
            })
        })

        it('should skip if already fetching', (done) => {
            let m = new class extends Model {
                routes() { return {fetch: '/collection/fetch/{id}'}}
            }

            m.loading = true;
            expectRequestToBeSkipped(m.fetch(), done);
        })

        it('should emit event on success', (done) => {
            let m = new class extends Model {
                defaults() { return {id: 5}}
                routes() { return {fetch: '/collection/fetch/{id}'}}
            }({name: 'John'});

            m.on('fetch', (event) => {
                expect(event.target.id).to.equal(5);
                expect(event.target.name).to.equal('Fred');
                expect(event.error).to.be.null;
                done();
            })

            moxios.withMock(() => {
                m.fetch();

                moxios.wait(() => {
                    moxios.requests.mostRecent().respondWith({
                        status: 200,
                        response: {
                            name: 'Fred',
                        }
                    })
                })
            })
        })

        it('should emit event on failure', (done) => {
            let M = class extends Model {
                defaults() { return {id: null}}
                routes() { return {fetch: '/collection/fetch/{id}'}}
            }

            let m = new M({id: 5, name: 'John'});

            m.on('fetch', (event) => {
                expect(event.target.name).to.equal('John');
                expect(event.target.id).to.equal(5);
                expect(event.error).to.not.be.null;
                done();
            })

            moxios.withMock(() => {
                m.fetch().catch((error) => {});

                moxios.wait(() => {
                    moxios.requests.mostRecent().respondWith({
                        status: 500
                    })
                })
            })
        })

        it('should use fetch route override', (done) => {
            let M = class extends Model {
                defaults() { return {id: null}}
                getFetchRoute() { return '/test/fetch/route/{id}'; }
            }

            let m = new M({id: 5});

            moxios.withMock(() => {
                m.fetch();

                moxios.wait(() => {
                    let request = moxios.requests.mostRecent();
                    expect(request.url).to.equal('/test/fetch/route/5');
                    done();
                })
            })
        })

        it('should use fetch headers override', (done) => {
            let m = new class extends Model {
                routes() { return {fetch: '/collection/fetch'}}
                getFetchHeaders() { return {test: 'yes'} }
            }

            moxios.withMock(() => {
                m.fetch();

                moxios.wait(() => {
                    let request = moxios.requests.mostRecent();
                    expect(request.headers.test).to.equal('yes');
                    done();
                })
            })
        })

        it('should use default headers override', (done) => {
            let m = new class extends Model {
                routes() { return {fetch: '/collection/fetch'}}
                getDefaultHeaders() { return {test: 'yes'} }
            }

            moxios.withMock(() => {
                m.fetch();

                moxios.wait(() => {
                    let request = moxios.requests.mostRecent();
                    expect(request.headers.test).to.equal('yes');
                    done();
                })
            })
        })

        it('should use default headers with fetch headers override', (done) => {
            let m = new class extends Model {
                routes() { return {fetch: '/collection/fetch'}}
                getDefaultHeaders() { return {test: 'yes'} }
                getFetchHeaders() { return {test: 'no'} }
            }

            moxios.withMock(() => {
                m.fetch();

                moxios.wait(() => {
                    let request = moxios.requests.mostRecent();
                    expect(request.headers.test).to.equal('no');
                    done();
                })
            })
        })

        it('should use fetch method override', (done) => {
            let M = class extends Model {
                defaults() { return {id: null}}
                routes() { return {fetch: '/collection/fetch/{id}'}}
                getFetchMethod() { return 'PATCH' }
            }

            let m = new M({id: 5, name: 'John'});

            moxios.withMock(() => {
                m.fetch();

                moxios.wait(() => {
                    let request = moxios.requests.mostRecent();
                    expect(request.config.method).to.equal('patch');
                    done();
                })
            })
        })

        it('should use fetch query parameters override', (done) => {
            let M = class extends Model {
                defaults() { return {id: null}}
                routes()   { return {fetch: '/collection/fetch/{id}'}}
                getFetchQuery() { return {a: 1} }
            }

            let m = new M({id: 5, name: 'John'});

            moxios.withMock(() => {
                m.fetch();

                moxios.wait(() => {
                    let request = moxios.requests.mostRecent();
                    expect(request.url).to.equal('/collection/fetch/5?a=1');
                    done();
                })
            })
        })

        it('should be fatal on error', (done) => {
            let m = new class extends Model {
                routes() { return {fetch: '/collection/fetch'}}
            }

            moxios.withMock(() => {
                m.fetch().catch((error) => {
                    expect(m.fatal).to.equal(true);
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
            let m = new class extends Model {
                routes() { return {fetch: '/collection/fetch'}}
            }

            moxios.withMock(() => {
                m.fetch().then((response) => {
                    expect(m.fatal).to.equal(false);
                    done();
                })

                moxios.wait(() => {
                    moxios.requests.mostRecent().respondWith({
                        status: 200,
                        response: {
                            a: 1
                        }
                    })
                })
            })
        })

        it('should set loading to true on fetch success', (done) => {
            let m = new class extends Model {
                routes() { return {fetch: '/collection/fetch'}}
            }

            moxios.withMock(() => {
                m.fetch().then(() => {
                    expect(m.loading).to.equal(false);
                    done();
                });
                expect(m.loading).to.equal(true);

                moxios.wait(() => {
                    moxios.requests.mostRecent().respondWith({
                        status: 200,
                        response: {a: 1},
                    });
                })
            })
        })

        it('should set loading to false on fetch failure', (done) => {
            let m = new class extends Model {
                routes() { return {fetch: '/collection/fetch'}}
            }

            moxios.withMock(() => {
                m.fetch().catch((error) => {
                    expect(m.loading).to.equal(false);
                    done();
                })

                moxios.wait(() => {
                    moxios.requests.mostRecent().respondWith({
                        status: 500
                    })
                })
            })
        })
    })

    describe('save', () => {
        it('should handle successful save with empty return', (done) => {
            let M = class extends Model {
                defaults() { return {a: 1, b: 2}}
                routes() { return {save: '/collection/save'}}
            }

            let m = new M();
            m.a = 10;
            m.b = 20;

            moxios.withMock(() => {
                expect(m.$.a).to.equal(1);
                expect(m.$.b).to.equal(2);

                m.save().then((response) => {
                    expect(m.$.a).to.equal(10);
                    expect(m.$.b).to.equal(20);
                    done();
                })

                moxios.wait(() => {
                    moxios.requests.mostRecent().respondWith({
                        status: 200,
                        response: {

                        }
                    })
                })
            })
        })

        it('should handle successful save with identifier return', (done) => {
            let M = class extends Model {
                defaults() { return {a: 1, b: 2}}
                routes() { return {save: '/collection/save'}}
            }

            let m = new M();
            m.a = 10;
            m.b = 20;

            moxios.withMock(() => {
                expect(m.$.a).to.equal(1);
                expect(m.$.b).to.equal(2);

                m.save().then((response) => {
                    expect(m.id).to.equal(5);
                    expect(m.$.id).to.equal(5);

                    expect(m.$.a).to.equal(10);
                    expect(m.$.b).to.equal(20);

                    done();
                })

                moxios.wait(() => {
                    moxios.requests.mostRecent().respondWith({
                        status: 200,
                        response: "5"
                    })
                })
            })
        })

        it('should handle successful save with custom identifier return', (done) => {
            let m = new class extends Model {
                defaults() { return {}}
                routes() { return {save: '/collection/save'}}
            }

            m.setOptions({
                identifier: 'name',
            })

            moxios.withMock(() => {
                m.save().then((response) => {
                    expect(m.name).to.equal('Test');
                    expect(m.$.name).to.equal('Test');
                    done();
                })

                moxios.wait(() => {
                    moxios.requests.mostRecent().respondWith({
                        status: 200,
                        response: 'Test'
                    })
                })
            })
        })

        it('should handle successful save with attributes return', (done) => {
            let m = new class extends Model {
                defaults() { return {}}
                routes() { return {save: '/collection/save'}}
            }

            moxios.withMock(() => {
                m.save().then((response) => {
                    expect(m.a).to.equal(1);
                    expect(m.$.a).to.equal(1);
                    done();
                })

                moxios.wait(() => {
                    moxios.requests.mostRecent().respondWith({
                        status: 200,
                        response: {
                            a: 1,
                        }
                    })
                })
            })
        })

        it('should handle successful save with attributes return overriding defaults', (done) => {
            let m = new class extends Model {
                defaults() { return {a: 1}}
                routes() { return {save: '/collection/save'}}
            }

            moxios.withMock(() => {
                m.save().then((response) => {
                    expect(m.a).to.equal(5);
                    expect(m.$.a).to.equal(5);
                    done();
                })

                moxios.wait(() => {
                    moxios.requests.mostRecent().respondWith({
                        status: 200,
                        response: {
                            a: 5,
                        }
                    })
                })
            })
        })

        it('should fail if unexpected data is returned in a response', (done) => {
            let m = new class extends Model {
                defaults() { return {a: 1}}
                routes() { return {save: '/collection/save'}}
                isValidIdentifier(identifier) {
                    expect(identifier).to.equal(5);
                    return false;
                }
            }

            moxios.withMock(() => {
                m.save().catch((error) => {
                    done();
                })

                moxios.wait(() => {
                    moxios.requests.mostRecent().respondWith({
                        status: 200,
                        response: "5"
                    })
                })
            })
        })

        it('should skip if already saving', (done) => {
            let m = new class extends Model {
                routes() { return {save: '/collection/save'}}
            }

            m.saving = true;
            expect(m.saving).to.equal(true);

            m.on('save', () => {
                throw 'Did not expect to handle save event';
            });

            expectRequestToBeSkipped(m.save(), done);
        })

        it('should emit event on failure', (done) => {
            let m = new class extends Model {
                routes() { return {save: '/collection/save'}}
            }

            m.on('save', () => {
                done();
            });

            moxios.withMock(() => {
                m.save().catch((error) => {

                });

                moxios.wait(() => {
                    moxios.requests.mostRecent().respondWith({
                        status: 500,
                    });
                })
            })
        })

        it('should use save route override', (done) => {
            let m = new class extends Model {
                defaults() { return {id: 5}}
                getSaveRoute() { return '/test/save/route/{id}'; }
            }

            moxios.withMock(() => {
                m.save();

                moxios.wait(() => {
                    let request = moxios.requests.mostRecent();
                    expect(request.url).to.equal('/test/save/route/5');
                    done();
                })
            })
        })

        it('should use save headers override', (done) => {
            let M = class extends Model {
                routes() { return {save: '/collection/save'}}
                getSaveHeaders() { return {test: 'yes'} }
            }

            let m = new M({id: 5});

            moxios.withMock(() => {
                m.save();

                moxios.wait(() => {
                    let request = moxios.requests.mostRecent();
                    expect(request.headers.test).to.equal('yes');
                    done();
                })
            })
        })

        it('should use default headers override', (done) => {
            let m = new class extends Model {
                routes() { return {save: '/collection/save'}}
                getDefaultHeaders() { return {test: 'yes'} }
            }

            moxios.withMock(() => {
                m.save();

                moxios.wait(() => {
                    let request = moxios.requests.mostRecent();
                    expect(request.headers.test).to.equal('yes');
                    done();
                })
            })
        })

        it('should use default headers with save headers override', (done) => {
            let m = new class extends Model {
                routes() { return {save: '/collection/save'}}
                getDefaultHeaders() { return {test: 'yes'} }
                getSaveHeaders()   { return {test: 'no'} }
            }

            moxios.withMock(() => {
                m.save();

                moxios.wait(() => {
                    let request = moxios.requests.mostRecent();
                    expect(request.headers.test).to.equal('no');
                    done();
                })
            })
        })

        it('should use save method override', (done) => {
            let m = new class extends Model {
                routes() { return {save: '/collection/save'}}
                getSaveMethod() { return 'OPTIONS' }
            }

            moxios.withMock(() => {
                m.save();

                moxios.wait(() => {
                    let request = moxios.requests.mostRecent();
                    expect(request.config.method).to.equal('options');
                    done();
                })
            })
        })

        it('should use save query parameters override', (done) => {
            let m = new class extends Model {
                routes() { return {save: '/collection/save'}}
                getSaveQuery() { return {a: 1} }
            }

            moxios.withMock(() => {
                m.save();

                moxios.wait(() => {
                    let request = moxios.requests.mostRecent();
                    expect(request.url).to.equal('/collection/save?a=1');
                    done();
                })
            })
        })

        it('should use model save data override', (done) => {
            let m = new class extends Model {
                routes() { return {save: '/collection/save'}}
                getSaveData() { return {a: 1} }
            }

            moxios.withMock(() => {
                m.save();

                moxios.wait(() => {
                    let request = moxios.requests.mostRecent();
                    expect(request.config.data).to.deep.equal('{"a":1}');
                    done();
                })
            })
        })

        it('should be fatal on fatal error', (done) => {
            let m = new class extends Model {
                routes() { return {save: '/collection/save'}}
            }

            moxios.withMock(() => {
                expect(m.fatal).to.equal(false);

                m.save().catch((error) => {
                    expect(m.fatal).to.equal(true);
                    done();
                });

                moxios.wait(() => {
                    moxios.requests.mostRecent().respondWith({
                        status: 500
                    });
                })
            })
        })

        it('should be non-fatal on success', (done) => {
            let m = new class extends Model {
                routes() { return {save: '/collection/save'}}
            }

            moxios.withMock(() => {
                expect(m.fatal).to.equal(false);

                m.save().then((response) => {
                    expect(m.fatal).to.equal(false);
                    done();
                });

                moxios.wait(() => {
                    moxios.requests.mostRecent().respondWith({
                        status: 200
                    });
                })
            })
        })

        it('should be non-fatal on non-fatal failure', (done) => {
            let m = new class extends Model {
                routes() { return {save: '/collection/save'}}
            }

            moxios.withMock(() => {
                expect(m.fatal).to.equal(false);

                m.save().catch((error) => {
                    expect(m.fatal).to.equal(false);
                    done();
                });

                moxios.wait(() => {
                    moxios.requests.mostRecent().respondWith({
                        status: 422,
                        response: {
                            errors: [],
                        }
                    });
                })
            })
        })

        it('should clear errors on success', (done) => {
            let m = new class extends Model {
                routes() { return {save: '/collection/save'}}
            }

            m.setErrors({a: 1});

            moxios.withMock(() => {
                m.save().then((response) => {
                    expect(m.errors).to.be.empty;
                    done();
                });

                moxios.wait(() => {
                    moxios.requests.mostRecent().respondWith({
                        status: 200
                    });
                })
            })
        })

        it('should clear errors on fatal failure', (done) => {
            let m = new class extends Model {
                routes() { return {save: '/collection/save'}}
            }

            m._errors = {a: 1}

            moxios.withMock(() => {
                expect(m.fatal).to.equal(false);

                m.save().catch((error) => {
                    expect(m.fatal).to.equal(true);
                    expect(m.errors).to.be.empty;
                    done();
                });

                moxios.wait(() => {
                    moxios.requests.mostRecent().respondWith({
                        status: 500
                    });
                })
            })
        })

        it('should set saving to true on save', (done) => {
            let m = new class extends Model {
                routes() { return {save: '/collection/save'}}
            }

            moxios.withMock(() => {

                expect(m.saving).to.equal(false);
                m.save().then((response) => {
                    done();
                });
                expect(m.saving).to.equal(true);

                moxios.wait(() => {
                    moxios.requests.mostRecent().respondWith({
                        status: 200
                    });
                })
            })
        })

        it('should set saving to false on save success', (done) => {
            let m = new class extends Model {
                routes() { return {save: '/collection/save'}}
            }

            moxios.withMock(() => {
                m.save().then((response) => {
                    expect(m.saving).to.equal(false);
                    done();
                });

                moxios.wait(() => {
                    moxios.requests.mostRecent().respondWith({
                        status: 200
                    });
                })
            })
        })

        it('should set saving to false on save failure', (done) => {
            let m = new class extends Model {
                routes() { return {save: '/collection/save'}}
            }

            moxios.withMock(() => {
                expect(m.saving).to.equal(false);

                m.save().catch((error) => {
                    expect(m.saving).to.equal(false);
                    done();
                });

                expect(m.saving).to.equal(true);

                moxios.wait(() => {
                    moxios.requests.mostRecent().respondWith({
                        status: 500
                    });
                })
            })
        })

        it('should add to all collections on create', (done) => {
            let m = new class extends Model {
                routes() { return {save: '/collection/save'}}
            }

            let c1 = new Collection();
            let c2 = new Collection();

            m.registerCollection(c1);
            m.registerCollection(c2);

            moxios.withMock(() => {
                m.save().then((response) => {
                    expect(c1.models[0]).to.equal(m);
                    expect(c2.models[0]).to.equal(m);
                    done();
                });

                moxios.wait(() => {
                    moxios.requests.mostRecent().respondWith({
                        status: 201,
                        response: {
                            id: 1
                        }
                    });
                })
            })
        })

        it('should use patch method if patching', (done) => {
            let m = new class extends Model {
                defaults() { return {id: 1, name: 'Fred'} }
                routes() { return {save: '/collection/save'} }
                getPatchMethod() { return 'OPTIONS'; }
                shouldPatch() { return true; }
            }

            m.name = 'John';

            moxios.withMock(() => {
                m.save();

                moxios.wait(() => {
                    let request = moxios.requests.mostRecent();
                    expect(request.config.method).to.equal('options');
                    done();
                })
            })
        })

        it('should use create method if creating', (done) => {
            let m = new class extends Model {
                getCreateMethod() { return 'OPTIONS'; }
                routes() { return {save: '/collection/save'}}
            }

            moxios.withMock(() => {
                m.save();

                moxios.wait(() => {
                    let request = moxios.requests.mostRecent();
                    expect(request.config.method).to.equal('options');
                    done();
                })
            })
        })

        it('should use changed attributes only when patching', (done) => {
            let m = new class extends Model {
                defaults() { return {id: 1, name: 'Fred'}}
                routes() { return {save: '/collection/save/{id}'}}
                shouldPatch() { return true; }
            }

            m.name = 'John';

            moxios.withMock(() => {
                m.save();

                moxios.wait(() => {
                    let request = moxios.requests.mostRecent();
                    expect(request.config.data).to.equal('{"name":"John"}');
                    done();
                })
            })
        })

        it('should be successful if no attributes have changed when option is enabled', (done) => {
            let m = new class extends Model {
                defaults() { return {id: 1, name: 'Fred'}}
                routes() { return {save: '/collection/save/{id}'}}
                options() { return {saveUnchanged: false} }
            }

            m.save().then((response) => {
                expect(response).to.be.null;
                done();
            })
        })

        it('should pass if no validation rules are configured', (done) => {
            let m = new Model();
            m.validate().then((errors) => {
                expect(errors).to.be.empty;
                expect(m.errors).to.be.empty;
                expect(m._errors).to.be.empty;
                done();
            })
        })

        it('should honour validation rules that return a promise', (done) => {
            let m = new class extends Model {
                defaults() { 
                    return {
                        a: null, 
                        b: null,
                        c: null,
                    }
                }
                routes() { 
                    return {
                        save: '/collection/save/{id}'
                    }
                }
                validation() {
                    return {
                        a: [
                            (value, attribute, model) => {
                                return new Promise((resolve, reject) => {
                                    setTimeout(() => resolve("A1"), 50);
                                });
                            },
                            () => {
                                return "A2";
                            },
                        ],
                        b: (value, attribute, model) => {
                            return new Promise((resolve, reject) => {
                                resolve("B");
                            });
                        },
                        c: (value, attribute, model) => {
                            return "C";
                        },
                    }
                }
            }

            m.validate().then((result) => {
                expect(result).to.deep.equal({
                    b: ['B'], 
                    c: ['C'], 
                    a: ['A1', 'A2'],
                });
                done();
            }); 
        })

        it('should pass if an attribute passes a validation rule', (done) => {
            let m = new class extends Model {
                defaults() { return {id: null}}
                routes() { return {save: '/collection/save/{id}'}}
                validation() {
                    return {
                        id: numeric,
                    }
                }
            }

            moxios.withMock(() => {
                m.id = 5;
                m.save().then((response) => {
                    expect(m.errors).to.be.empty;
                    done();
                });

                moxios.wait(() => {
                    moxios.requests.mostRecent().respondWith({
                        status: 200
                    });
                })
            })
        })

        it('should fail if an attribute does not pass a validation rule', (done) => {
            let m = new class extends Model {
                defaults() { return {id: 1}}
                routes() { return {save: '/collection/save/{id}'}}
                validation() {
                    return {
                        id: email,
                    }
                }
            }

            m.save().catch((error) => {
                expect(m.fatal).to.equal(false);
                expect(error).to.be.an.instanceof(ValidationError);

                expect(m.errors).to.deep.equal({id: ["Must be a valid email address"]});
                done();
            });
        })

        it('should fail if the model fails server-side validation', (done) => {
            let m = new class extends Model {
                defaults() { return {id: 1}}
                routes() { return {save: '/collection/save/{id}'}}
            }

            moxios.withMock(() => {
                m.save().catch((error) => {
                    expect(error.getResponse().getData()).to.deep.equal({ id: 'No good, sorry' });
                    done();
                });

                moxios.wait(() => {
                    moxios.requests.mostRecent().respondWith({
                        status: 422,
                        response: {
                            id: 'No good, sorry',
                        }
                    });
                })
            })
        })

        it('should throw if server-side validation response is bad', (done) => {
            let m = new class extends Model {
                defaults() { return {id: 1}}
                routes() { return {save: '/collection/save/{id}'}}
            }

            moxios.withMock(() => {
                m.save().catch((error) => {
                    expect(error.message).to.equal('Validation errors must be an object');
                    done();
                }).catch((error) => {
                    expect(error.message).to.equal('Validation errors must be an object');
                    done();
                });

                moxios.wait(() => {
                    moxios.requests.mostRecent().respondWith({
                        status: 422,
                        response: 5
                    });
                })
            })
        })

        it('should mutate on save if option is enabled', (done) => {
            let M = class extends Model {
                onSave() {
                    super.onSave();
                    expect(m.a).to.equal('5');
                    done();

                    return false;
                }

                options() {
                    return {
                        mutateBeforeSave: true,
                        mutateBeforeSync: false,
                        mutateOnChange: false,
                    }
                }

                mutations() {
                    return {
                        a: _.toString,
                    }
                }

                defaults() {
                    return {
                        a: 5,
                    }
                }
            }

            let m = new M();

            m.save();
        })

        it('should not mutate on save if option is disabled', () => {
            let m = new class extends Model {
                options() {
                    return {
                        mutateBeforeSave: false,
                        mutateBeforeSync: false,
                        mutateOnChange: false,
                    }
                }

                mutations() {
                    return {
                        a: _.toString,
                    }
                }

                defaults() {
                    return {
                        a: 5,
                    }
                }
            }

            expect(m.a).to.equal(5);
            m.on('save', () => {
                expect(m.a).to.equal(5);
                done();
                return false;
            });
        })
    })

    describe('delete', () => {
        it('should handle successful delete with empty return', (done) => {
            let m = new class extends Model {
                defaults() { return {id: 1}}
                routes() { return {delete: '/delete/{id}'}}
            }

            moxios.withMock(() => {
                m.delete().then((response) => {
                    done();
                })

                moxios.wait(() => {
                    moxios.requests.mostRecent().respondWith({
                        status: 200
                    })
                })
            })
        })

        it('should skip if already deleting', (done) => {
            let m = new class extends Model {
                routes() { return {delete: '/delete/{id}'}}
            }

            m.on('delete', () => {
                throw 'Did not expect to handle event'
            });

            m.deleting = true;
            expectRequestToBeSkipped(m.delete(), done);
        })

        it('should emit event on success', (done) => {
            let m = new class extends Model {
                defaults() { return {id: 1}}
                routes() { return {delete: '/delete/{id}'}}
            }

            m.on('delete', (event) => {
                expect(event.error).to.be.null;
                done();
            });

            moxios.withMock(() => {
                m.delete();

                moxios.wait(() => {
                    moxios.requests.mostRecent().respondWith({
                        status: 200
                    })
                })
            })
        })

        it('should emit event on failure', (done) => {
            let m = new class extends Model {
                defaults() { return {id: 1}}
                routes() { return {delete: '/delete/{id}'}}
            }

            m.on('delete', (event) => {
                expect(event.error).to.not.be.null;
                done();
            });

            moxios.withMock(() => {
                m.delete().catch((error) => {

                });

                moxios.wait(() => {
                    moxios.requests.mostRecent().respondWith({
                        status: 500
                    })
                })
            })
        })

        it('should use delete route override', (done) => {
            let m = new class extends Model {
                defaults() { return {id: 1}}
                getDeleteRoute() { return '/test/delete/route/{id}'; }
            }

            moxios.withMock(() => {
                m.delete();

                moxios.wait(() => {
                    let request = moxios.requests.mostRecent();
                    expect(request.url).to.equal('/test/delete/route/1');
                    done();
                })
            })
        })

        it('should use delete headers override', (done) => {
            let m = new class extends Model {
                routes() { return {delete: '/delete'}}
                getDeleteHeaders() { return {test: 'yes'} }
            }

            moxios.withMock(() => {
                m.delete();

                moxios.wait(() => {
                    let request = moxios.requests.mostRecent();
                    expect(request.headers.test).to.equal('yes');
                    done();
                })
            })
        })

        it('should use default headers override', (done) => {
            let m = new class extends Model {
                routes() { return {delete: '/delete'}}
                getDefaultHeaders() { return {test: 'yes'} }
            }

            moxios.withMock(() => {
                m.delete();

                moxios.wait(() => {
                    let request = moxios.requests.mostRecent();
                    expect(request.headers.test).to.equal('yes');
                    done();
                })
            })
        })

        it('should use default headers with delete headers override', (done) => {
            let m = new class extends Model {
                routes() { return {delete: '/delete'}}
                getDefaultHeaders() { return {test: 'yes'} }
                getDeleteHeaders() { return {test: 'no'} }
            }

            moxios.withMock(() => {
                m.delete();

                moxios.wait(() => {
                    let request = moxios.requests.mostRecent();
                    expect(request.headers.test).to.equal('no');
                    done();
                })
            })
        })

        it('should use delete method override', (done) => {
            let m = new class extends Model {
                defaults() { return {id: 1}}
                routes() { return {delete: '/delete/{id}'}}
                getDeleteMethod() { return 'PATCH' }
            }

            moxios.withMock(() => {
                m.delete();

                moxios.wait(() => {
                    let request = moxios.requests.mostRecent();
                    expect(request.config.method).to.equal('patch');
                    done();
                })
            })
        })

        it('should use delete query parameters override', (done) => {
            let m = new class extends Model {
                defaults() { return {id: 1}}
                routes()   { return {delete: '/delete/{id}'}}
                getDeleteQuery() { return {a: 1} }
            }

            moxios.withMock(() => {
                m.delete();

                moxios.wait(() => {
                    let request = moxios.requests.mostRecent();
                    expect(request.url).to.equal('/delete/1?a=1');
                    done();
                })
            })
        })

        it('should be fatal on fatal error', (done) => {
            let m = new class extends Model {
                routes() { return {delete: '/delete'}}
            }

            moxios.withMock(() => {
                expect(m.fatal).to.equal(false);
                m.delete().catch((error) => {
                    expect(m.fatal).to.equal(true);
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
            let m = new class extends Model {
                routes() { return {delete: '/delete'}}
            }

            moxios.withMock(() => {
                expect(m.fatal).to.equal(false);
                m.delete().then((response) => {
                    expect(m.fatal).to.equal(false);
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
            let m = new class extends Model {
                routes() { return {delete: '/delete'}}
            }

            moxios.withMock(() => {
                expect(m.deleting).to.equal(false);
                m.delete().then((response) => {
                    expect(m.deleting).to.equal(false);
                    done();
                })

                expect(m.deleting).to.equal(true);

                moxios.wait(() => {
                    moxios.requests.mostRecent().respondWith({
                        status: 200
                    })
                })
            })
        })

        it('should set deleting to false on delete success', (done) => {
            let m = new class extends Model {
                routes() { return {delete: '/delete'}}
            }

            moxios.withMock(() => {
                expect(m.deleting).to.equal(false);
                m.delete().then((response) => {
                    expect(m.deleting).to.equal(false);
                    done();
                })

                expect(m.deleting).to.equal(true);

                moxios.wait(() => {
                    moxios.requests.mostRecent().respondWith({
                        status: 200
                    })
                })
            })
        })

        it('should set deleting to false on delete failure', (done) => {
            let m = new class extends Model {
                routes() { return {delete: '/delete'}}
            }

            moxios.withMock(() => {
                expect(m.deleting).to.equal(false);
                m.delete().catch((error) => {
                    expect(m.deleting).to.equal(false);
                    done();
                })

                expect(m.deleting).to.equal(true);

                moxios.wait(() => {
                    moxios.requests.mostRecent().respondWith({
                        status: 500
                    })
                })
            })
        })

        it('should remove from all collections on delete', (done) => {
            let m = new class extends Model {
                routes() { return {delete: '/delete'}}
            }

            let c1 = new Collection();
            let c2 = new Collection();

            c1.add(m);
            c2.add(m);

            moxios.withMock(() => {
                expect(c1.models[0]).to.equal(m);
                expect(c2.models[0]).to.equal(m);

                m.delete().then(() => {
                    expect(c1.models).to.be.empty;
                    expect(c2.models).to.be.empty;
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

    describe('toJSON', () => {
        it('should return the model\'s attributes by default', () => {
            let m = new Model();
        })
    })
})
