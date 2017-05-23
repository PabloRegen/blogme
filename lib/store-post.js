'use strict';

const Promise = require('bluebird');

module.exports = function(knex) {
	return function(post) {
		return Promise.try(() => {
			return knex('posts').insert(post).returning('id');
		});
	};
};