'use strict';

module.exports = function(req, res, next) {
	if (req.currentUser == null) {
		res.redirect('/accounts/signin');
	} else {
		next();
	}
};