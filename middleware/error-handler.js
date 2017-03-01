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

  			if (err.isBlogmeError) {
  				errorCode = err.statusCode;
  			} else {
  				errorCode = 500;
  			}

	  		res.status(errorCode);

			if (environment === 'development') {
				res.render('error', {title: 'error', errorTitle: err.message, errorStacktrace: err.stack});
			} else {
				if (errorCode >= 400 && errorCode < 500) {
					res.render('error', {title: 'error', errorTitle: err.message});
				} else {
					res.render('error', {title: 'error', errorTitle: http.STATUS_CODES[errorCode]});
				}
			}

			// if ((errorCode >= 400 && errorCode < 500) || environment === 'development') {
			// 	// it's a client error or environment is 'development' (and needs debugging)
			// 	res.render('error', {title: 'error', error: err});
			// } else {
			// 	// send short description of a standard HTTP response status code
			// 	// to prevent from leaking internal data
			// 	res.render('error', {title: 'error', error: http.STATUS_CODES[errorCode]});
			// }
  		}
	};
};