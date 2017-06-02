'use strict';

const Promise = require('bluebird');

module.exports = function(trx) {
	return function(postId, tagsToKeep) {
		return Promise.try(() => {
			return trx('tags').whereIn('name', tagsToKeep).select('id');
		}).map((tag) => {
			return tag.id;
		}).then((tagIds) => {
			/* remove tags_posts associations for all tags removed by the user */
			return trx('tags_posts').delete().whereNotIn('tagId', tagIds).where({postId: postId}).returning('tagId');
		}).then((removedTagIds) => {
			/* for each tag for which a tag association was removed, soft-delete the tag if there are no other associations for it */
			return trx('tags').whereIn('id', removedTagIds).update({deletedAt: trx.fn.now()}).whereNotExists(function() {
				/* SELECT(1) increases performance since the column result of the subquery is not relevant (only the rows returned matters) */
				this.select(1).from('tags_posts').whereRaw('tags.id = tags_posts."tagId"');
			});
		});
	};
};