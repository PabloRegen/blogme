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
		return Promise.map(tagsToStore, (tagToStore) => {
			return Promise.try(() => {
				return knex('tags').insert({name: tagToStore}).returning('id');
			}).catch(databaseError.rethrow).catch(duplicateTag, (err) => {
				return knex('tags').update({deletedAt: null}).where({name: tagToStore}).returning('id');
			}).then((tagIds) => {
				return knex('tags_posts').insert({
					tagId: tagIds[0],
					postId: postId
				});
			// FIXME!!! Substitute catch all for databaseError catch only errors when the library's composite unique constraint is fixed
			// Currently catches the duplicateTagPost error but it stops there and renders it instead of doing nothing as per code
			// }).catch(databaseError.rethrow).catch(duplicateTagPost, (err) => {
			}).catch((err) => {
				/* do nothing */
			});
		});	
	};
};