'use strict';

module.exports = function(req, res, next) {
	console.log('require-signin middleware!');
	console.log('-----');

	if (req.currentUser == null) {
		console.log('currentUser == null so redirect to signin route!')
		res.redirect('/accounts/signin');
	} else {
		next();
	}
};