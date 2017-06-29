'use strict';

module.exports = function(req, res, next) {
	/* Allow loginUser method be called application-wide */
	req.loginUser = function(userID) {
		req.session.userId = userID;
		return req.saveSession();
	};
	
	next();
};