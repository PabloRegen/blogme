'use strict';

const Promise = require('bluebird');

module.exports = function(knex) {
	return function(req, res, next) {
		if (req.session.userId == null) {
			/* User not logged in */
			next();
		} else {
			return Promise.try(() => {
				return knex('users').where({id: req.session.userId});
			}).then((users) => {
				let user = users[0];

				if (users.length === 0 || user.deletedAt != null) {
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