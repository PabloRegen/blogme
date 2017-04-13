'use strict';

module.exports = function(environment) {
	return function(req, res, next) {
		if (environment === 'development') {
			console.log('require-signin middleware!');
			console.log('-----');
		}

		if (req.currentUser == null) {
			if (environment === 'development') {
				console.log('currentUser == null so redirect to signin!')
			}

			res.redirect('/accounts/signin');
		} else {
			next();
		}
	};
};