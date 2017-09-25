'use strict';

module.exports = function(req, res, next) {
	if (req.currentUser == null) {
		/* User is not logged-in. (fetchCurrentUSer did not populate req.currentUser) */
		res.redirect('/accounts/signin');
	} else {
		next();
	}
};