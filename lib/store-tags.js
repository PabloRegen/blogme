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
				console.log(1);
				return knex('tags').insert({name: tagToStore}).returning('id');
			}).catch(databaseError.rethrow).catch(duplicateTag, (err) => {
				console.log(2);
				return knex('tags').update({deletedAt: null}).where({name: tagToStore}).returning('id');
			}).then((tagIds) => {
				console.log(3);
				return knex('tags_posts').insert({
					tagId: tagIds[0],
					postId: postId
				});
			// FIXME!!! Check why the databaseError catch is not working.
			// It catches the error but it stops there and renders the error which is not supposed to
			// Instead it should do nothing with it as per code
			// }).catch(databaseError.rethrow).catch(duplicateTagPost, (err) => {

			// Temp catch while fixing above catch
			}).catch((err) => {
				console.log(4);
				/* do nothing */
			});
		});	
	};
};