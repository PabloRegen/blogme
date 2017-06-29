'use strict';

let logCurrentUserIsNull = function(environment) {
	if (environment === 'development') {
		console.log('require-signin.js -> req.currentUser == null. Redirecting to signin');
	}
};

module.exports = function(environment) {
	return function(req, res, next) {
		if (req.currentUser == null) {
			logCurrentUserIsNull(environment);
			res.redirect('/accounts/signin');
		} else {
			next();
		}
	};
};