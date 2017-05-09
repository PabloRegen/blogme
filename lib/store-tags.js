'use strict'

module.exports = function(postId, tags) {
	return Promise.try(() => {
		return tags;
	}).map((tag) => {
		return knex('tags')
			.insert({name: tag})
			.returning('id');
	}).map((tagId) => {
		return knex('tags_posts')
			.insert({
				tagId: tagId[0],
				postId: postId
			});
	});
};