'use strict';

const Promise = require('bluebird');

module.exports = function(req, res, next) {
	req.loginUser = function(userID) {
		return Promise.try(() => {
			req.session.userId = userID;
			return req.saveSession();
		});
	};
	next();
};