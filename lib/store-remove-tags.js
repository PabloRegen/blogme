'use strict';

const Promise = require('bluebird');
const databaseError = require('database-error');
const simpleArrayDiff = require('simple-array-diff');

let duplicateTagPost = {
	name: 'UniqueConstraintViolationError',
	table: 'tags_posts',
	columns: ['tagId', 'postId']
};

module.exports = function(knex) {
	return function(postId, tags) {
		let wrappedTags = tags.map((tag) => {
			return {name: tag};
		});

		return Promise.try(() => {
			return knex('tags');
		}).then((existingTags) => {
			// console.log('existingTags: ', existingTags) // [ { id: 1, name: 'JS', deletedAt: null }, ...]
			// console.log('wrappedTags: ', wrappedTags)   // [ { name: 'Tags 002' }, { name: '000' }, ... ]

			let diff = simpleArrayDiff(existingTags, wrappedTags, 'name');
			// console.log('diff: ', diff)
				// diff:  { 
					// added:   [ { name: '111' }, { name: '000' } ],
  					// removed: [ { id: 8, name: '100', deletedAt: null }, ...],
  					// common:  [ { name: 'Tags 002' }, { name: 'Tags P002 Tags' } ] 
  				// }
  			return Promise.all([
				Promise.map(diff.added, (addedTag) => {
					return knex('tags').insert({name: addedTag.name}).returning('id');
				}).map((tagIds) => {
		  			return knex('tags_posts').insert({
						tagId: tagIds[0],
						postId: postId
					});
				}),
				Promise.map(diff.common, (commonTag) => {
					return knex('tags').update({deletedAt: null}).where({name: commonTag.name}).returning('id');
				}).map((tagIds) => {
					return knex('tags_posts').insert({
						tagId: tagIds[0],
						postId: postId
					});
				}).catch(databaseError.rethrow).catch(duplicateTagPost, (err) => {
					/* do nothing */
				}),
				Promise.map(diff.removed, (removedTag) => {
					/* remove tags_posts associations for all tags removed by the user */
					return knex('tags_posts').delete().whereNotIn('tagId', removedTag.id).where({postId: postId}).returning('tagId');
				}).then((removedTagIds) => {
					/* for each tag for which a tag association was removed, soft-delete the tag if there are no other associations for it */
					return knex('tags').whereIn('id', removedTagIds).update({deletedAt: knex.fn.now()}).whereNotExists(function() {
						/* SELECT(1) increases performance since the column result of the subquery is not relevant (only the rows returned matters) */
						this.select(1).from('tags_posts').whereRaw('tags.id = tags_posts."tagId"');
					});
				})
			]);
		});
	};
};