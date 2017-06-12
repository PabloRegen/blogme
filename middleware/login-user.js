'use strict';

module.exports = function(req, res, next) {
	/* add loginUser method to req, app.use it on server.js and call it from routes */
	req.loginUser = function(userID) {
		req.session.userId = userID;
		return req.saveSession();
	};
	
	next();
};