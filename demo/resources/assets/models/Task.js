import { Model } from 'vue-mc'
import { required, length } from 'vue-mc/validation'

export default class Task extends Model {

    defaults() {
        return {
            id: null,
            name: '',
            done: false,
        }
    }

    options() {
        return {
            useFirstErrorOnly: true,
        }
    }

    validation() {
        return {
            name: required.and(length(3)),
        }
    }

    mutations() {
        return {
            done: Boolean,
        }
    }

    routes() {
        return {
            save:   '/task',
            delete: '/task/{id}',
            update: '/task/{id}'
        }
    }
}
