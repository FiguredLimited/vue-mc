/**
 * Models and Collections for Vue.js
 *
 * @version 0.0.6
 *
 * @author Rudi Theunissen <rudi.theunissen@figured.com>
 */
import Model      from './Structures/Model.js'
import Collection from './Structures/Collection.js'
import messages   from './Validation/Messages.js'
import rule       from './Validation/Rule.js'

// Export as lowercase because it's not a class.
const validation = { messages, rule }

export {
    Model,
    Collection,
    validation,
}
