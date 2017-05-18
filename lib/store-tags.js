'use strict';

const Promise = require('bluebird');

module.exports = function(knex) {
	return function(postId, tags) {
		return Promise.map(tags, (tag) => {
			console.log('store-tags.js tag: ', tag);

			return Promise.try(() => {
				return knex('tags')
					.where({name: tag})
					.select('name');
			}).then((dbTags) => {
				console.log('store-tags.js dbTags: ', dbTags);

				if (dbTags[0] == null) {
					return knex('tags')
						.insert({name: tag})
						.returning('id');
				} else {
					return knex('tags')
						.where({name: tag})
						.select('id');
				}
			}).then((tagIds) => {
				console.log('store-tags.js tagIds: ', tagIds);

				let tagId;

				if (typeof tagIds[0] === 'number') {
					tagId = tagIds[0];
				} else {
					tagId = tagIds[0].id;
				}

				return knex('tags_posts')
					.insert({
						tagId: tagId,
						postId: postId
					});
			});
		});
	};
};