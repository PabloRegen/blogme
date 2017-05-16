'use strict';

const Promise = require('bluebird');

module.exports = function(knex) {
	return function(postId, tags) {
		// console.log('store-tags.js postId: ', postId);
		// console.log('store-tags.js tags: ', tags);

		return Promise.try(() => {
			return tags;
		}).map((tag) => {
			// console.log('store-tags.js tag: ', tag);

			return Promise.try(() => {
				return knex('tags')
					.where({name: tag})
					.select('name');
					// .returning('name');
			}).then((tag) => {
				if (tag == null) {
					return knex('tags')
						.insert({name: tag})
						.returning('id');
				} else {
					return knex('tags')
						.where({name: tag})
						.select('id');
						// .returning('id');
				}
			}).then((tagId) => {
				// console.log('store-tags.js tagId: ', tagId);
				return knex('tags_posts')
					.insert({
						tagId: tagId[0],
						postId: postId
					});
			});
		});
	};
};