'use strict';

const http = require('http');

module.exports = function(environment) {
	return function(err, req, res, next) {
		console.log(err);

		if (res.headersSent) {
			console.log('res.headersSent === true');
			// the headers have already been sent to the client so we can't start writing a new response
			// therefore delegate error to Express's default error handling mechanism which kills the connection
    		return next(err);
  		} else {
  			let errorCode;

  			if (err.isCustomBlogmeError) {
  				errorCode = err.statusCode;
  			} else {
  				errorCode = 500;
  			}

	  		res.status(errorCode);

			if (environment === 'development') {
				// display the error massage along with stack for debugging
				res.render('error', {title: 'error', errorTitle: err.message, errorStacktrace: err.stack});
			} else {
				if (errorCode >= 400 && errorCode < 500) {
					// client error -> display the error massage
					res.render('error', {title: 'error', errorTitle: err.message});
				} else {
					// non client error -> display short description of a standard HTTP response status code
					// to prevent exposing internal data
					res.render('error', {title: 'error', errorTitle: http.STATUS_CODES[errorCode]});
				}
			}
  		}
	};
};