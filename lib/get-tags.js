'use strict';

const Promise = require('bluebird');

module.exports = function(knex) {
	return function(postId) {
		return Promise.try(() => {
			return knex('tags_posts').where({postId: postId}).select('tagId').orderBy('tagId');
		}).map((tagAssociation) => {
			console.log('tagAssociation: ', tagAssociation);

			return knex('tags').where({id: tagAssociation.tagId}).select('name');
		}).map((tags) => {
			console.log('tags: ', tags);

			return tags[0].name;
		});
	};
};