'use strict';

const Promise = require('bluebird');

module.exports = function(knex) {
	return function(postId, tagsToKeep) {
		return Promise.try(() => {
			return knex('tags').whereIn('name', tagsToKeep).select('id');
		}).map((tag) => {
			return tag.id;
		}).then((tagIds) => {
			/* remove tags_posts associations for all tags removed by the user from this post and return their tag Ids */
			return knex('tags_posts').where({postId: postId}).whereNotIn('tagId', tagIds).del().returning('tagId');
		}).map((removedTagId) => {
			/* for each tag for which a tag association was removed, soft-delete the tag if there are no other associations for it */
			return knex('tags')
				.update({deletedAt: knex.fn.now()})
				.where({id: removedTagId})
				.whereNotExists(knex('tags_posts').select(1).where({tagId: removedTagId}));
				// .whereNotExists(function() {
				// 	this.select(1).from('tags_posts').where({tagId: removedTagId});
				// });
		});
	};
};