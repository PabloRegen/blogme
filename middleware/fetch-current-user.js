'use strict';

const Promise = require('bluebird');

module.exports = function(knex) {
	return (req, res, next) => {
		if (req.session.userId == null) {
			/* User not logged in */
			next();
		} else {
			return Promise.try(() => {
				return knex('users').where({id: req.session.userId});
			}).then((users) => {
				if (users.length === 0) {
					/* User still logged in but no longer exists in the db so log user out */
					// need to check user soft delete and suspended cases as well!
					req.session.destroy;
					// next()???
				} else {
					/* make current user available application-wide */
					req.currentUser = users[0];
					next();
				}
			});
		}
	};
};