'use strict';

const Promise = require('bluebird');

module.exports = function(knex) {
	return function(postId, tags) {
		console.log('store-tags.js postId: ', postId);
		console.log('store-tags.js tags: ', tags);

		return Promise.try(() => {
			return tags;
		}).map((tag) => {
			console.log('store-tags.js tag: ', tag);

			return knex('tags')
				.insert({name: tag})
				.returning('id');
		}).map((tagId) => {
			console.log('store-tags.js tagId: ', tagId);

			return knex('tags_posts')
				.insert({
					tagId: tagId[0],
					postId: postId
				});
		});
	};
};