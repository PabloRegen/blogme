'use strict';

const Promise = require('bluebird');

module.exports = function(req, res, next) {
	/* add loginUser method to req, app.use it on server.js and call it from routes */
	req.loginUser = function(userID) {
		return Promise.try(() => {
			req.session.userId = userID;

			return req.saveSession();
		});
	};
	next();
};