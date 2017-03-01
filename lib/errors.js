// creates custom error types with custom status codes for specific scenarios

'use strict';

const createError = require('create-error');

let httpError = createError('httpError', {isBlogmeError: true});

module.exports = {
	UnauthorizedError: createError(httpError, 'UnauthorizedError', {statusCode: 401}),
	ForbiddenError:  createError(httpError, 'ForbiddenError', {statusCode: 403}),
	NotFoundError:  createError(httpError, 'NotFoundError', {statusCode: 404,}),
	ValidationError:  createError(httpError, 'ValidationError', {statusCode: 422})
};