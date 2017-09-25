'use strict';

const Promise = require('bluebird');

module.exports = function(knex) {
	return function(postId, post) {
		return Promise.try(() => {
			return knex('posts').update(post).where({id: postId});
		});
	};
};