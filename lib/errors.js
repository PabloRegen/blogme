// creates custom error types for specific scenarios

'use strict';

const createError = require('create-error');

// FIXME! {isCustomBlogmeError: true} not being inherited by the errors below. May be a bug in the library 
// see open issue https://github.com/tgriesser/create-error/issues/9
// let httpError = createError('httpError', {isCustomBlogmeError: true});
let httpError = createError('httpError');

module.exports = {
	// these errors inherit from httpError class
	// FIXME! Whenever bug is fixed, remove `isCustomBlogmeError: true` property from these errors and add it back to httpError
	UnauthorizedError: createError(httpError, 'UnauthorizedError', {statusCode: 401, isCustomBlogmeError: true}),
	ForbiddenError:  createError(httpError, 'ForbiddenError', {statusCode: 403, isCustomBlogmeError: true}),
	NotFoundError:  createError(httpError, 'NotFoundError', {statusCode: 404, isCustomBlogmeError: true}),
	ValidationError:  createError(httpError, 'ValidationError', {statusCode: 422, isCustomBlogmeError: true}),
	AlreadyDeletedError:  createError('AlreadyDeletedError')
};