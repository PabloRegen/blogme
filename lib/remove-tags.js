'use strict';

const Promise = require('bluebird');

module.exports = function(knex) {
	return function(postId, tagsToKeep) {
		return Promise.try(() => {
			return knex('tags').whereIn('name', tagsToKeep).select('id');
		}).map((tag) => {
			return tag.id;
		}).then((tagIds) => {
			return Promise.try(() => {
				/* remove tags_posts associations for all tags removed by the user in this post */
				return knex('tags_posts').where({postId: postId}).whereNotIn('tagId', tagIds).del().returning('tagId');
			}).then((removedTagIds) => {
				return Promise.map(removedTagIds, (removedTagId)  => {
					return Promise.try(() => {
						/* check whether the removed tagIds are still associated to posts other than this one */
						return knex('tags_posts').where({tagId: removedTagId});
					}).then((tagAssociations) => {
						if (tagAssociations.length === 0) {
							return knex('tags').where({id: removedTagId}).update({deletedAt: knex.fn.now()});
						}
					});
				});
			});
		});
	};
};