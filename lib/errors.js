// creates custom error types with custom status codes for specific scenarios

'use strict';

const createError = require('create-error');

// FIXME! {isCustomBlogmeError: true} not being inherited by the erros below. May be a bug in the library
let httpError = createError('httpError', {isCustomBlogmeError: true});

module.exports = {
	// these errors inherit from httpError class
	// FIXME! Whenever library bug is fixed, delete `isCustomBlogmeError: true` property from these errors
	UnauthorizedError: createError(httpError, 'UnauthorizedError', {statusCode: 401, isCustomBlogmeError: true}),
	ForbiddenError:  createError(httpError, 'ForbiddenError', {statusCode: 403, isCustomBlogmeError: true}),
	NotFoundError:  createError(httpError, 'NotFoundError', {statusCode: 404, isCustomBlogmeError: true}),
	ValidationError:  createError(httpError, 'ValidationError', {statusCode: 422, isCustomBlogmeError: true})
};