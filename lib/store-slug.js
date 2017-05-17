'use strict';

const Promise = require('bluebird');

module.exports = function(knex) {
	return function(postId, name) {
		return Promise.try(() => {
			console.log('store-slug.js postId: ', postId);
			console.log('store-slug.js name: ', name);

			return knex('slugs')
				.insert({
					postId: postId,
					name: name,
					isCurrent: true
				});
		});
	};
};