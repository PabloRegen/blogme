'use strict';

const Promise = require('bluebird');

module.exports = function(knex) {
	return function(postId, tags) {
		console.log('store-tags.js postId: ', postId);
		console.log('store-tags.js tags: ', tags);

		return Promise.map(tags, (tag) => {
			console.log('store-tags.js tag: ', tag);

			return knex('tags')
				.insert({name: tag})
				.returning('id');
		}).map((tagIds) => {
			console.log('store-tags.js tagIds: ', tagIds);

			return knex('tags_posts')
				.insert({
					tagId: tagIds[0],
					postId: postId
				});
		});
	};
};