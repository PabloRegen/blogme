'use strict';

const Promise = require('bluebird');

module.exports = function(knex) {
	return function(postId) {
		let existingTags = [];

		return Promise.try(() => {
			return knex('tags_posts')
				.where({postId: postId})
				.select('tagId');
				// .returning('tagId');
		}).map((tagId) => {
			console.log('tagId: ', tagId);

			return knex('tags')
				.where({id: tagId.tagId})
				.select('name');
				// .returning('name');
		}).map((tags) => {
			console.log('tags: ', tags);

			return existingTags.push(tags[0].name);
		}).then(() => {
			return existingTags;
		});
	};
};