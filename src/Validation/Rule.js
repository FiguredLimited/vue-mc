import _ from 'lodash'
import messages from './Messages.js'

/**
 * Convenience helpers for easy validation.
 * These can all be used directly in a model's validation configuration.
 *
 * @example
 *
 * import {ascii, length} from 'vue-mc/validation'
 *
 * class User extends Model {
 *     validation() {
 *         return {
 *             password: ascii().and(length(5)),
 *         }
 *     }
 * }
 */

/**
 * Creates a new validation rule.
 *
 * Rules returned by this function can be chained with `or` and `and`.
 * For example: `ruleA.or(ruleB.and(RuleC)).and(RuleD)`
 *
 * The error message can be set or replaced using `format(message|template)`.
 *
 * @param {Object} Rule configration:
 *                      - name: Name of the error message.
 *                      - data: Context for the error message.
 *                      - test: Function accepting (value, model), which should
 *                              return `true` if the value is valid.
 *
 * @returns {Function} Validation rule.
 */
function Rule(config) {
    let name = _.get(config, 'name');
    let data = _.get(config, 'data', {});
    let test = _.get(config, 'test', _.stubTrue);

    /**
     * This is the function that is called when using this rule.
     * It has some extra metadata to allow rule chaining and custom formats.
     */
    let $rule = function(value, attribute, model) {

        // `true` if this rule's core acceptance criteria was met.
        let valid = test(value, attribute, model);

        // We should check that all of this rule's "and" chains also pass.
        if (valid) {

            // If any of the chained rules return a string, we know that that
            // rule has failed, and therefore this chain is invalid. We return
            // the message that was returned by the failing rule.
            for (let rule of $rule._and) {
                let result = rule(value, attribute, model);

                if (_.isString(result)) {
                    return result;
                }
            }

            // There were either no "and" rules, or they all passed.
            return true;

        // This rule's acceptance criteria were not met, but there is a chance
        // that a rule in the "or" chain's might pass. Any rule that doesn't
        // return a string (be it `true` or `false`) is considered valid.
        } else {
            for (let rule of $rule._or) {
                let result = rule(value, attribute, model);

                if ( ! _.isString(result)) {
                    return true;
                }
            }
        }

        // At this point we want to report that this rule has failed, as none of
        // the "and" or "or" chains were met either.

        // Add the invalid value to the message context, which is made available
        // to all rules by default. This allows for ${value} interpolation.
        _.assign(data, {attribute, value});

        // This would be a custom format explicitly set on this rule.
        let format = _.get($rule, '_format');

        // Use the default message if an explicit format isn't set.
        if ( ! format) {
            return messages.get(name, data);
        }

        // Replace the custom format with a template if it's still a string.
        if (_.isString(format)) {
            $rule._format = format = _.template(format);
        }

        return format(data);
    };

    $rule._and    = [];     // "and" chain
    $rule._or     = [];     // "or" chain
    $rule._format = null;   // Custom format

    /**
     * @returns {Function} A copy of this rule, so that appending to a chain or
     *                     setting a custom format doesn't modify the base rule.
     */
    $rule.copy = () => {
        return Rule({name, test, data});
    }

    /**
     * Sets a custom error message format on this rule.
     *
     * @param {string|Function}
     */
    $rule.format = (format) => {
        return _.assign($rule.copy(), {_format: format})
    };

    /**
     * Adds another rule or function to this rule's OR chain. If the given rule
     * passes when this one fails, this rule will return `true`.
     *
     * @param {Function|Function[]} One or more functions to add to the chain.
     */
    $rule.or = (rules) => {
        return _.assign($rule.copy(), {_or: _.concat($rule._or, rules)})
    };

    /**
     * Adds another rule or function to this rule's AND chain. If the given rule
     * fails when this one passes, this rule will return `false`.
     *
     * @param {Function|Function[]} One or more functions to add to the chain.
     */
    $rule.and = (rules) => {
        return _.assign($rule.copy(), {_and: _.concat($rule._and, rules)})
    }

    return $rule;
}

export default Rule;
