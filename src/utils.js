/**
 * Binds all methods of a class instance to itself.
 */
export const autobind = function(instance) {
    for (let obj = instance; obj; obj = Object.getPrototypeOf(obj)) {

        // We're the end of the inheritance chain if we've reached 'Object'.
        if (obj.constructor.name === 'Object') {
            return;
        }

        let names = Object.getOwnPropertyNames(obj);

        // Bind each function to the instance.
        for (let i = 0; i < names.length; i++) {
            let name = names[i];

            // We're using `defineProperty` here so that we don't make all the
            // class methods enumerable when we replace them.
            if (typeof obj[name] === 'function' && name !== 'constructor') {
                Object.defineProperty(instance, name, {
                    value: instance[name].bind(instance),
                    enumerable: false,
                    configurable: true,
                    writable: true,
                });
            }
        }
    }
}
