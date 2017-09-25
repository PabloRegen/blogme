'use strict';

const Promise = require('bluebird');

let logBody = function(environment, req) {
	if (environment === 'development') {
		console.log('fetch-current-user.js -> req.body is: ', req.body);
	}
};

let logDestroySession = function(environment) {
	if (environment === 'development') {
		console.log('fetch-current-user.js -> user still logged in but no longer exists in the db or was soft deleted, so log user out');
	}
};

module.exports = function(knex, environment) {
	return function(req, res, next) {
		logBody(environment, req);
		
		if (req.session.userId == null) {
			/* User not logged in */
			next();
		} else {
			return Promise.try(() => {
				return knex('users').where({id: req.session.userId}).first();
			}).then((user) => {
				if (user == null || user.deletedAt != null) {
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