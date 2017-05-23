'use strict';

const Promise = require('bluebird');

module.exports = function(knex) {
	return function(postId, post) {
		return Promise.try(() => {
			return knex('posts').where({id: postId}).update(post);
		});
	};
};