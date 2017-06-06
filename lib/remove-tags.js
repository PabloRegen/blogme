'use strict';

const Promise = require('bluebird');

module.exports = function(knex) {
	return function(postId, tagsToKeep) {
		return Promise.try(() => {
			return knex('tags').whereIn('name', tagsToKeep).select('id');
		}).map((tag) => {
			return tag.id;
		}).then((tagIds) => {
			/* remove tags_posts associations for all tags removed by the user */
			return knex('tags_posts').delete().whereNotIn('tagId', tagIds).where({postId: postId}).returning('tagId');
		}).then((removedTagIds) => {
			/* for each tag for which a tag association was removed, soft-delete the tag if there are no other associations for it */
			return knex('tags').whereIn('id', removedTagIds).update({deletedAt: knex.fn.now()}).whereNotExists(function() {
				/* SELECT(1) increases performance since the column result of the subquery is not relevant (only the rows returned matters) */
				this.select(1).from('tags_posts').whereRaw('tags.id = tags_posts."tagId"');
			});
		});
	};
};