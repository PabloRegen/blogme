'use strict';

const Promise = require('bluebird');
const databaseError = require('database-error');

let duplicateTag = {
	name: 'UniqueConstraintViolationError',
	table: 'tags',
	column: 'name'
};

let duplicateTagPost = {
	name: 'UniqueConstraintViolationError',
	table: 'tags_posts',
	columns: ['tagId', 'postId']
};

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
					return storeTagAssociation(existingTagIds[0]);
				}).catch(databaseError.rethrow).catch(duplicateTagPost, (err) => {
					// do nothing
				});
			});
		});	
	};
};