'use strict';

const http = require('http');

module.exports = function(environment) {
	return function(err, req, res, next) {
		if (environment === 'development') {
			console.log('error-handler.js');
			console.log(err);
		}

		if (res.headersSent) {
			if (environment === 'development') console.log('res.headersSent === true');
			/* the headers have already been sent to the client so we can't start writing a new response
			therefore delegate error to Express' default error handling mechanism which kills the connection */
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
				res.render('error', {
					errorTitle: err.message, 
					errorStacktrace: err.stack
				});
			} else {
				if (errorCode >= 400 && errorCode < 500) {
					res.render('error', {errorTitle: err.message});
				} else {
					/* send short description of standard HTTP response status code to avoid exposing internal data */
					res.render('error', {errorTitle: http.STATUS_CODES[errorCode]});
				}
			}
  		}
	};
};