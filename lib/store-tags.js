'use strict';

const Promise = require('bluebird');

module.exports = function(knex) {
	return function(postId, tagsToStore) {

		let storeTagAssociation = function(tagId) {
			// console.log('store-tags.js storeTagAssociation tagId: ', tagId);

			return knex('tags_posts').insert({
				tagId: tagId,
				postId: postId
			});
		};

		return Promise.map(tagsToStore, (tagToStore) => {
			// tagsToStore - array of tags provided by user (to be stored if they are new ones)
			// console.log('store-tags.js tagToStore: ', tagToStore);

			return Promise.try(() => {
				return knex('tags').where({name: tagToStore});
			}).then((existingTags) => {
				// existingTags - array of 0 or 1 tag, depending on if the tag already exists in the db
				// console.log('store-tags.js existingTags: ', existingTags);

				if (existingTags.length === 0) {
					/* it's a new tagToStore */
					// console.log('store-tags.js new tagToStore: ', tagToStore);

					return Promise.try(() => {
						return knex('tags').insert({name: tagToStore}).returning('id');
					}).then((tagIds) => {
						// tagIds - array containing the tag id for the just stored tag
						// console.log('store-tags.js tagIds: ', tagIds);

						return storeTagAssociation(tagIds[0]);
					});
				} else {
					/* it's a pre-existing tagToStore */
					// console.log('store-tags.js pre-existing tagToStore: ', tagToStore);

					let existingTag = existingTags[0];

					return Promise.try(() => {
						return knex('tags').where({name: tagToStore}).update({deletedAt: null});
					}).then(() => {
						return knex('tags_posts').where({tagId: existingTag.id, postId: postId});
					}).then((tagAssociations) => {
						// tagAssociations - array of 0 or 1 tag associations
						// console.log('store-tags.js tagAssociations: ', tagAssociations);

						if (tagAssociations.length === 0) {	
							// relationship between tag & post doesn't exist yet, so create it
							// console.log("store-tags.js - relationship between tag & post doesn't exist yet, so create it");

							return storeTagAssociation(existingTag.id);
						}
					});
				}
			});
		});	
	};
};