'use strict';

const rfr = require('rfr');
const errors = rfr('lib/errors');

module.exports = function(requiredRole, ownerAllowed = false) {
	return function(req, res, next) {
		if (req.currentUser.role >= requiredRole) {
			next();
		} else if (ownerAllowed && req.currentUser.id === req.ownerId) {
			next();
		} else {
			next(new errors.UnauthorizedError('You do not have the required permissions to access this page'));
		}
	};
};