'use strict';

module.exports = function(environment, whichReqBody, reqBody) {
	if (environment === 'development') {
		console.log(whichReqBody);
		console.log(reqBody);
	}
};