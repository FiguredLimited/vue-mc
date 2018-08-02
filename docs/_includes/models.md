
Models
===========

## Creating instances {#model-instances}

Model instances can be created using the `new` keyword. The default constructor
for a model accepts three optional parameters: `attributes`, `collection`, and `options`.

{% highlight js %}
let model = new Model(attributes = {}, collection = null, options = {});
{% endhighlight %}

### Attributes {#model-instance-attributes}

Attributes will be merged with the default attributes as defined by the `defaults()` method.
If no attributes are provided on construction, the model will represent an "empty" state.

**Important**: You should define a default value for every attribute.

{% highlight js %}

// Create a new task with initial attributes.
let task = new Task({name: 'Task #1'});

task.name; // 'Task #1'
task.done; // false

{% endhighlight %}

### Collection {#model-instance-collections}

The `collection` parameter allows you to specify one or more collections that the
model belongs to. A common pattern where this comes in handy is when you are creating
a new model that should be added to a collection when it is created on save.

For example, a user clicks a "New Task" button which shows a form to fill out a new task.
If we create a new `Task` model and set `tasks` as its collection, it will automatically
be added to `tasks` when saved successfully.

{% highlight js %}
onCreateNew() {
    this.task = new Task({}, tasks);
}
{% endhighlight %}

### Options {#model-options}

The `options` parameter allows you to set the options of a model instance. These
can be any of the default options or something specific to your model.
To get the value of an option, use `getOption(name)`. You can also set an option
later on using `setOption(name, value)` or `setOptions(options)`.

You should define a model's default options using the `options()` method:

{% highlight js %}
class Task extends Model {
    options() {
        return {
            editable: false,
        }
    }
}

let task1 = new Task({}, null, {editable: true});
let task2 = new Task({}, null);

task1.getOption('editable'); // true
task2.getOption('editable'); // false

{% endhighlight %}

#### Available options {#model-available-options}

|-------------------------+------------+-------------------+-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| Option                  | Type       | Default           | Description                                                                                                                                                                               |
|:------------------------|:-----------|:------------------|:------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| `methods`               | `Object`   | *See below*       | HTTP request methods.                                                                                                                                                                     |
|-------------------------+------------+-------------------+-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| `identifier`            | `String`   | `"id"`            | The attribute that should be used to uniquely identify this model, usually a **primary key** like `"id"`.                                                                                 |
|-------------------------+------------+-------------------+-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| `overwriteIdentifier`   | `Boolean`  | `false`           | Whether this model should allow an existing identifier to be overwritten on update.                                                                                                       |
|-------------------------+------------+-------------------+-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| `routeParameterPattern` | `Regex`    | `/\{([^}]+)\}/`   | Route parameter matching pattern.                                                                                                                                                         |
|-------------------------+------------+-------------------+-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| `patch`                 | `Boolean`  | `false`           | Whether this model should perform a "patch" on update (only send attributes that have changed).                                                                                           |
|-------------------------+------------+-------------------+-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| `saveUnchanged`         | `Boolean`  | `true`            | Whether this model should save even if no attributes have changed. If set to `false` and no changes have been made, the request will be considered a success.                           |
|-------------------------+------------+-------------------+-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| `useFirstErrorOnly`     | `Boolean`  | `false`           | Whether this model should only use the first validation error it receives, rather than an array of errors.                                                                                |
|-------------------------+------------+-------------------+-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| `validateOnChange`      | `Boolean`  | `false`           | Whether this model should validate an attribute after it has changed. This would only affect the errors of the changed attribute and will only be applied if the value is not blank.      |
|-------------------------+------------+-------------------+-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| `validateOnSave`        | `Boolean`  | `true`            | Whether this model should be validated before it is saved. This will cause the request to fail if validation does not pass. This is useful when you only want to validate on demand.      |
|-------------------------+------------+-------------------+-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| `validateRecursively`   | `Boolean`  | `true`            | Whether this model should validate other objects within its attribute tree. The result is implicit recursion as each of those instances will also validate their trees, etc.              |
|-------------------------+------------+-------------------+-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| `mutateOnChange`        | `Boolean`  | `false`           | Whether this model should mutate a property as it is changed before it is set. This is a rare requirement because you usually don't want to mutate something that you are busy editing.   |
|-------------------------+------------+-------------------+-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| `mutateBeforeSync`      | `Boolean`  | `true`            | Whether this model should mutate all attributes before they are synced to the "saved" state. This would include construction, on fetch, and on save success.                              |
|-------------------------+------------+-------------------+-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| `mutateBeforeSave`      | `Boolean`  | `true`            | Whether this model should mutate all attributes before a "save" request is made.                                                                                                          |
|-------------------------+------------+-------------------+-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|

##### Default request methods
{% highlight js %}
{
    ...

    "methods" {
        "fetch":  "GET",
        "save":   "POST",
        "update": "POST",
        "create": "POST",
        "patch":  "PATCH",
        "delete": "DELETE",
    }
}
{% endhighlight %}

## Identifiers {#model-identifiers}

Models usually have an *identifier* attribute to uniquely identify them, like a primary key in the database.
The default identifier attribute is `"id"`, but you can override this with the `identifier` option.

{% highlight js %}
class Task extends Model {
    options() {
        return {
            identifier: 'uuid',
        }
    }
}
{% endhighlight %}

## Collections {#model-collections}

Models can be registered to collections, which implies that the model "belongs to"
that collection. If a model is created or deleted, it will automatically be added
or removed from every collection it is registered to.

When you add a model to a collection, it will automatically be registered to that collection,
but there may be cases where you want to manually register one or more collections. You can
do this with the `registerCollection` method, which accepts either an instance or an array of collections.

Attempting to register the same collection more than once has no effect.


## Attribute states {#model-attribute-state}

Models maintain three separate attribute states: **empty**, **active**, and **saved**.

### Empty {#model-attribute-state-empty}

The empty state is defined by the model's `defaults()` method, and is automatically
assigned to the active state when the model is created or cleared.

### Active {#model-attribute-state-active}

The active state is accessed directly on the model, eg. `task.name`.
This is also the attributes that will be sent to the server when the model is saved.
You can mess with this data as much as you want, then either call `clear()` to revert
back to the empty state, or `reset()` to revert back to the saved state.

### Saved {#model-attribute-state-saved}

The saved state is the "source of truth", which usually reflects what's in the database.
You can use `sync()` to apply the active state to the saved state, which happens automatically
when the model is saved successfully, and when constructed.

![Attribute state flow diagram]({{ site.baseurl }}/assets/images/attributes.png)

## Data access {#model-data-access}

### Active attributes {#model-data-access-active}

You can access the active state directly on the instance, or with the `get(attribute, default)` method which
allows you to specify a default value to fall back on if the attribute does not exist. It's safe to set
the value of an existing attribute direcly, or you can use `set(attribute, value)`.

**Important**: You must use `set` if you're setting an attribute that doesn't exist on the model yet.

{% highlight js %}
let task = new Task({name: 'Write some tests!'})
{% endhighlight %}

##### Read
{% highlight js %}
task.name;         // 'Write some tests!'
task.get('name');  // 'Write some tests!'

task.get('author', 'Unknown'); // 'Unknown'
{% endhighlight %}

##### Write
{% highlight js %}
task.name = 'Write better tests';

// Set an attribute that doesn't exist on the model.
task.set('alias', 'Tests');

{% endhighlight %}

### Saved attributes {#model-data-access-saved}

You can access the saved state with the `saved(attribute, default)` method or directly on the instance using the `$` accessor.
This is useful when you want to display a saved value while editing its active equivalent, for example when you want to show a
task's saved name in the list while editing the name (which is bound to the active state).
If you don't bind using `$` when rendering the list, the task's name will change on-the-fly as you type.

**Important**: You should never write to the saved state directly.

{% highlight js %}
let task = new Task({name: 'Get some sleep?'})

// Update the active state.
task.name = 'Do more work!';

task.$.name;         // 'Get some sleep?'
task.saved('name');  // 'Get some sleep?'

task.saved('author', 'Unknown'); // 'Unknown'

{% endhighlight %}

### Changed attributes {#model-data-access-changed}

If you'd like to know which fields have changed since the last time the model was synced,
you can call `changed()`, which returns either a list of attributes names or `false` if no
values have changed.

### v-model {#model-data-access-v-model}

You should **always use the active state** with `v-model`.

{% highlight html %}
<input id="name" type="text"     v-model="task.name">
<input id="done" type="checkbox" v-model="task.done">
{% endhighlight %}

### v-bind {#model-data-access-v-bind}

You can use `v-bind` with either the active or the saved state.

{% highlight html %}
<label>{% raw %}{{ task.$.name }}{% endraw %}</label>

<!-- Edit the task's name here without affecting the label above. -->
<input id="name" type="text" v-model="task.name">
{% endhighlight %}


## Mutators {#model-mutations}

You can define functions for each attribute to pass through before they are set on the
model, which makes things like type coercion or rounding very easy.

Mutators are defined by a model's `mutations()` method, which should return an
object mapping attribute names to their mutator functions. You can use an array
to create a pipeline, where each function will receive the result of the previous.

Mutator functions should accept `value` and return the mutated value.

{% highlight js %}
mutations() {
    return {
        id:   (id) => _.toNumber(id) || null,
        name: [_.toString, _.trim],
        done: Boolean,
    }
}

{% endhighlight %}

See [options](#model-options) that determine when mutations should be applied.

## Validation {#model-validation}

There are already some awesome validation libraries for Vue such as
[vee-validate](https://github.com/baianat/vee-validate) and
[vuelidate](https://github.com/monterail/vuelidate), which you are more than welcome to keep using. As an alternative, validation is also built into `vue-mc`.

The plan was the keep our templates as clean as possible; validation errors should
be presented by the template, but validation rules should be defined on the model  alongside the data.

To do this, we use the `validation()` method.

{% highlight js %}
// Validation rules
import {
    boolean,
    equal,
    integer,
    min,
    required,
    string,
} from 'vue-mc/validation'

class Task extends Model {

    defaults() {
        // id, name, done
    }

    validation() {
        return {
            id:   integer.and(min(1)).or(equal(null)),
            name: required.and(string),
            done: boolean,
        }
    }

    options() {
        return {
            // Whether this model should validate an attribute that has changed.
            // This would only affect the errors of the changed attribute and
            // will only be applied if the value is not a blank string.
            validateOnChange: false,

            // Whether this model should be validated before it is saved, which
            // will cause the request to fail if validation does not pass. This
            // is useful when you only want to validate on demand.
            validateOnSave: true,

            // Whether this model should validate models and collections within
            // its attribute tree. The result is implicit recursion as each of
            // those instances will also validate their trees, etc.
            validateRecursively: true,
        }
    }
}

{% endhighlight %}

### Configuration {#model-validation-config}

A validation rule is a function that accepts a `value`, `attribute` and the `model` under validation,
and returns an error message if the value is not valid. You can specify one rule or an array
of rules for each attribute. Using multiple rules means that there might be multiple error
messages per attribute, which is why error messages are always attached to the attribute
as an array.

The rules provided by `vue-mc/validation` are chainable with `and` and `or`, and allow you to override
the default message using `format(message|template)`.

For example, if we had an attribute called `secret`
which must be an alphanumeric string with a length between 2 and 8 characters, or `null`, we can create a rule for that like this:

{% highlight js %}
validation() {
    return {
        secret: string.and(length(2, 8)).and(alpha).or(equal(null));
    }
}
{% endhighlight %}

You can also move the `null` check to the front of the chain, like this:

{% highlight js %}
validation() {
    return {
        secret: isnull.or(string.and(length(2, 8)).and(alpha));
    }
}
{% endhighlight %}

The equivalent of this rule using a function might be something like this:
{% highlight js %}
validation() {
    return {
        secret: (value) => {
            if (_.isNull(value)) {
                return;
            }

            if ( ! _.isString(value)) {
                return "Must be a string";
            }

            if (value.length < 2 || value.length > 8) {
                return "Must have a length between 2 and 8";
            }
        },
    }
}
{% endhighlight %}

If an invalid value for `secret` is set, the `errors` property of the model would
then be updated.

{% highlight js %}
model.secret = 5;

model.errors; // {secret: ['Must be a string']}
{% endhighlight %}

If we separated those rules out into individual rules in an array, we would see
all three errors because they would be treated as two separate rules rather than a
single chained rule. One thing we'd lose out on here is the "or null" part of
the condition, unless we add that to each rule in the array.

{% highlight js %}
validation() {
    return {
        secret: [string, length(2, 8), alpha],
    }
}

model.secret = 5;

model.errors; //  {secret: [
              //     'Must be a string',
              //     'Must have a length between 2 and 8',
              //     'Can only use letters'
              //  ]}
{% endhighlight %}

#### Order of operations

1. Check the base rule first and return its message if it fails.
2. Check if all the `and` rules pass in the order that they were chained.
3. Check if any of the `or` rules pass in the order that they were chained.

### Nested validation {#model-validation-nested}

If a model's `"validateRecursively"` option is set to `true`, attributes that
have a `validate` method will also be validated. If any descendant fails validation,
the parent will also fail. You can however still set other rules for the nested attribute,
but this will not override the default nested validation behaviour.

### Available rules {#model-validation-rules}

<table class="rules">
    <tr>
        <td class="name">after(date)</td>
        <td class="desc">
            Checks if the value is after a given date string or <code>Date</code> object.
        </td>
    </tr>
    <tr>
        <td class="name">alpha</td>
        <td class="desc">
            Checks if a value only has letters.
        </td>
    </tr>
    <tr>
        <td class="name">alphanumeric</td>
        <td class="desc">
            Checks if a value only has letters or numbers.
        </td>
    </tr>
    <tr>
        <td class="name">array</td>
        <td class="desc">
            Checks if a value is an array.
        </td>
    </tr>
    <tr>
        <td class="name">ascii</td>
        <td class="desc">
            Checks if a value is a string consisting only of <a href="https://en.wikipedia.org/wiki/ASCII" target="_blank">ASCII</a> characters.
        </td>
    </tr>
    <tr>
        <td class="name">base64</td>
        <td class="desc">
            Checks if a value is a valid <a href="https://en.wikipedia.org/wiki/Base64" target="_blank">Base64</a> string.
        </td>
    </tr>
    <tr>
        <td class="name">before(date)</td>
        <td class="desc">
            Checks if a value is before a given date string or <code>Date</code> object.
        </td>
    </tr>
    <tr>
        <td class="name">between(min, max)</td>
        <td class="desc">
            Checks if a value is between a given minimum or maximum.
        </td>
    </tr>
    <tr>
        <td class="name">boolean</td>
        <td class="desc">
            Checks if a value is a boolean (strictly <code>true</code> or <code>false</code>).
        </td>
    </tr>
    <tr>
        <td class="name">creditcard</td>
        <td class="desc">
            Checks if a value is a valid credit card number.
        </td>
    </tr>
    <tr>
        <td class="name">date</td>
        <td class="desc">
            Checks if a value is parseable as a date.
        </td>
    </tr>
    <tr>
        <td class="name">dateformat(format)</td>
        <td class="desc">
            Checks if a value matches the given date <a href="https://date-fns.org/v2.0.0-alpha.9/docs/format" _target="blank">format</a>.
        </td>
    </tr>
    <tr>
        <td class="name">defined</td>
        <td class="desc">
            Checks if a value is not <code>undefined</code>.
        </td>
    </tr>
    <tr>
        <td class="name">email</td>
        <td class="desc">
            Checks if a value is a valid email address.
        </td>
    </tr>
    <tr>
        <td class="name">empty</td>
        <td class="desc">
            Checks if value is considered <a href="https://lodash.com/docs/#isEmpty" _target="blank">empty</a>.
        </td>
    </tr>
    <tr>
        <td class="name">equal(value)</td>
        <td class="desc">
            Alias for <code>equals</code>.
        </td>
    </tr>
    <tr>
        <td class="name">equals(value)</td>
        <td class="desc">
            Checks if a value equals the given value.
        </td>
    </tr>
    <tr>
        <td class="name">gt(min)</td>
        <td class="desc">
            Checks if a value is greater than a given minimum.
        </td>
    </tr>
    <tr>
        <td class="name">gte(min)</td>
        <td class="desc">
            Checks if a value is greater than or equal to a given minimum.
        </td>
    </tr>
    <tr>
        <td class="name">integer</td>
        <td class="desc">
            Checks if a value is an integer.
        </td>
    </tr>
    <tr>
        <td class="name">ip</td>
        <td class="desc">
            Checks if a value is a valid IP address.
        </td>
    </tr>
    <tr>
        <td class="name">isblank</td>
        <td class="desc">
            Checks if a value is a zero-length string.
        </td>
    </tr>
    <tr>
        <td class="name">isnil</td>
        <td class="desc">
            Checks if a value is <code>null</code> or <code>undefined</code>.
        </td>
    </tr>
    <tr>
        <td class="name">isnull</td>
        <td class="desc">
            Checks if a value is <code>null</code>.
        </td>
    </tr>
    <tr>
        <td class="name">iso8601</td>
        <td class="desc">
            Checks if a value is a valid <a href="https://en.wikipedia.org/wiki/ISO_8601" target="_blank">ISO8601</a> date string.
        </td>
    </tr>
    <tr>
        <td class="name">json</td>
        <td class="desc">
            Checks if a value is valid JSON.
        </td>
    </tr>
    <tr>
        <td class="name">length(min, max)</td>
        <td class="desc">
            Checks if a value's <a href="https://lodash.com/docs/#toLength" _target="blank">length</a> is at least <code>min</code> and no more than <code>max</code> (optional).
        </td>
    </tr>
    <tr>
        <td class="name">lt(max)</td>
        <td class="desc">
            Checks if a value is less than a given maximum.
        </td>
    </tr>
    <tr>
        <td class="name">lte(max)</td>
        <td class="desc">
            Checks if a value is less than or equal to a given maximum.
        </td>
    </tr>
    <tr>
        <td class="name">match(pattern)</td>
        <td class="desc">
            Checks if a value matches a given regular expression string or <code>RegExp</code>.
        </td>
    </tr>
    <tr>
        <td class="name">max(max)</td>
        <td class="desc">
            Alias for <code>lte</code>.
        </td>
    </tr>
    <tr>
        <td class="name">min(min)</td>
        <td class="desc">
            Alias for <code>gte</code>.
        </td>
    </tr>
    <tr>
        <td class="name">negative</td>
        <td class="desc">
            Checks if a value is negative.
        </td>
    </tr>
    <tr>
        <td class="name">not(value)</td>
        <td class="desc">
            Checks if a value is not any of one or more given values.
        </td>
    </tr>
    <tr>
        <td class="name">number</td>
        <td class="desc">
            Checks if a value is a number (<code>integer</code> or <code>float</code>), excluding <code>NaN</code>.
        </td>
    </tr>
    <tr>
        <td class="name">numeric</td>
        <td class="desc">
            Checks if a value is a number or numeric string, excluding <code>NaN</code>.
        </td>
    </tr>
    <tr>
        <td class="name">object</td>
        <td class="desc">
            Checks if a value is an object, excluding arrays and functions.
        </td>
    </tr>
    <tr>
        <td class="name">positive</td>
        <td class="desc">
            Checks if a value is positive.
        </td>
    </tr>
    <tr>
        <td class="name">required</td>
        <td class="desc">
            Checks if a value is present, ie. not <code>null</code>, <code>undefined</code>, or a blank string.
        </td>
    </tr>
    <tr>
        <td class="name">same(other)</td>
        <td class="desc">
            Checks if a value equals another attribute's value.
        </td>
    </tr>
    <tr>
        <td class="name">string</td>
        <td class="desc">
            Checks if a value is a string.
        </td>
    </tr>
    <tr>
        <td class="name">url</td>
        <td class="desc">
            Checks if a value is a valid URL string.
        </td>
    </tr>
    <tr>
        <td class="name">uuid</td>
        <td class="desc">
            Checks if a value is a valid <a href="https://en.wikipedia.org/wiki/Universally_unique_identifier" target="_blank">UUID</a>
        </td>
    </tr>
</table>

### Custom validation rules {#model-validation-custom}

You can create your own chainable rules that use the same interface as the
standard rules. All you need to do is define a `name`, a `test` method,
and `data` that should be passed to its error message template.

{% highlight js %}
import { validation } from 'vue-mc'

// Create a rule that checks if a value is odd.
const odd = validation.rule({
    name: 'odd',
    test: value => value & 1,
});

// Create a rule that checks if a value is divisible by another.
const divisibleBy = (divisor) => {
    return validation.rule({
        name: 'divisible',
        test: value => value % divisor == 0,
        data: {divisor},
    });
}

// You can now use these rules in the same way as the standard ones.
let rule = odd.and(divisibleBy(3));

// Remember to add default messages for the rules.
validation.messages.set('odd',       'Must be an odd number');
validation.messages.set('divisible', 'Must be divisible by ${divisor}');

{% endhighlight %}


### Messages {#model-validation-messages}

Default error messages are defined for all available validation rules. You can override
these on a per-rule basis using a rule's `format` method, which accepts either a
string or a function that returns a formatted message. Functions will receive a `data`
object which contains at least `value` and `attribute`, along with any other contextual
data that the rule provides.

String formats will automatically be compiled by [_.template](https://lodash.com/docs/#template).

{% highlight js %}
let rule1 = string.and(length(2, 8)).format("${value} must be a secret!");
let rule2 = string.and(length(2, 8)); // This will still use the default message.
{% endhighlight %}

You can overwrite global the default for a specific rule by using the
`set(name, format, locale = null)` method of the validation object that is exported
by `vue-mc`. If a locale is not given, it will use the default locale.

{% highlight js %}
import { validation } from 'vue-mc';

validation.messages.set('email', '${value} must be an email, please');
{% endhighlight %}

### Localisation  {#model-validation-locale}

You can change the language of vaidation error messages by setting the `locale`.

{% highlight js %}
import { validation } from 'vue-mc';

// Set a message on the "af" locale.
validation.messages.set('email', "${value} moet 'n email adres wees", 'af');

// Set the current locale to "af".
// The formatted messages for `email` will now be the "af" version.
validation.messages.locale('af');

validation.messages.get('email', {value: 5}); // "5 moet 'n email adres wees"
{% endhighlight %}

The default locale is `null`, which is used as a fallback for when a message is not
defined for the current locale. However, a message might be defined under a **language** like `"es"` (Spanish),
but the locale set to `"es-ar"` (Spanish - Argentina). If a requested message does not exist
under the specific locale, it will fall back to the language, and only then to the default locale.

**Note**: You can use `window.navigator.language` to detect the browser's language.


#### Languages

You can import entire language packs and register them using `messages.register(bundle)`.

{% highlight js %}
import { validation } from 'vue-mc'
import { pt_br }      from 'vue-mc/locale'

// Register the language bundle.
validation.messages.register(pt_br);

// Set the locale.
validation.messages.locale('pt-br');
{% endhighlight %}

An added bonus of language packs is that it allows you to register your own
messages using a locale that describes your application rather than a language.
The structure of a language pack is an object that has a `locale` and some `messages`.

{% highlight js %}
const pack = {
    locale: 'my-app',
    messages: {
        email: 'No good, try a different one',
        ...
    }
}

validation.messages.register(pack);
{% endhighlight %}

##### Supported Locales

|--------+---------------------|
| Locale | Language            |
|:-------|:--------------------|
| af_za  | Afrikaans           |
|--------+---------------------|
| da_dk  | Danish              |
|--------+---------------------|
| en_us  | English (US)        |
|--------+---------------------|
| nl_nl  | Dutch               |
|--------+---------------------|
| pt_br  | Portuguese (Brazil) |
|--------+---------------------|
| ru_ru  | Russian             |
|--------+---------------------|


## Routes {#model-routes}

Routes are defined in a model's `routes()` method. Expected but optional route keys
are **fetch**, **save**, and **delete**. Route parameters are returned by `getRouteParameters()`.
By default, route values are URL paths that support parameter interpolation with curly-brace syntax,
where the parameters are the model's active attributes and options.

{% highlight js %}
class Task extends Model {
    routes() {
        save: '/task/{id}',
    }
}
{% endhighlight %}


**Note**: You can use `getURL(route, parameters = {})` to resolve a route's URL directly.

### Using a custom route resolver {#model-route-resolver}

A *route resolver* translates a route value to a URL. The default resolver assumes
that route values are URL paths, and expects parameters to use curly-brace
syntax. You can use a custom resolver by overriding `getRouteResolver()`, returning a function
that accepts a route value and parameters.

For example, if you are using [laroute](https://github.com/aaronlord/laroute), your base model might look like this:

 {% highlight js %}
class Task extends Model {
    routes() {
        save: 'task.save', // Defined in Laravel, eg. `/task/save/{id}`
    }

    getRouteResolver() {
        return laroute.route;
    }
}
{% endhighlight %}

## Events {#model-events}

You can add event listeners using `on(event, listener)`. Event context will always
consist of at least `target`, which is the model that the event was emitted by.
Event names can be comma-separated to register a listener for multiple events.

{% highlight js %}
task.on('reset', (event) => {
   // Handle event here.
})

task.on('reset, sync', (event) => {
   // Handle event here.
})
{% endhighlight %}

### reset {#model-events-reset}
When the active state is reset to the saved state.<br>
- `attributes` -- The attribute names that were reset.
- `before` -- A copy of the active state before the attributes were reset.
- `after` -- A copy of the active state after the attributes were reset.

### sync {#model-events-sync}
When the active state is applied to the saved state.
- `attributes` -- The attribute names that were synced.
- `before` -- A copy of the saved state before the attributes were synced.
- `after` -- A copy of the saved state after the attributes were synced.

### change {#model-events-change}
When a value is set on the model that is different to what it was before. This
event will also be emitted when a model is constructed with initial values.
- `attribute` -- The name of the attribute that was changed.
- `previous` -- The previous value of the attribute.
- `value` -- The new value of the attribute.

### create {#model-events-create}
After a model is saved successfully, where the model was *created*.

### update {#model-events-update}
After a model is saved successfully, where the model was *updated*.

### fetch {#model-events-fetch}
Before a model's data is fetched.
The request will be cancelled if any of the listeners return `false`, or skipped
if the request is part of a batch within a collection.

Events will also be fired after the request has completed:
- `fetch.success`
- `fetch.failure`
- `fetch.always`

### save {#model-events-save}
Before a model is saved.
The request will be cancelled if any of the listeners return `false`, or skipped
if the request is part of a batch within a collection.

Events will also be fired after the request has completed:
- `save.success`
- `save.failure`
- `save.always`

### delete {#model-events-delete}
Before a model is deleted.
The request will be cancelled if any of the listeners return `false`, or skipped
if the request is part of a batch within a collection.

Events will also be fired after the request has completed:
- `delete.success`
- `delete.failure`
- `delete.always`

## Requests {#model-requests}

Models support three actions: `fetch`, `save` and `delete`. These are called
directly on the model, and return a `Promise`. The `resolve` callback will
receive a `response` which could be `null` if a request was cancelled. The `reject`
callback will receive an `error` which should always be set.

{% highlight js %}
model.save().then((response) => {
    // Handle success here
}).catch((error) => {
    // Handle failure here
})

{% endhighlight %}

### Fetch {#model-request-fetch}

Model data is usually either already in scope or part of a collection of data,
but you can also *fetch* attribute data for a specific model. Response data is
expected to be an object of attributes which will replace the active attributes
and sync the saved state.

When a fetch request is made, `loading` will be `true` on the model, and `false`
again when the data has been received and assigned (or if the request failed).
This allows the UI to indicate a loading state.

The request will be ignored if `loading` is already `true` when the request is made.

### Save {#model-request-save}

Saving a model either performs a *create* or *update*, depending on whether the model is
already persisted. The default criteria that qualifies a response as *created* is to
check if the model now has an *identifier* but didn't before, or if the response status was a `201 Created`.

If the model was created, it will **automatically be added** to all registered collections.

If you'd like to enable *patching* you can override `shouldPatch()`. The request will then
only consist of attributes that have changed, and abort early if no changes have been made.

When a save request is made, `saving` will be `true` on the model, and `false`
again when the response has been handled (or if the request failed).

The request will be ignored if `saving` is already `true` when the request is made,
which prevents the case where clicking a save button multiple times results in more
than one request.

#### Response {#model-request-save-response}

In most case you would return the saved model in the response,
so that server-generated attributes like `date_created` or `id` can be applied.

Response data should be either an object of attributes, an identifier, or nothing at all.

If an object is received, it will replace the active attributes and sync the saved state.

If an identifier is returned it will only set the [identifier](#identifiers).
You can override identifier handling with `parseIdentifier(data)` and `isValidIdentifier(identifier)`.

If the response is empty, it will be assumed that the active state is already the source of truth.
This makes sense when the model doesn't use any server-generated attributes
and doesn't use an identifier.

#### Validation {#model-request-save-validation}

Validation errors are automatically set on a model and can be accessed as `model.errors`.
They are set when a *save* request receives a `422 Unprocessable Entity` response. You can adjust
how this is determined by overriding `isValidationError(response)`.

Validation errors should be an object of arrays keyed by attribute name, for example:

{% highlight js %}
{
    email: [
        "Should be a valid email address",
    ],
}
{% endhighlight %}

**Important**: This should mirror the same structure as [model-based validation](#model-validation).

### Delete {#model-request-delete}

When a delete request is made, `deleting` will be `true` on the model, and `false`
again when the response has been handled (or if the request failed).

The request will be ignored if `deleting` is already `true` when the request is made.

The model will **automatically be removed** from all registered collections if
the request is successful.

### Custom {#model-request-custom}

You can also create custom requests to perform custom actions.

{% highlight js %}
let config = {
    // url
    // method
    // data
    // params
    // headers
};

return this.getRequest(config).send().then(() => {
    // Handle success here
}).catch((error) => {
    // Handle failure here
});
{% endhighlight %}

### Events {#model-request-events}
Events for `save`, `fetch`, and `delete` will be emitted on the model after
a request has completed:

{% highlight js %}
model.on('save', (event) => {
    // event.error will be set if the action failed
})
{% endhighlight %}
