'use strict';

const Promise = require('bluebird');

module.exports = function(knex) {
	return function(postId, tags) {

		let store_tagId_postId = function(tagId) {
			console.log('store-tags.js store_tagId_postId tagId: ', tagId);

			return knex('tags_posts').insert({
				tagId: tagId,
				postId: postId
			});
		};

		return Promise.map(tags, (tag) => {
			console.log('store-tags.js tag: ', tag);

			return Promise.try(() => {
				return knex('tags').where({name: tag});
			}).then((dbTagsObj) => {
				console.log('store-tags.js dbTagsObj: ', dbTagsObj);

				let dbTag = dbTagsObj[0];

				if (dbTag == null) {
					/* it's a new tag */
					console.log('store-tags.js new tag: ', tag);

					return Promise.try(() => {
						return knex('tags').insert({name: tag}).returning('id');
					}).then((tagIds) => {
						console.log('store-tags.js tagIds: ', tagIds);

						return store_tagId_postId(tagIds[0]);
					});
				} else {
					/* it's a pre-existing tag */
					console.log('store-tags.js pre-existing tag: ', tag);

					return Promise.try(() => {
						return knex('tags').where({name: tag}).update({deletedAt: null});
					}).then(() => {
						return knex('tags_posts').where({tagId: dbTag.id, postId: postId});
					}).then((tags_postsObj) => {
						console.log('store-tags.js tags_postsObj: ', tags_postsObj);

						if (tags_postsObj[0] == null) {	
							// relationship between tag & post doesn't exist yet
							console.log("store-tags.js - relationship between tag & post doesn't exist yet");

							return store_tagId_postId(dbTag.id);
						}
					});
				}
			});
		});	
	};
};