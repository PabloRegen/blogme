'use strict';

module.exports = function(environment, errorType, err) {
	if (environment === 'development') {
		console.log('log-error.js');
		console.log(errorType);
		console.log(err);
	}
};