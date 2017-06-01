'use strict';

const Promise = require('bluebird');
const databaseError = require('database-error');

let duplicateTag = {
	name: 'UniqueConstraintViolationError',
	table: 'tags',
	column: 'name'
};

module.exports = function(trx) {
	return function(postId, tagsToStore) {

		let storeTagAssociation = function(tagId) {
			// console.log('store-tags.js storeTagAssociation tagId: ', tagId);

			return trx('tags_posts').insert({
				tagId: tagId,
				postId: postId
			});
		};

		return Promise.map(tagsToStore, (tagToStore) => {
			// tagsToStore - array of tags provided by user (to be stored if they are new ones)
			// console.log('store-tags.js tagToStore: ', tagToStore);

			return Promise.try(() => {
				return trx('tags').insert({name: tagToStore}).returning('id');
			}).then((tagIds) => {
				// tagIds - array containing the tag id for the just stored tag
				// console.log('store-tags.js tagIds: ', tagIds);

				return storeTagAssociation(tagIds[0]);
			}).catch(databaseError.rethrow).catch(duplicateTag, (err) => {
				/* tagToStore already exists in the db */
				// console.log('store-tags.js pre-existing tagToStore: ', tagToStore);

				return Promise.try(() => {
					return trx('tags').update({deletedAt: null}).where({name: tagToStore}).returning('id');
				}).then((existingTagIds) => {
					// existingTagIds - array containing the tag id for the just updated tag deletedAt column
					// console.log('store-tags.js existingTagIds: ', existingTagIds);

					return Promise.try(() => {
						return trx('tags_posts').where({
							tagId: existingTagIds[0], 
							postId: postId
						});
					}).then((tagAssociations) => {
						// tagAssociations - array of 0 or 1 tag associations
						// console.log('store-tags.js tagAssociations: ', tagAssociations, ' for tagId: ', existingTagIds[0]);

						if (tagAssociations.length === 0) {	
							// relationship between tag & post doesn't exist yet, so create it
							// console.log(`store-tags.js - relationship between tag id ${existingTagIds[0]} & post doesn't exist yet, so create it`);

							return storeTagAssociation(existingTagIds[0]);
						}
					});
				});
			});
		});	
	};
};