'use strict';

const Promise = require('bluebird');

module.exports = function(knex, environment) {
	return function(req, res, next) {
		if (environment === 'development') {
			console.log('fetchCurrentUser! req.body is:');
			console.log(req.body);
			console.log('fetchCurrentUser! req.session.userId is:');
			console.log(req.session.userId);
			console.log('-----');
		}
		
		if (req.session.userId == null) {
			/* User not logged in */
			next();
		} else {
			return Promise.try(() => {
				return knex('users').where({id: req.session.userId});
			}).then((users) => {
				if (environment === 'development') {
					console.log('fetchCurrentUser! users is:');
					console.log(users);
				}

				let user = users[0];

				if (users.length === 0 || user.deletedAt != null) {
					if (environment === 'development') {
						console.log('fetchCurrentUser! User still logged in but no longer exists in the db or was soft deleted');
						console.log('therefore log user out by destroying the session');
						console.log('-----');
					}

					/* User still logged in but no longer exists in the db or was soft deleted, so log user out */
					req.session.destroy();
				} else {
					/* make current user available application-wide */
					req.currentUser = user;
				}

				next();
			});
		}
	};
};