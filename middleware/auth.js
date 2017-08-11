'use strict';

const rfr = require('rfr');
const errors = rfr('lib/errors');

module.exports = function(knex, requiredRole) {
	return function(req, res, next) {
		if (req.currentUser.role >= requiredRole || req.currentUser.id === req.post.userId) {
			/* currentUser has enough permission or owns post */
			next();
		} else {
			throw new errors.UnauthorizedError('You do not have the required permissions to access this page');
			// next(new errors.UnauthorizedError('You do not have the required permissions to access this page'));
		}
	};
};