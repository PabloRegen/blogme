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
				if (diff.removed.length > 0) {
					// CASE tag removed from post
					// 1a) this was the only association, so the tag itself should be removed as well
					// 1b) this was NOT the only association, so the tag itself shouldn't be removed
					return Promise.map(diff.removed, (removedTag) => {
						console.log('SRT.js removedTag: ', removedTag);

						return knex('tags').where({name: removedTag.name}).returning('id');
					}).then((tagId) => {
						console.log('SRT.js tagId: ', tagId);

						return Promise.try(() => {
							return knex('tags_posts').delete().where({
								tagId: tagId[0].id,
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

							if (additionalTagPostAssociation == null) {
								return knex('tags').update({deletedAt: knex.fn.now()}).where({tagId: tagId});
							}
						});
					});
				}
			}).then(() => {
				// CASE tag added to post
				// 2a) the tag already existed; we need to do nothing except for adding the association (NOTE: and update deletedAt to null?)
				// 2b) the tag did not exist yet; we need to create the tag first, and THEN create the association
				return Promise.map(diff.added, (addedTag) => {
					return Promise.try(() => {
						console.log('SRT.js addedTag: ', addedTag);

						return knex.transaction(function(trx) {
							return trx('tags').insert({name: addedTag.name}).returning('id');
						});
					}).catch(databaseError.rethrow).catch(duplicateTag, (err) => {
						return knex('tags').update({deletedAt: null}).where({name: addedTag.name}).returning('id');
					}).then((tagIds) => {
						console.log('SRT.js tagIds: ', tagIds);

						return knex('tags_posts').insert({
							tagId: tagIds[0],
							postId: postId
						});
					});
				});
			});
		});
	};
};