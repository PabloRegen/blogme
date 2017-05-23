'use strict';

const Promise = require('bluebird');

module.exports = function(knex) {
	return function(postId, tagsKeep) {

		// map over array of tags to keep
		return Promise.map(tagsKeep, (tagKeep) => {
			console.log('remove-tags.js tagKeep: ', tagKeep);

			// for each tag to keep select the id on "tags" table -> retuns an array of objects per tag
			return knex('tags').where({name: tagKeep}).select('id');
		// map over array of arrays of objects each containing a tag id to keep
		}).map((tagIdsObjKeep) => {
			console.log('remove-tags.js tagIdsObjKeep: ', tagIdsObjKeep);

			// cleaning: for each array of objects containing a tag id to keep return the id
			return tagIdsObjKeep[0].id;
		}).then((tagIdsKeep) => {
			// tagIdsKeep is an array of tag ids to keep
			console.log('remove-tags.js tagIdsKeep: ', tagIdsKeep);

			return Promise.try(() => {
				// delete any existing relationship on "tags_posts" between this post and tagIds not included in tagIdsKeep 
				return knex('tags_posts').where({postId: postId}).whereNotIn('tagId', tagIdsKeep).del();
			}).then(() => {
				// need to correct the code below
				// I should record which tagIds were deleted from tag_posts
				// for each one of those tagIds I should check if there are any still being used on "tags_posts"
				// and if not in use, update the deletedAt column on "tags" table

				// map over tagIdsKeep
				return Promise.map(tagIdsKeep, (tagIdKeep)  => {
					console.log('remove-tags.js tagIdKeep: ', tagIdKeep);

					return Promise.try(() => {
						// get all remaining rows where tagId
						return knex('tags_posts').where({tagId: tagIdKeep});
					}).then((tagIdsObjKeep) => {
						console.log('remove-tags.js tagIdsObjKeep: ', tagIdsObjKeep);
						if (tagIdsObjKeep == null) {
							return knex('tags').where({id: tagIdKeep}).update({deletedAt: knex.fn.now()});
						}
					});
				});
			});
		});
	};
};