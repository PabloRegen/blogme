'use strict';

const Promise = require('bluebird');

module.exports = function(knex) {
	return function(postId, name) {
		console.log('store-slugs.js postId: ', postId);
		console.log('store-slugs.js name: ', name);

		return Promise.try(() => {
			return knex('slugs')
				.insert({
					postId: postId,
					name: name,
					isCurrent: true
				});
		});
	};
};