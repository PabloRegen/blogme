'use strict';

module.exports = function(environment, whichReqFile, reqFile) {
	if (environment === 'development') {
		console.log(whichReqFile);
		console.log(reqFile);
	}
};