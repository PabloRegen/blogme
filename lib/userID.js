'use strict';

const Promise = require('bluebird');
const rfr = require('rfr');
const errors = rfr('lib/errors');

module.exports = function(knex) {
	return function(username, currentUser) {
		return Promise.try(() => {
			if (username == null) {
				return currentUser.id;
			} else if (currentUser.role < 2) {
				throw new errors.ForbiddenError('You do not have the required permissions to access this page');
			} else if (username.trim() === '') {
				throw new Error('Please enter the username to be submitted');
			} else {
				return Promise.try(() => {
					return knex('users').where({username: username.trim()}).first();
				}).then((user) => {
					if (user == null) {
						throw new Error('This username does not exist');
					} else {
						return user.id;
					}
				});
			}
		});
	};
};