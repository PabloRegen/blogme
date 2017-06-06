'use strict';

const Promise = require('bluebird');
const databaseError = require('database-error');

let duplicateTag = {
	name: 'UniqueConstraintViolationError',
	table: 'tags',
	column: 'name'
};

// let duplicateTagPost = {
// 	name: 'UniqueConstraintViolationError',
// 	table: 'tags_posts',
// 	column: 'name'
// };

module.exports = function(knex) {
	return function(postId, tagsToStore) {

		let storeTagAssociation = function(tagId) {
			return knex('tags_posts').insert({
				tagId: tagId,
				postId: postId
			});
		};

		return Promise.map(tagsToStore, (tagToStore) => {
			return Promise.try(() => {
				return knex('tags').insert({name: tagToStore}).returning('id');
			}).then((tagIds) => {
				return storeTagAssociation(tagIds[0]);
			}).catch(databaseError.rethrow).catch(duplicateTag, (err) => {
				/* tagToStore already exists in the db */
				return Promise.try(() => {
					return knex('tags').update({deletedAt: null}).where({name: tagToStore}).returning('id');
				}).then((existingTagIds) => {
					return Promise.try(() => {
						return knex('tags_posts').where({
							tagId: existingTagIds[0], 
							postId: postId
						});
					}).then((tagAssociations) => {
						if (tagAssociations.length === 0) {	
							/* relationship between tag & post doesn't exist yet, so create it */
							return storeTagAssociation(existingTagIds[0]);
						}
					});
				});
			});
		});	
	};
};