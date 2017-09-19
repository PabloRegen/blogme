'use strict';

const Promise = require('bluebird');
const databaseError = require('database-error');
const simpleArrayDiff = require('simple-array-diff');

let duplicateTag = {
	name: 'UniqueConstraintViolationError',
	table: 'tags',
	column: 'name'
};

module.exports = function(knex) {
	return function(postId, newTags) {
		let wrappedNewTags = newTags.map((newTag) => {
			return {name: newTag};
		});

		return Promise.try(() => {
			return knex('tags_posts').where({postId: postId});
		}).map((tagPostAssociation) => {
			console.log('SRT.js tagPostAssociation: ', tagPostAssociation);
			
			return Promise.try(() => {
				return knex('tags').where({id: tagPostAssociation.tagId}).first();
			}).then((tag) => {
				console.log('SRT.js tag: ', tag);

				return {
					name: tag.name, 
					postId: postId
				};
			});
		}).then((existingAssociatedTags) => {
			console.log('SRT.js existingAssociatedTags: ', existingAssociatedTags);
			console.log('SRT.js wrappedNewTags: ', wrappedNewTags);

			let diff = simpleArrayDiff(existingAssociatedTags, wrappedNewTags, 'name');
			console.log('SRT.js diff: ', diff);

			return Promise.try(() => {
				/* CASE 1: tag removed from post
				1a) this was the only association with a post, so remove the tag itself as well (ie. populate updatedAt)
				1b) this was NOT the only association, so do not remove the tag itself (ie. don't populate updatedAt) */
				return Promise.map(diff.removed, (removedTag) => {
					return Promise.try(() => {
						console.log('SRT.js removedTag: ', removedTag);

						return knex('tags').where({name: removedTag.name}).first().returning('id');
					}).then((result) => {
						console.log('SRT.js result: ', result);

						let tagId = result.id;

						return Promise.try(() => {
							return knex('tags_posts').delete().where({
								tagId: tagId,
								postId: postId
							});
						}).then((deletedAssociations) => {
							// FIXME!!! Apply optimistic concurrency control to prevent race condition - check if deleted 0 or 1 item
							// if (deletedAssociations.length = 0) {
							// 	// failed - need to throw an error and re-fetch the data
							// } else {
								return knex('tags_posts').where({tagId: tagId}).first();
							// }
						}).then((additionalTagPostAssociation) => {
							console.log('SRT.js additionalTagPostAssociation: ', additionalTagPostAssociation);

							if (additionalTagPostAssociation == null) { // FIXME!!! check the length of the resulting array if any instead?
								/* case 1a */
								return knex('tags').update({deletedAt: knex.fn.now()}).where({id: tagId});
							}
						});
					});
				});
			}).then(() => {
				/* CASE 2: tag added to post
				2a) the tag did not exist yet, so 1) create the tag first and THEN 2) create the association
				2b) the tag already existed, so 1) update deletedAt to null 2) create the association */
				return Promise.map(diff.added, (addedTag) => {
					return Promise.try(() => {
						console.log('SRT.js addedTag: ', addedTag);

						return knex('tags').insert({name: addedTag.name}).returning('id'); // returns [335]
					}).catch(databaseError.rethrow).catch(duplicateTag, (err) => {
						// FIXME!!! error when input an existing tag on a new post - even when using `}).catch((err) => {` instead

						/* the tag already existed, so 1) update deletedAt to null */
						return knex('tags').update({deletedAt: null}, 'id').where({name: addedTag.name});
					}).then((tagIds) => {
						console.log('SRT.js tagIds: ', tagIds);

						return knex('tags_posts').insert({
							tagId: tagIds[0], // FIXME!!! check if tagIds[0].id instead for the id returned from the catch
							postId: postId
						});
					});
				}, {concurrency: 1}); // FIXME!!! Do I still need this if I removed a subtransaction here? Stll getting error without it!!!
			});
		});
	};
};