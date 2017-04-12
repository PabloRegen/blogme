'use strict';

const Promise = require('bluebird');

module.exports = function(userID) {
	return function(req, res, next) {
		console.log('login-user module 1');
		return Promise.try(() => {
			console.log('login-user module 2');
			req.session.userId = userID;
			console.log('login-user module 3');

			return req.saveSession();
		}).then(() => {
			console.log('login-user module 4');
			res.redirect('/accounts/dashboard');
			console.log('login-user module 5');
		});

		// next();
	};
};