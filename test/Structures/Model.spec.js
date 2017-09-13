import _ from 'lodash'
import axios from 'axios'
import moxios from 'moxios'
import Vue from "vue"
import {assert, expect} from 'chai'
import {Model, Collection} from '../../src/index.js'
import ValidationError  from '../../src/Errors/ValidationError.js'
import {
    boolean,
    email,
    equal,
    integer,
    min,
    numeric,
    required,
    string,
} from '../../src/Validation/Rules.js'


moxios.delay = 0;

/**
 * Unit tests for Model.js
 */
describe('Model', function() {

    describe('_uid', function() {
        it('should automatically generate unique incrementing ids', function() {
            let base = (new Model())._uid;

            expect((new Model())._uid).to.equal(_.toString(_.toSafeInteger(base) + 1));
            expect((new Model())._uid).to.equal(_.toString(_.toSafeInteger(base) + 2));
            expect((new Model())._uid).to.equal(_.toString(_.toSafeInteger(base) + 3));
        });
    })

    describe('$', function() {
        it('should return saved values', function() {
            let m = new Model({a: 1});
            m.a = 2;
            expect(m.$.a).to.equal(1);
        })
    })

    describe('errors', function() {
        it('should return errors', function() {
            let m = new Model();
            m.setErrors({a: 1});
            expect(m.errors).to.deep.equal({a: 1});
        })
    })

    describe('setOptions', function() {
        it('should merge recursively', function() {
            let m = new Model({}, null, {
                methods: {
                    patch: 'TEST',
                }
            });

            expect(m.option('methods.patch')).to.equal('TEST');
            expect(m.option('methods.fetch')).to.equal('GET');
        })

        it('should should merge with instance options', function() {
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

            expect(m.option('methods.patch')).to.equal('CONSTRUCTOR');
            expect(m.option('methods.update')).to.equal('INSTANCE');
            expect(m.option('methods.fetch')).to.equal('GET');
        })
    })

    describe('getClass', function() {
        it('should return the class name', function() {
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

    describe('on', function() {
        it('should register event listener', function() {
            let m = new Model();
            let f = () => {}
            m.on('test', f)

            expect(m._listeners).to.deep.equal({test: [f]});
        })
    })

    describe('emit', function() {
        it('should emit event to all listeners', function() {
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

            expect(m.emit('test')).to.equal(true);

            expect(count).to.equal(3);

            expect(calls.a).to.equal(true);
            expect(calls.b).to.equal(true);
            expect(calls.c).to.equal(true);
        })

        it('should not mind if we emit when no listeners exist', function() {
            let m = new Model();
            expect(m.emit('test')).to.equal(true);
        })

        it('should emit all events even if some are rejected', function() {
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

            expect(m.emit('test')).to.equal(false);

            expect(count).to.equal(3);

            expect(calls.a).to.equal(true);
            expect(calls.b).to.equal(true);
            expect(calls.c).to.equal(true);
        })
    })

    describe('saved', function() {
        it('should return saved values', function() {
            let m = new Model({a: 1});
            m.a = 2;
            expect(m.saved('a')).to.equal(1);
        })
    })

    describe('routes', function() {
        it('should fail when accessing a non-existing route', function() {
            try {
                (new Model()).save();
            } catch (e) {
                expect(e.message).to.equal('Invalid or missing route');
                return;
            }

            assert.fail();
        })
    })

    describe('changed', function() {
        it('should return top-level changed fields', function() {
            let m = new Model({a: 1, b: 2, c: 3});

            m.a = 6;
            expect(m.changed()).to.deep.equal(['a']);

            m.b = 7;
            expect(m.changed()).to.deep.equal(['a', 'b']);

            m.c = 8;
            expect(m.changed()).to.deep.equal(['a', 'b', 'c']);
        })

        it('should return nested changed fields', function() {
            let m = new Model({a: {b: 2, c: 3}});
            m.a.b = 5;
            expect(m.changed()).to.deep.equal(['a']);
        })

        it('should return false when there are no changed fields', function() {
            let m = new Model();
            expect(m.changed()).to.equal(false);
        })

        it('should return false after reset', function() {
            let m = new Model({a: 1});
            m.a = 2;
            m.reset();
            expect(m.changed()).to.equal(false);
        })
    })

    describe('clear', function() {
        it('should revert attributes back to defaults', function() {
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

    describe('clearErrors', function() {
        it('should clear all existing errors', function() {
            let m = new Model();
            m._errors = {a: 'error!'};
            m.clearErrors();
            expect(m.errors).to.deep.equal({});
        })
    })

    describe('constructor', function() {
        it('should support no params', function() {
            let m = new Model();
            expect(m.$).to.deep.equal({});
        })

        it('should support initial attributes', function() {
            let m = new Model({a: 1});
            expect(m.$).to.deep.equal({a: 1});
        })

        it('should support undefined initial attributes', function() {
            let m = new Model(undefined);
            expect(m.$).to.deep.equal({});
        })

        it('should support undefined initial attributes', function() {
            let m = new Model(null);
            expect(m.$).to.deep.equal({});
        })

        it('should support collection as initial register', function() {
            let c = new Collection();
            let m = new Model({}, c);
            expect(m.collections).to.deep.equal([c]);
        })

        it('should support an array of collections as initial register', function() {
            let c1 = new Collection();
            let c2 = new Collection();
            let m  = new Model({}, [c1, c2]);
            expect(m.collections).to.deep.equal([c1, c2]);
        })

        it('should support undefined collection as initial register', function() {
            let m = new Model({}, undefined);
            expect(m.collections).to.deep.equal([]);
        })

        it('should support null collection as initial register', function() {
            let m = new Model({}, null);
            expect(m.collections).to.deep.equal([]);
        })

        it('should support setting options', function() {
            let m = new Model(null, null, {loading: 5});
            expect(m.attributes).to.deep.equal({});
            expect(m.loading).to.equal(false);
            expect(m.option('loading')).to.equal(5);
        })

        it('should honour default options', function() {
            let m = new class extends Model {
                options() {
                    return {loading: 5}
                }
            }
            expect(m.loading).to.equal(false);
            expect(m.option('loading')).to.equal(5);
        })

        it('should override default options', function() {
            let M = class extends Model {
                options() {
                    return {loading: 5}
                }
            }

            let m = new M(null, null, {loading: 10});
            expect(m.loading).to.equal(false);
            expect(m.option('loading')).to.equal(10);
        })

        it('should allow arbitrary options', function() {
            let m = new Model(null, null, {a: 1});
            expect(m.option('a')).to.equal(1);
        })
    })

    describe('defaults', function() {
        it('should support default object', function() {
            let M = class extends Model { defaults() { return {a: 1, b: 2} }}
            let m = new M();
            expect(m.$).to.deep.equal({a: 1, b: 2});
        })

        it('should support undefined', function() {
            let M = class extends Model { defaults() {  }}
            let m = new M();
            expect(m.$).to.deep.equal({});
        })
    })

    describe('get', function() {
        it('should return undefined if attribute not found', function() {
            expect((new Model()).get('attr')).to.be.undefined;
        })

        it('should return value of attribute if found', function() {
            expect((new Model({a: 1})).get('a')).to.equal(1);
        })

        it('should return default if attribute not found', function() {
            expect((new Model()).get('b', 5)).to.equal(5);
        })

        it('should not return default if attribute was found', function() {
            expect((new Model({a: 1})).get('a', 5)).to.equal(1);
        })
    })

    describe('has', function() {
        it('should return true if a model has an attribute', function() {
            let m = new Model({a: 1});
            expect(m.has('a')).to.equal(true);
        })

        it('should return true if a model has an attribute that is undefined', function() {
            let m = new Model({a: undefined});
            expect(m.has('a')).to.equal(true);
        })

        it('should return false if a model does not have an attribute', function() {
            let m = new Model({a: 1});
            expect(m.has('b')).to.equal(false);
        })
    })

    describe('validate', function() {

        it('should validate a nested model', function() {
            let validated = false;

            let n = new class extends Model {
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

            let m = new Model({n});

            expect(m.validate()).to.equal(false);
            expect(m.errors).to.be.empty;
            expect(validated).to.equal(true);
            expect(n.errors).to.deep.equal({a: [
                'Must be a valid email address'
           ]});
        })

        it('should fail if a nested model fails its validation', function() {
            let A = class extends Model {
                validation() {
                    return {a: email}
                }
            }

            let m = new class extends Model {
                defaults() {
                    return {
                        a: new A({a: 5}),
                    }
                }
            }

            expect(m.validate()).to.equal(false);
        })

        it('should not validate a nested model if option is disabled', function() {
            let validated = false;

            let n = new class extends Model {
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

            let m = new Model({n});
            m.setOption('validateRecursively', false);

            expect(m.validate()).to.equal(true);
            expect(m.errors).to.be.empty;
            expect(validated).to.equal(false);
            expect(n.errors).to.be.empty;
        })

        it('should validate a single attribute', function() {
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
            expect(m.validate('a')).to.equal(false);
            expect(m.errors).to.deep.equal({a: ['Must be a valid email address']});
        })

        it('should validate a single attribute that passes', function() {
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
            expect(m.validate('b')).to.equal(true);
            expect(m.errors).to.deep.equal({});
        })

        it('should return true when validating an attribute that does not exist', function() {
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
            expect(m.validate('c')).to.equal(true);
            expect(m.errors).to.deep.equal({});
        })

        it('should validate an array of attributes', function() {
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
            expect(m.validate(['a', 'b'])).to.equal(false);
            expect(m.errors).to.deep.equal({
                a: ['Must be a valid email address'],
                b: ['Must be numeric'],
            });
        })

        it('should validate all attributes if none given', function() {
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
            expect(m.validate()).to.equal(false);
            expect(m.errors).to.deep.equal({
                a: ['Must be a valid email address'],
                b: ['Must be numeric'],
            });
        })

        it('should validate the docuementation example', function() {
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

            expect(task.validate()).to.equal(false);
            expect(task.errors).to.deep.equal({
                "name": [
                    "Required"
                ],
            });

            task.set({name: 'Example'});
            expect(task.validate()).to.equal(true);
            expect(task.errors).to.be.empty;
        })

        it('should pass the attribute name to the message context', function() {
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
            expect(m.validate()).to.equal(false);
            expect(m.errors).to.deep.equal({
                "name": [
                    "Can name be a string, please?"
                ],
            });
        })
    })

    describe('mutators', function() {
        it('should support an array of mutators', function() {
            let m = new class extends Model {
                mutators() {
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

    describe('set', function() {
        it('should set attribute if it does not already exist', function() {
            let m = new Model();
            m.set('a', 1);
            expect(m.a).to.equal(1);
            expect(m.$.a).to.be.undefined;
        })

        it('should overwrite attribute if it already exists', function() {
            let m = new Model({a: 1});
            m.set('a', 2);
            expect(m.a).to.equal(2);
            expect(m.$.a).to.equal(1);
        })

        it('should fail when trying to set reserved attribute name', function() {
            try {
                (new Model()).set('loading', 1);
            } catch (e) {
                return;
            }
            assert.fail();
        })

        it('should not mutate values if `mutateOnChange` is false', function() {
            let m = new class extends Model {
                mutators() {
                    return {
                        a: _.toString,
                    }
                }
            }({a: 1}, null, {mutateOnChange: false});

            m.set('a', 5);
            expect(m.a).to.equal(5);
        })

        it('should mutate values if a mutator is set', function() {
            let m = new class extends Model {
                mutators() {
                    return {
                        a: _.toString,
                    }
                }
            }({a: 1}, null, {mutateOnChange: true});

            m.set('a', 5);
            expect(m.a).to.equal('5');
        })

        it('should mutate values if multiple mutators are set', function() {
            let m = new class extends Model {
                mutators() {
                    return {
                        a: [(v) => (v * 2), _.toString],
                    }
                }
            }({a: 1}, null, {mutateOnChange: true});

            m.set('a', 5);
            expect(m.a).to.equal('10');
        })

        it('should emit a change event when a value has changed', function(done) {
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

        it('should emit a change event with the mutated value', function(done) {
            let m = new class extends Model {
                mutators() {
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

        it('should not emit a change event when a value has not changed', function() {
            let m = new class extends Model {
                mutators() {
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

        it('should validate an attribute on change if option is enabled', function(done) {
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
                setTimeout(function() {
                    expect(m.errors.a).to.deep.equal(['Must be a valid email address']);
                    done();
                }, 1);
            });

            m.set('a', 5);
        })

        it('should not validate an attribute on change if option disabled', function(done) {
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
                setTimeout(function() {
                    expect(m.a).to.equal(5);
                    expect(m.errors).to.be.empty;
                    done();
                }, 1);
            });

            m.set('a', 5);
        })
    })

    describe('unset', function() {
        it('should revert a value to its default value', function() {
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

        it('should not fail if the attribute does not exist', function() {
            let m = new Model();
            m.unset('a');
        })

        it('should revert a value to undefined if it does not have a default', function() {
            let m = new Model({a: 1});

            expect(m.a).to.equal(1);
            m.unset('a');
            expect(m.a).to.be.undefined;
        })

        it('should support unsetting a specific property', function() {
            let m = new Model({a: 1, b: 2});

            m.unset('a');
            expect(m.a).to.be.undefined;
            expect(m.b).to.equal(2);
        })

        it('should support unsetting an array of properties', function() {
            let m = new Model({a: 1, b: 2, c: 3});

            m.unset(['b', 'c']);
            expect(m.a).to.equal(1);
            expect(m.b).to.be.undefined;
            expect(m.c).to.be.undefined;
        })

        it('should revert all values to their default values', function() {
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

    describe('reset', function() {
        it('should reset attributes to the reference', function() {
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

        it('should not mind if there are no attributes', function() {
            let m = new Model();
            m.reset();
        })

        it('should not mind if already reset', function() {
            let m = new Model({a: 1, b: 2});
            m.a = 5;

            m.reset();
            m.reset();
        })

        it('should emit "reset" on reset', function(done) {
            let m = new Model();
            m.on('reset', () => {
                done();
            })

            m.reset();
        })

        it('should support resetting a specific property', function() {
            let m = new Model({a: 1, b: 2});
            m.a = 10;
            m.b = 20;

            m.reset('a');
            expect(m.a).to.equal(1);
            expect(m.b).to.equal(20);
        })

        it('should support resetting an array of properties', function() {
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

    describe('sync', function() {
        it('should sync attributes to the reference', function() {
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

        it('should sync a specific attribute', function() {
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

        it('should sync a an array of specific attributes', function() {
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

        it('should emit "sync" on sync', function(done) {
            let m = new Model();
            m.on('sync', () => {
                done();
            })

            m.sync();
        })

        it('should mutate attributes before sync if option is enabled', function() {
            let m = new class extends Model {
                mutators() {
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

        it('should mutate specific attributes before sync if option is enabled', function() {
            let m = new class extends Model {
                mutators() {
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

        it('should not mutate attributes before sync if option is disabled', function() {
            let m = new class extends Model {
                mutators() {
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

    describe('get errors', function() {
        it('should return errors', function() {
            let m = new Model();
            m._errors = {a: 1}
            expect(m.errors).to.deep.equal({a: 1});
        })
    })

    describe('set errors', function() {
        it('should set errors', function() {
            let m = new Model();
            m._errors = {a: 1};
            expect(m.errors).to.deep.equal({a: 1});
        })
    })

    describe('getURL', function() {
        it('should return basic route', function() {
            let M = class extends Model {
                routes() { return {'fetch': 'http://domain.com/path'} }
            }

            let m = new M();
            expect(m.getFetchURL()).to.equal('http://domain.com/path');
        })

        it('should return route with replaced parameters', function() {
            let M = class extends Model {
                routes() { return {'fetch': 'http://domain.com/{path}'} }
            }

            let m = new M({path: 'test'});
            expect(m.getFetchURL()).to.equal('http://domain.com/test');
        })

        it('should use the route resolver', function() {
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

        it('should fail when a route key is not defined', function() {
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

        it('should replace missing parameters with undefined', function() {
            let M = class extends Model {
                routes() { return {'fetch': 'http://domain.com/{path}'} }
            }

            let m = new M({a: 1});
            expect(m.getFetchURL()).to.equal('http://domain.com/undefined');
        })

        it('should render undefined parameters', function() {
            let M = class extends Model {
                routes() { return {'fetch': 'http://domain.com/{path}'} }
            }

            let m = new M({path: undefined});
            expect(m.getFetchURL()).to.equal('http://domain.com/undefined');
        })

        it('should render null parameters', function() {
            let M = class extends Model {
                routes() { return {'fetch': 'http://domain.com/{path}'} }
            }

            let m = new M({path: null});
            expect(m.getFetchURL()).to.equal('http://domain.com/null');
        })
    })

    describe('toJSON', function() {
        it('should convert attributes to json', function() {
            let m = new Model({a: 1});
            expect(JSON.stringify(m)).to.equal('{"a":1}');
        })

        it('should honour override', function() {
            let M = class extends Model { toJSON() { return {b: 2} }}
            let m = new M({a: 1});
            expect(JSON.stringify(m)).to.equal('{"b":2}');
        })
    })

    describe('registerCollection', function() {
        it('should register a collection', function() {
            let c = new Collection();
            let m = new Model();
            m.registerCollection(c);

            expect(m.collections).to.deep.equal([c]);
        })

        it('should register an array of collections', function() {
            let c1 = new Collection();
            let c2 = new Collection();
            let m  = new Model();

            m.registerCollection([c1, c2]);

            expect(m.collections).to.deep.equal([c1, c2]);
        })

        it('should quietly not allow registering the same collection twice', function() {
            let c = new Collection();
            let m = new Model();

            m.registerCollection(c);
            m.registerCollection(c);

            expect(m.collections).to.deep.equal([c]);
        })

        it('should fail if we pass a null collection', function() {
            let m = new Model();
            try {
                m.registerCollection(null);
            } catch (e) {
                return;
            }
            assert.fail();
        })

        it('should fail if we pass an undefined collection', function() {
            let m = new Model();
            try {
                m.registerCollection(undefined);
            } catch (e) {
                return;
            }
            assert.fail();
        })

        it('should fail when passing an object that is not a collection', function() {
            try {
                (new Model()).registerCollection({a: 1});
            } catch (e) {
                return;
            }
            assert.fail();
        })

        it('should fail when passing a non-object', function() {
            try {
                (new Model()).registerCollection(5);
            } catch (e) {
                return;
            }
            assert.fail();
        })
    })

    describe('unregisterCollection', function() {
        it('should not mind if a collection is not registered', function() {
            let c = new Collection();
            let m = new Model();

            m.unregisterCollection(c);
            expect(m.collections).to.deep.equal([]);
        })

        it('should fail if we pass a null collection', function() {
            let m = new Model();
            try {
                m.unregisterCollection(null);
            } catch (e) {
                return;
            }
            assert.fail();
        })

        it('should fail if we pass an undefined collection', function() {
            let m = new Model();
            try {
                m.unregisterCollection(undefined);
            } catch (e) {
                return;
            }
            assert.fail();
        })

        it('should support unregistering many of the same collection', function() {
            let c = new Collection();
            let m = new Model({}, c);

            m.unregisterCollection(c);
            m.unregisterCollection(c);

            expect(m.collections).to.deep.equal([]);
        })

        it('should unregister an array of collections', function() {
            let c1 = new Collection();
            let c2 = new Collection();
            let m  = new Model({}, [c1, c2]);

            m.unregisterCollection([c1, c2]);

            expect(m.collections).to.deep.equal([]);
        })

        it('should fail when passing an object that is not a collection', function() {
            try {
                (new Model()).unregisterCollection({a: 1});
            } catch (e) {
                return;
            }
            assert.fail();
        })

        it('should fail when passing a non-object', function() {
            try {
                (new Model()).unregisterCollection(5);
            } catch (e) {
                return;
            }
            assert.fail();
        })
    })

    describe('fetch', function() {

        it('should handle successful fetch with attributes return', function(done) {
            let M = class extends Model {
                defaults() { return {id: 1}}
                routes() { return {fetch: '/collection/fetch/{id}'}}
            }

            let m = new M({name: 'John'});

            moxios.withMock(() => {
                m.fetch((error, response) => {
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

        it('should fail when receiving no data on success', function(done) {
            let M = class extends Model {
                defaults() { return {id: 1}}
                routes()   { return {fetch: '/collection/fetch/{id}'}}
            }

            let m = new M({name: 'John'});

            moxios.withMock(() => {
                m.fetch((error, response) => {
                    expect(m.name).to.equal('John');
                    expect(m.$.name).to.equal('John');

                    expect(error.message).to.be.a.string;

                    done();
                })

                moxios.wait(() => {
                    moxios.requests.mostRecent().respondWith({
                        status: 200
                    })
                })
            })
        })

        it('should skip when already fetching', function(done) {
            let m = new class extends Model {
                routes() { return {fetch: '/collection/fetch/{id}'}}
            }

            m.loading = true;
            expect(m.loading).to.equal(true);

            m.on('fetch', () => {
                assert.fail('Did not expect to handle fetch event');
            });

            m.fetch({
                always: () => {
                    done();
                }
            })
        })

        it('should call "success" handler on success', function(done) {
            let M = class extends Model {
                defaults() { return {id: null}}
                routes() { return {fetch: '/collection/fetch'}}
            }

            let m = new M();

            moxios.withMock(() => {
                m.fetch({
                    success: () => {
                        expect(m.name).to.equal('Fred');
                        expect(m.$.name).to.equal('Fred');
                        done();
                    }
                })

                moxios.wait(() => {
                    moxios.requests.mostRecent().respondWith({
                        status: 200,
                        response: {id: 1, name: 'Fred'}
                    })
                })
            })
        })

        it('should call "always" handler on success', function(done) {
            let M = class extends Model {
                defaults() { return {id: null}}
                routes() { return {fetch: '/collection/fetch'}}
            }

            let m = new M();

            moxios.withMock(() => {
                m.fetch({
                    always: () => {
                        done();
                    }
                })

                moxios.wait(() => {
                    moxios.requests.mostRecent().respondWith({
                        status: 200,
                        response: {id: 1, name: 'Fred'}
                    })
                })
            })
        })

        it('should skip when the only "fetch" event returns false', function(done) {
            let M = class extends Model {
                defaults() { return {id: null}}
                routes() { return {fetch: '/collection/fetch/{id}'}}
            }

            let m = new M({id: 5, name: 'John'});

            m.on('fetch', () => {
                return false;
            })

            m.fetch({
                success: () => {
                    assert.fail('Did not expect to handle success');
                },
                always: () => {
                    done();
                }
            })
        })

        it('should skip when one of many "fetch" event returns false', function(done) {
            let M = class extends Model {
                defaults() { return {id: null}}
                routes() { return {fetch: '/collection/fetch/{id}'}}
            }

            let m = new M({id: 5, name: 'John'});

            let count = 0;

            m.on('fetch', () => {
                count++;
                return false;
            })

            m.on('fetch', () => {
                count++;
                // Should be called.
            })

            m.fetch({
                success: () => {
                    assert.fail('Did not expect to handle success');
                },
                always: () => {
                    expect(count).to.equal(2);
                    done();
                }
            })
        })

        it('should skip when the last of many "fetch" event returns false', function(done) {
            let M = class extends Model {
                defaults() { return {id: null}}
                routes() { return {fetch: '/collection/fetch/{id}'}}
            }

            let m = new M({id: 5, name: 'John'});

            m.on('fetch', () => {
                // Do nothing
            })

            m.on('fetch', () => {
                return false;
            })

            m.fetch({
                success: () => {
                    assert.fail('Did not expect to handle success');
                },
                always: () => {
                    done();
                }
            })
        })

        it('should emit "success" event on success', function(done) {
            let M = class extends Model {
                defaults() { return {id: null}}
                routes() { return {fetch: '/collection/fetch/{id}'}}
            }

            let m = new M({id: 5, name: 'John'});

            m.on('fetch.success', (e) => {
                expect(e.target.name).to.equal('Fred');
                expect(e.target.id).to.equal(1);
                done();
            });

            moxios.withMock(() => {
                m.fetch();

                moxios.wait(() => {
                    moxios.requests.mostRecent().respondWith({
                        status: 200,
                        response: {id: 1, name: 'Fred'}
                    })
                })
            })
        })

        it('should emit "always" event on success', function(done) {
            let M = class extends Model {
                defaults() { return {id: null}}
                routes() { return {fetch: '/collection/fetch/{id}'}}
            }

            let m = new M({id: 5, name: 'John'});

            m.on('fetch.always', (e) => {
                expect(e.target.name).to.equal('Fred');
                expect(e.target.id).to.equal(1);
                done();
            });

            moxios.withMock(() => {
                m.fetch();

                moxios.wait(() => {
                    moxios.requests.mostRecent().respondWith({
                        status: 200,
                        response: {id: 1, name: 'Fred'}
                    })
                })
            })
        })

        it('should call "failure" handler on failure', function(done) {
            let M = class extends Model {
                defaults() { return {id: null}}
                routes() { return {fetch: '/collection/fetch/{id}'}}
            }

            let m = new M({id: 5, name: 'John'});

            moxios.withMock(() => {
                m.fetch({
                    failure: () => {
                        expect(m.name).to.equal('John');
                        expect(m.id).to.equal(5);
                        done();
                    }
                })

                moxios.wait(() => {
                    moxios.requests.mostRecent().respondWith({
                        status: 500
                    })
                })
            })
        })

        it('should call "always" handler on failure', function(done) {
            let M = class extends Model {
                defaults() { return {id: null}}
                routes() { return {fetch: '/collection/fetch/{id}'}}
            }

            let m = new M({id: 5, name: 'John'});

            moxios.withMock(() => {
                m.fetch({
                    failure: () => {
                        expect(m.name).to.equal('John');
                        expect(m.id).to.equal(5);
                        done();
                    }
                })

                moxios.wait(() => {
                    moxios.requests.mostRecent().respondWith({
                        status: 500
                    })
                })
            })
        })

        it('should emit "failure" event on failure', function(done) {
            let M = class extends Model {
                defaults() { return {id: null}}
                routes() { return {fetch: '/collection/fetch/{id}'}}
            }

            let m = new M({id: 5, name: 'John'});

            m.on('fetch.failure', (e) => {
                    expect(e.target.name).to.equal('John');
                    expect(e.target.id).to.equal(5);
                    done();
                })

            moxios.withMock(() => {
                m.fetch();

                moxios.wait(() => {
                    moxios.requests.mostRecent().respondWith({
                        status: 500
                    })
                })
            })
        })

        it('should emit "always" event on failure', function(done) {
            let M = class extends Model {
                defaults() { return {id: null}}
                routes() { return {fetch: '/collection/fetch/{id}'}}
            }

            let m = new M({id: 5, name: 'John'});

            m.on('fetch.always', (e) => {
                expect(e.target.name).to.equal('John');
                expect(e.target.id).to.equal(5);
                done();
            })

            moxios.withMock(() => {
                m.fetch();

                moxios.wait(() => {
                    moxios.requests.mostRecent().respondWith({
                        status: 500
                    })
                })
            })
        })

        it('should use fetch route override', function(done) {
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

        it('should use fetch headers override', function(done) {
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

        it('should use default headers override', function(done) {
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

        it('should use default headers with fetch headers override', function(done) {
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

        it('should use fetch method override', function(done) {
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

        it('should use fetch query parameters override', function(done) {
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

        it('should call default handler on success', function(done) {
            let m = new class extends Model {
                defaults() { return {id: null}}
                routes() { return {fetch: '/collection/fetch'}}
            }

            moxios.withMock(() => {
                m.fetch((error, response) => {
                    expect(error).to.be.null;
                    expect(m.name).to.equal('Fred');
                    expect(m.$.name).to.equal('Fred');
                    done();
                })

                moxios.wait(() => {
                    moxios.requests.mostRecent().respondWith({
                        status: 200,
                        response: {id: 1, name: 'Fred'}
                    })
                })
            })
        })

        it('should call default handler on failure', function(done) {
            let m = new class extends Model {
                defaults() { return {id: null}}
                routes() { return {fetch: '/collection/fetch'}}
            }

            moxios.withMock(() => {
                m.fetch((error, response) => {
                    expect(m.id).to.be.null;
                    expect(m.$.id).to.be.null;
                    expect(error).to.not.be.null;
                    done();
                })

                moxios.wait(() => {
                    moxios.requests.mostRecent().respondWith({
                        status: 500,
                    })
                })
            })
        })

        it('should be fatal on error', function(done) {
            let m = new class extends Model {
                routes() { return {fetch: '/collection/fetch'}}
            }

            moxios.withMock(() => {
                m.fetch(() => {
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

        it('should be non-fatal on success', function(done) {
            let m = new class extends Model {
                routes() { return {fetch: '/collection/fetch'}}
            }

            moxios.withMock(() => {
                m.fetch(() => {
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

        it('should set loading to true on fetch', function(done) {
            let m = new class extends Model {
                routes() { return {fetch: '/collection/fetch'}}
            }

            moxios.withMock(() => {
                m.fetch();
                expect(m.loading).to.equal(true);

                moxios.wait(() => {
                    moxios.requests.mostRecent().respondWith({
                        status: 200

                    }).then(() => {
                        done();
                    });
                })
            })
        })

        it('should set loading to false on fetch success', function(done) {
            let m = new class extends Model {
                routes() { return {fetch: '/collection/fetch'}}
            }

            moxios.withMock(() => {
                m.fetch(() => {
                    expect(m.loading).to.equal(false);
                    done();
                })

                moxios.wait(() => {
                    moxios.requests.mostRecent().respondWith({
                        status: 200
                    })
                })
            })
        })

        it('should set loading to false on fetch failure', function(done) {
            let m = new class extends Model {
                routes() { return {fetch: '/collection/fetch'}}
            }

            moxios.withMock(() => {
                m.fetch(() => {
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

    describe('save', function() {
        it('should handle successful save with empty return', function(done) {
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

                m.save((error, response) => {
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

        it('should handle successful save with identifier return', function(done) {
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

                m.save((error, response) => {
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

        it('should handle successful save with custom identifier return', function(done) {
            let m = new class extends Model {
                defaults() { return {}}
                routes() { return {save: '/collection/save'}}
            }

            m.setOptions({
                identifier: 'name',
            })

            moxios.withMock(() => {
                m.save((error, response) => {
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

        it('should handle successful save with attributes return', function(done) {
            let m = new class extends Model {
                defaults() { return {}}
                routes() { return {save: '/collection/save'}}
            }

            moxios.withMock(() => {
                m.save((error, response) => {
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

        it('should handle successful save with attributes return overriding defaults', function(done) {
            let m = new class extends Model {
                defaults() { return {a: 1}}
                routes() { return {save: '/collection/save'}}
            }

            moxios.withMock(() => {
                m.save((error, response) => {
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

        it('should fail if unexpected data is returned in a response', function(done) {
            let m = new class extends Model {
                defaults() { return {a: 1}}
                routes() { return {save: '/collection/save'}}
                isValidIdentifier(identifier) {
                    expect(identifier).to.equal(5);
                    return false;
                }
            }

            moxios.withMock(() => {
                m.save({
                    failure: (error, response) => {
                        done();
                    }
                })

                moxios.wait(() => {
                    moxios.requests.mostRecent().respondWith({
                        status: 200,
                        response: "5"
                    })
                })
            })
        })

        it('should skip when already saving', function(done) {
            let m = new class extends Model {
                routes() { return {save: '/collection/save'}}
            }

            m.saving = true;
            expect(m.saving).to.equal(true);

            m.on('save', () => {
                assert.fail('Did not expect to handle save event');
            });

            m.save({
                always: (error, response) => {
                    expect(error).to.be.null;
                    expect(response).to.be.null;
                    done();
                }
            })
        })

        it('should call "success" handler on success', function(done) {
            let m = new class extends Model {
                routes() { return {save: '/collection/save'}}
            }

            moxios.withMock(() => {
                m.save({
                    success: (response) => {
                        expect(response).to.not.be.null;
                        done();
                    }
                })

                moxios.wait(() => {
                    moxios.requests.mostRecent().respondWith({
                        status: 200,
                    })
                })
            })
        })

        it('should call "always" handler on success', function(done) {
            let m = new class extends Model {
                routes() { return {save: '/collection/save'}}
            }

            moxios.withMock(() => {
                m.save({
                    always: (error, response) => {
                        expect(error).to.be.null;
                        expect(response).to.not.be.null;
                        done();
                    }
                })

                moxios.wait(() => {
                    moxios.requests.mostRecent().respondWith({
                        status: 200,
                    })
                })
            })
        })

        it('should skip when the only "save" event returns false', function(done) {
            let m = new class extends Model {
                routes() { return {save: '/collection/save'}}
            }

            m.on('save', () => {
                return false;
            })

            m.save({
                success: (response) => {
                    assert.fail('Did not expect success handler to be called');
                },
                failure: (response) => {
                    assert.fail('Did not expect failure handler to be called');
                },
                always: (error, response) => {
                    expect(error).to.be.be.null;
                    expect(response).to.be.null;
                    done();
                }
            })
        })

        it('should skip when one of many "save" event returns false', function(done) {
            let m = new class extends Model {
                routes() { return {save: '/collection/save'}}
            }

            let count = 0;

            m.on('save', () => {
                count++;
                return false; // <--
            })

            m.on('save', () => {
                count++;
            })

            m.save({
                success: (response) => {
                    assert.fail('Did not expect success handler to be called');
                },
                failure: (response) => {
                    assert.fail('Did not expect failure handler to be called');
                },
                always: (error, response) => {
                    expect(count).to.equal(2);
                    expect(error).to.be.null;
                    expect(response).to.be.null;
                    done();
                }
            })
        })

        it('should skip when the last of many "save" event returns false', function(done) {
            let m = new class extends Model {
                routes() { return {save: '/collection/save'}}
            }

            let count = 0;

            m.on('save', () => {
                count++;
            })

            m.on('save', () => {
                count++;
                return false; // <--
            })

            m.save({
                success: (response) => {
                    assert.fail('Did not expect success handler to be called');
                },
                failure: (response) => {
                    assert.fail('Did not expect failure handler to be called');
                },
                always: (error, response) => {
                    expect(count).to.equal(2);
                    expect(error).to.be.null;
                    expect(response).to.be.null;
                    done();
                }
            })
        })

        it('should emit "success" event on success', function(done) {
            let m = new class extends Model {
                routes() { return {save: '/collection/save'}}
            }

            m.on('save.success', () => {
                done();
            })

            moxios.withMock(() => {
                m.save()

                moxios.wait(() => {
                    moxios.requests.mostRecent().respondWith({
                        status: 200,
                    })
                })
            })
        })

        it('should emit "always" event on success', function(done) {
            let m = new class extends Model {
                routes() { return {save: '/collection/save'}}
            }

            m.on('save.always', () => {
                done();
            })

            moxios.withMock(() => {
                m.save();

                moxios.wait(() => {
                    moxios.requests.mostRecent().respondWith({
                        status: 200,
                    })
                })
            })
        })

        it('should call default handler on success', function(done) {
            let m = new class extends Model {
                routes() { return {save: '/collection/save'}}
            }

            moxios.withMock(() => {
                m.save((error, response) => {
                    expect(error).to.be.null;
                    expect(response).to.not.be.null;
                    done();
                })

                moxios.wait(() => {
                    moxios.requests.mostRecent().respondWith({
                        status: 200,
                    })
                })
            })
        })

        it('should call default handler on failure', function(done) {
            let m = new class extends Model {
                routes() { return {save: '/collection/save'}}
            }

            moxios.withMock(() => {
                m.save((error, response) => {
                    expect(error).to.not.be.null;
                    expect(response).to.not.be.null;
                    done();
                })

                moxios.wait(() => {
                    moxios.requests.mostRecent().respondWith({
                        status: 500,
                    })
                })
            })
        })

        it('should call "failure" handler on failure', function(done) {
            let m = new class extends Model {
                routes() { return {save: '/collection/save'}}
            }

            moxios.withMock(() => {
                m.save({
                    failure: (error, response) => {
                        expect(error).to.not.be.null;
                        expect(response).to.not.be.null;
                        done();
                    },
                })

                moxios.wait(() => {
                    moxios.requests.mostRecent().respondWith({
                        status: 500,
                    })
                })
            })
        })

        it('should call "always" handler on failure', function(done) {
            let m = new class extends Model {
                routes() { return {save: '/collection/save'}}
            }

            moxios.withMock(() => {
                m.save({
                    always: (error, response) => {
                        expect(error).to.not.be.null;
                        expect(response).to.not.be.null;
                        done();
                    },
                })

                moxios.wait(() => {
                    moxios.requests.mostRecent().respondWith({
                        status: 500,
                    })
                })
            })
        })

        it('should emit "failure" event on failure', function(done) {
            let m = new class extends Model {
                routes() { return {save: '/collection/save'}}
            }

            m.on('save.failure', () => {
                done();
            });

            moxios.withMock(() => {
                m.save();

                moxios.wait(() => {
                    moxios.requests.mostRecent().respondWith({
                        status: 500,
                    });
                })
            })
        })

        it('should emit "always" event on failure', function(done) {
            let m = new class extends Model {
                routes() { return {save: '/collection/save'}}
            }

            m.on('save.always', () => {
                done();
            });

            moxios.withMock(() => {
                m.save();

                moxios.wait(() => {
                    moxios.requests.mostRecent().respondWith({
                        status: 500,
                    });
                })
            })
        })

        it('should use save route override', function(done) {
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

        it('should use save headers override', function(done) {
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

        it('should use default headers override', function(done) {
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

        it('should use default headers with save headers override', function(done) {
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

        it('should use save method override', function(done) {
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

        it('should use save query parameters override', function(done) {
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

        it('should use model save data override', function(done) {
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

        it('should emit create event when created', function(done) {
            let m = new class extends Model {
                routes() { return {save: '/collection/save'}}
            }

            m.on('create', () => {
                done();
            });

            moxios.withMock(() => {
                m.save();

                moxios.wait(() => {
                    moxios.requests.mostRecent().respondWith({
                        status: 201,
                        response: {
                            a: 1
                        }
                    });
                })
            })
        })

        it('should honour was created override', function(done) {
            let m = new class extends Model {
                routes() { return {save: '/collection/save'}}
                wasCreated(response) {
                    expect(response).to.not.be.null;
                    return true;
                }
            }

            m.on('create', () => {
                done();
            });

            moxios.withMock(() => {
                m.save();

                moxios.wait(() => {
                    moxios.requests.mostRecent().respondWith({
                        status: 200
                    });
                })
            })
        })

        it('should be created if identifier in data is new', function(done) {
            let m = new class extends Model {
                routes() { return {save: '/collection/save'}}
            }

            m.on('create', () => {
                done();
            });

            moxios.withMock(() => {
                m.save();

                moxios.wait(() => {
                    moxios.requests.mostRecent().respondWith({
                        status: 200,
                        response: {
                            id: 1
                        }
                    });
                })
            })
        })

        it('should not be created if identifier in data is already present', function(done) {
            let m = new class extends Model {
                routes() { return {save: '/collection/save'}}
            }

            m.id = 1;

            m.on('create', () => {
                assert.fail();
            });

            m.on('save.success', () => {
                done();
            });

            m.on('save.failure', (e) => {
                done();
            });

            moxios.withMock(() => {
                m.save();

                moxios.wait(() => {
                    moxios.requests.mostRecent().respondWith({
                        status: 200,
                        response: {
                            id: 1
                        }
                    });
                })
            })
        })

        it('should not be created if it was a new model with an empty response', function(done) {
            let m = new class extends Model {
                routes() { return {save: '/collection/save'}}
            }

            m.on('create', () => {
                assert.fail();
            });

           m.on('save.success', () => {
                done();
            });

            moxios.withMock(() => {
                m.save();

                moxios.wait(() => {
                    moxios.requests.mostRecent().respondWith({
                        status: 200
                    });
                })
            })
        })

        it('should emit save events when created', function(done) {
            let m = new class extends Model {
                routes() { return {save: '/collection/save'}}
            }

            let count = 0;

            m.on('create', () => {
                count++;
            });

            m.on('save.success', () => {
                count++;
            })

            m.on('save.always', () => {
                expect(count).to.equal(2);
                done();
            })

            moxios.withMock(() => {
                m.save();

                moxios.wait(() => {
                    moxios.requests.mostRecent().respondWith({
                        status: 200,
                        response: {
                            id: 1
                        }
                    });
                })
            })
        })

        it('should call update event when updated', function(done) {
            let m = new class extends Model {
                defaults() { return {a: 1} }
                routes() { return {save: '/collection/save'}}
            }

            m.on('update', () => {
                done();
            });

            moxios.withMock(() => {
                m.save();

                moxios.wait(() => {
                    moxios.requests.mostRecent().respondWith({
                        status: 200,
                        response: {
                            a: 2
                        }
                    });
                })
            })
        })

        it('should emit save events when updated', function(done) {
            let m = new class extends Model {
                defaults() { return {a: 1} }
                routes() { return {save: '/collection/save'}}
            }

            let count = 0;

            m.on('update', () => {
                count++;
            });

            m.on('save.success', () => {
                count++;
            })

            m.on('save.always', () => {
                expect(count).to.equal(2);
                done();
            })

            moxios.withMock(() => {
                m.save();

                moxios.wait(() => {
                    moxios.requests.mostRecent().respondWith({
                        status: 200,
                        response: {
                            a: 2
                        }
                    });
                })
            })
        })

        it('should be fatal on fatal error', function(done) {
            let m = new class extends Model {
                routes() { return {save: '/collection/save'}}
            }

            moxios.withMock(() => {
                expect(m.fatal).to.equal(false);

                m.save(() => {
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

        it('should be non-fatal on success', function(done) {
            let m = new class extends Model {
                routes() { return {save: '/collection/save'}}
            }

            moxios.withMock(() => {
                expect(m.fatal).to.equal(false);

                m.save(() => {
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

        it('should be non-fatal on non-fatal failure', function(done) {
            let m = new class extends Model {
                routes() { return {save: '/collection/save'}}
            }

            moxios.withMock(() => {

                m.on('save.success', () => {
                    assert.fail();
                })

                expect(m.fatal).to.equal(false);

                m.save((error, response) => {
                    expect(error).to.not.be.null
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

        it('should clear errors on success', function(done) {
            let m = new class extends Model {
                routes() { return {save: '/collection/save'}}
            }

            m._errors = {a: 1}

            moxios.withMock(() => {
                m.save((error, response) => {
                    expect(m.errors).to.deep.equals({});
                    done();
                });

                moxios.wait(() => {
                    moxios.requests.mostRecent().respondWith({
                        status: 200
                    });
                })
            })
        })

        it('should clear errors on fatal failure', function(done) {
            let m = new class extends Model {
                routes() { return {save: '/collection/save'}}
            }

            m._errors = {a: 1}

            moxios.withMock(() => {
                expect(m.fatal).to.equal(false);

                m.save(() => {
                    expect(m.fatal).to.equal(true);
                    expect(m.errors).to.deep.equals({});
                    done();
                });

                moxios.wait(() => {
                    moxios.requests.mostRecent().respondWith({
                        status: 500
                    });
                })
            })
        })

        it('should set saving to true on save', function(done) {
            let m = new class extends Model {
                routes() { return {save: '/collection/save'}}
            }

            moxios.withMock(() => {

                expect(m.saving).to.equal(false);
                m.save(() => {
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

        it('should set saving to false on save success', function(done) {
            let m = new class extends Model {
                routes() { return {save: '/collection/save'}}
            }

            moxios.withMock(() => {
                m.save({
                    success: () => {
                       expect(m.saving).to.equal(false);
                    done();
                    }
                });

                moxios.wait(() => {
                    moxios.requests.mostRecent().respondWith({
                        status: 200
                    });
                })
            })
        })

        it('should set saving to false on save failure', function(done) {
            let m = new class extends Model {
                routes() { return {save: '/collection/save'}}
            }

            moxios.withMock(() => {
                expect(m.saving).to.equal(false);

                m.save((error, response) => {
                    expect(error).to.not.be.null;
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

        it('should add to all collections on create', function(done) {
            let m = new class extends Model {
                routes() { return {save: '/collection/save'}}
            }

            let c1 = new Collection();
            let c2 = new Collection();

            m.registerCollection(c1);
            m.registerCollection(c2);

            moxios.withMock(() => {
                m.save(() => {
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

        it('should use patch method if patching', function(done) {
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

        it('should use create method if creating', function(done) {
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

        it('should use changed attributes only when patching', function(done) {
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

        it('should skip patch if no attributes have changed', function(done) {
            let m = new class extends Model {
                defaults() { return {id: 1, name: 'Fred'}}
                routes() { return {save: '/collection/save/{id}'}}
                options() { return {patch: true} }
            }

            m.save((error, response) => {
                expect(error).to.be.null;
                expect(response).to.be.null;
                done();
            });
        })

        it('should pass if no validation rules are configured', function() {
            let m = new Model();
            expect(m.validate()).to.equal(true);
            expect(m.errors).to.be.empty;
        })

        it('should pass if an attribute passes a validation rule', function(done) {
            let m = new class extends Model {
                defaults() { return {id: 1}}
                routes() { return {save: '/collection/save/{id}'}}
                validation() {
                    return {
                        id: numeric,
                    }
                }
            }

            moxios.withMock(() => {
                m.save((error, response) => {
                    expect(error).to.be.null;
                    expect(response).to.not.be.null;

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

        it('should fail if an attribute does not pass a validation rule', function(done) {
            let m = new class extends Model {
                defaults() { return {id: 1}}
                routes() { return {save: '/collection/save/{id}'}}
                validation() {
                    return {
                        id: email,
                    }
                }
            }

            m.save((error, response) => {
                expect(error).to.not.be.null;
                expect(response).to.be.null;
                expect(m.fatal).to.equal(false);
                expect(error).to.be.an.instanceof(ValidationError);

                expect(m.errors).to.deep.equal({id: ["Must be a valid email address"]});
                done();
            });
        })

        it('should mutate on save if option is enabled', function(done) {
            let m = new class extends Model {
                options() {
                    return {
                        mutateBeforeSave: true,
                        mutateBeforeSync: false,
                        mutateOnChange: false,
                    }
                }

                mutators() {
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
                expect(m.a).to.equal('5');
                done();
                return false;
            });

            m.save();
        })

        it('should not mutate on save if option is disabled', function() {
            let m = new class extends Model {
                options() {
                    return {
                        mutateBeforeSave: false,
                        mutateBeforeSync: false,
                        mutateOnChange: false,
                    }
                }

                mutators() {
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

    describe('delete', function() {
        it('should handle successful delete with empty return', function(done) {
            let m = new class extends Model {
                defaults() { return {id: 1}}
                routes() { return {delete: '/delete/{id}'}}
            }

            moxios.withMock(() => {
                m.delete({
                    success: (response) => {
                        done();
                    }
                })

                moxios.wait(() => {
                    moxios.requests.mostRecent().respondWith({
                        status: 200
                    })
                })
            })
        })

        it('should skip when already deleting', function(done) {
            let m = new class extends Model {
                routes() { return {delete: '/delete/{id}'}}
            }

            m.deleting = true;

            m.on('delete', () => {
                assert.fail('Did not expect to handle delete event');
            });

            m.delete({
                always: () => {
                    done();
                }
            })
        })

        it('should skip when the only "delete" event returns false', function(done) {
            let m = new class extends Model {
                defaults() { return {id: 1}}
                routes() { return {delete: '/delete/{id}'}}
            }

            m.on('delete', () => {
                return false;
            })

            m.delete({
                success: () => {
                    assert.fail('Did not expect to handle success');
                },
                always: () => {
                    done();
                }
            })
        })

        it('should skip when one of many "delete" event returns false', function(done) {
            let m = new class extends Model {
                defaults() { return {id: 1}}
                routes() { return {delete: '/delete/{id}'}}
            }

            let count = 0;

            m.on('delete', () => {
                count++;
                return false;
            })

            m.on('delete', () => {
                count++;
                // Should be called.
            })

            m.delete({
                success: () => {
                    assert.fail('Did not expect to handle success');
                },
                always: () => {
                    expect(count).to.equal(2);
                    done();
                }
            })
        })

        it('should skip when the last of many "delete" event returns false', function(done) {
            let m = new class extends Model {
                defaults() { return {id: 1}}
                routes() { return {delete: '/delete/{id}'}}
            }

            m.on('delete', () => {
                // Do nothing
            })

            m.on('delete', () => {
                return false;
            })

            m.delete({
                success: () => {
                    assert.fail('Did not expect to handle success');
                },
                always: () => {
                    done();
                }
            })
        })

        it('should emit "success" event on success', function(done) {
            let m = new class extends Model {
                defaults() { return {id: 1}}
                routes() { return {delete: '/delete/{id}'}}
            }

            m.on('delete.success', () => {
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

        it('should emit "always" event on success', function(done) {
            let m = new class extends Model {
                defaults() { return {id: 1}}
                routes() { return {delete: '/delete/{id}'}}
            }

            m.on('delete.always', () => {
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

        it('should emit "failure" event on failure', function(done) {
            let m = new class extends Model {
                defaults() { return {id: 1}}
                routes() { return {delete: '/delete/{id}'}}
            }

            m.on('delete.failure', (error, response) => {
                expect(error).to.not.be.null;
                expect(response).to.not.be.null;
                done();
            });

            moxios.withMock(() => {
                m.delete();

                moxios.wait(() => {
                    moxios.requests.mostRecent().respondWith({
                        status: 500
                    })
                })
            })
        })

        it('should emit "always" event on failure', function(done) {
            let m = new class extends Model {
                defaults() { return {id: 1}}
                routes() { return {delete: '/delete/{id}'}}
            }

            m.on('delete.always', (error, response) => {
                expect(error).to.not.be.null;
                expect(response).to.not.be.null;
                done();
            });

            moxios.withMock(() => {
                m.delete();

                moxios.wait(() => {
                    moxios.requests.mostRecent().respondWith({
                        status: 500
                    })
                })
            })
        })

        it('should call "success" handler on success', function(done) {
            let m = new class extends Model {
                defaults() { return {id: 1}}
                routes() { return {delete: '/delete/{id}'}}
            }

            moxios.withMock(() => {
                m.delete({
                    success: (response) => {
                        expect(response).to.not.be.null;
                        done();
                    }
                });

                moxios.wait(() => {
                    moxios.requests.mostRecent().respondWith({
                        status: 200
                    })
                })
            })
        })

        it('should call "always" handler on success', function(done) {
            let m = new class extends Model {
                defaults() { return {id: 1}}
                routes() { return {delete: '/delete/{id}'}}
            }

            moxios.withMock(() => {
                m.delete({
                    always: (error, response) => {
                        expect(response).to.not.be.null;
                        expect(error).to.be.null;
                        done();
                    }
                });

                moxios.wait(() => {
                    moxios.requests.mostRecent().respondWith({
                        status: 200
                    })
                })
            })
        })

        it('should call "failure" handler on failure', function(done) {
            let m = new class extends Model {
                defaults() { return {id: 1}}
                routes() { return {delete: '/delete/{id}'}}
            }

            moxios.withMock(() => {
                m.delete({
                    failure: (error, response) => {
                        expect(response).to.not.be.null;
                        expect(error).to.not.be.null;
                        done();
                    }
                });

                moxios.wait(() => {
                    moxios.requests.mostRecent().respondWith({
                        status: 500
                    })
                })
            })
        })

        it('should call "always" handler on failure', function(done) {
            let m = new class extends Model {
                defaults() { return {id: 1}}
                routes() { return {delete: '/delete/{id}'}}
            }

            moxios.withMock(() => {
                m.delete({
                    always: (error, response) => {
                        expect(response).to.not.be.null;
                        expect(error).to.not.be.null;
                        done();
                    }
                });

                moxios.wait(() => {
                    moxios.requests.mostRecent().respondWith({
                        status: 500
                    })
                })
            })
        })

        it('should call default handler on success', function(done) {
            let m = new class extends Model {
                defaults() { return {id: 1}}
                routes() { return {delete: '/delete/{id}'}}
            }

            moxios.withMock(() => {
                m.delete((error, response) => {
                    expect(response).to.not.be.null;
                    expect(error).to.be.null;
                    done();
                });

                moxios.wait(() => {
                    moxios.requests.mostRecent().respondWith({
                        status: 200
                    })
                })
            })
        })

        it('should call default handler on failure', function(done) {
            let m = new class extends Model {
                defaults() { return {id: 1}}
                routes() { return {delete: '/delete/{id}'}}
            }

            moxios.withMock(() => {
                m.delete((error, response) => {
                    expect(response).to.not.be.null;
                    expect(error).to.not.be.null;
                    done();
                });

                moxios.wait(() => {
                    moxios.requests.mostRecent().respondWith({
                        status: 500
                    })
                })
            })
        })

        it('should use delete route override', function(done) {
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

        it('should use delete headers override', function(done) {
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

        it('should use default headers override', function(done) {
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

        it('should use default headers with delete headers override', function(done) {
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

        it('should use delete method override', function(done) {
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

        it('should use delete query parameters override', function(done) {
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

        it('should be fatal on error', function(done) {
            let m = new class extends Model {
                routes() { return {delete: '/delete'}}
            }

            moxios.withMock(() => {
                expect(m.fatal).to.equal(false);
                m.delete(() => {
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

        it('should be non-fatal on success', function(done) {
            let m = new class extends Model {
                routes() { return {delete: '/delete'}}
            }

            moxios.withMock(() => {
                expect(m.fatal).to.equal(false);
                m.delete(() => {
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

        it('should set deleting to true on delete', function(done) {
            let m = new class extends Model {
                routes() { return {delete: '/delete'}}
            }

            moxios.withMock(() => {
                expect(m.deleting).to.equal(false);
                m.delete(() => {
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

        it('should set deleting to false on delete success', function(done) {
            let m = new class extends Model {
                routes() { return {delete: '/delete'}}
            }

            moxios.withMock(() => {
                expect(m.deleting).to.equal(false);
                m.delete(() => {
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

        it('should set deleting to false on delete failure', function(done) {
            let m = new class extends Model {
                routes() { return {delete: '/delete'}}
            }

            moxios.withMock(() => {
                expect(m.deleting).to.equal(false);
                m.delete(() => {
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

        it('should remove from all collections on delete', function(done) {
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

                m.delete(() => {
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
