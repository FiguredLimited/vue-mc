Basic Usage {#basic-usage}
===========

You should extend the base classes to create appropriate models and collections for your data. The example we'll use is a basic **task list**, consisting of a list (`Collection`) of tasks (`Model`).

#### Extending the base classes  {#basic-usage-extend}

{% highlight js %}
import {Model, Collection} from 'vue-mc'

/**
 * Task model
 */
class Task extends Model {

    // Default attributes that define the "empty" state.
    defaults() {
        return {
            id:   null,
            name: '',
            done: false,
        }
    }

    // Attribute mutations.
    mutations() {
        return {
            id:   (id) => Number(id) || null,
            name: String,
            done: Boolean,
        }
    }

    // Attribute validation
    validation() {
        return {
            id:   integer.and(min(1)).or(equal(null)),
            name: string.and(required),
            done: boolean,
        }
    }

    // Route configuration
    routes() {
        return {
            fetch: '/task/{id}',
            save:  '/task',
        }
    }
}

/**
 * Task collection
 */
class TaskList extends Collection {

    // Model that is contained in this collection.
    model() {
        return Task;
    }

    // Default attributes
    defaults() {
        return {
            orderBy: 'name',
        }
    }

    // Route configuration
    routes() {
        return {
            fetch: '/tasks',
        }
    }

    // Number of tasks to be completed.
    get todo() {
        return this.sum('done');
    }

    // Will be `true` if all tasks have been completed.
    get done() {
        return this.todo == 0;
    }
}
{% endhighlight %}

#### Creating a new instances {#basic-usage-list}

{% highlight js %}
// Create a new empty task list.
let tasks = new TaskList(); // (models, options)

// Create some new tasks.
let task1 = new Task({name: 'Tests'});
let task2 = new Task({name: 'Documentation'});
let task3 = new Task({name: 'Publish'});

{% endhighlight %}

#### Adding tasks to the list

{% highlight js %}

// Add the tasks to the collection.
tasks.add([task1, task2, task3]);

// You can add plain objects directly to the collection.
// They will automatically be converted to `Task` models.
let task1 = tasks.add({name: 'Tests'});
let task2 = tasks.add({name: 'Documentation'});
let task3 = tasks.add({name: 'Publish'});

// You an add multiple models at the same time.
let added = tasks.add([
    {name: 'Tests'},
    {name: 'Documentation'},
    {name: 'Publish'},
]);

{% endhighlight %}

#### Rendering a task input section {#basic-usage-rendering}

{% highlight html %}
<div class="task-form" :class="{saving: task.saving}">

    <!-- Name and validation errors -->
    <input type="text" v-model="task.name">
    <span v-for="(error in task.errors.name)">{{ error }}</span>

    <!-- Done checkbox -->
    <input type="checkbox" v-model="task.done">

    <!-- Save button -->
    <button v-on:click="task.save">Save</button>
</div>
{% endhighlight %}

#### Rendering a task row

{% highlight html %}
<div class="task">
    <p>{% raw %}{{ task.$.name }}{% endraw %}</p>
    <p>{% raw %}{{ task.$.done }}{% endraw %}</p>
</div>
{% endhighlight %}

#### Rendering the list

{% highlight html %}
<div class="tasks">
    <task v-for="task in tasks.models" :task="task" :key="task.id"></task>
</div>
{% endhighlight %}


