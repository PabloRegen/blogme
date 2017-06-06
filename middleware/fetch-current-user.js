'use strict';

const Promise = require('bluebird');

let logBodyAndUserId = function(environment, req) {
	if (environment === 'development') {
		console.log('fetch-current-user.js -> req.body is: ', req.body);
		console.log('fetch-current-user.js -> req.session.userId is: ', req.session.userId);
	}
};

let logUsers = function(environment, users) {
	if (environment === 'development') {
		console.log('fetch-current-user.js -> users is:');
		console.log(users);
	}
};

let logDestroySession = function(environment) {
	if (environment === 'development') {
		console.log('fetch-current-user.js -> user still logged in but no longer exists in the db or was soft deleted, so log user out');
	}
};

module.exports = function(knex, environment) {
	return function(req, res, next) {
		logBodyAndUserId(environment, req);
		
		if (req.session.userId == null) {
			/* User not logged in */
			next();
		} else {
			return Promise.try(() => {
				return knex('users').where({id: req.session.userId});
			}).then((users) => {
				logUsers(environment, users);

				let user = users[0];

				if (users.length === 0 || user.deletedAt != null) {
					logDestroySession(environment);

					/* User still logged in but no longer exists in the db or was soft deleted, so log user out */
					return req.destroySession();
				} else {
					/* make current user available application-wide by adding it as a property to the req object */
					req.currentUser = user;
				}
			}).then(() => {
				next();
			});
		}
	};
};