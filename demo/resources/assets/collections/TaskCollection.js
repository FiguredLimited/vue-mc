import { Collection } from 'vue-mc'
import Task from '../models/Task'
import _ from 'lodash'

export default class TaskCollection extends Collection {

    model() {
        return Task;
    }

    /**
     * Returns the number of completed tasks (saved state).
     */
    get completed() {
        return this.sum((task) => task.$.done);
    }

    /**
     * Returns the percentage of completed tasks.
     */
    get progress() {
        if (this.isEmpty()) {
            return 0;
        }

        return _.round(this.completed / this.length * 100);
    }

    routes() {
        return {
            fetch: '/task',
        }
    }
}
