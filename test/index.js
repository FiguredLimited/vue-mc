/**
 * Tests
 */

// Fail if there's an unhandled promise rejection warning.
process.on('unhandledRejection', (error, promise) => {
    throw error;
});

// Structures
require('./Structures/Model.spec.js');
require('./Structures/Collection.spec.js');

// Validation
require('./Validation/Rule.spec.js');
require('./Validation/Rules.spec.js');
require('./Validation/Messages.spec.js');

// HTTP
require('./HTTP/ProxyResponse.spec.js');

// Errors
require('./Errors/RequestError.spec.js');
require('./Errors/ResponseError.spec.js');
require('./Errors/ValidationError.spec.js');
