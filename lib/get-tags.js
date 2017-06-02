'use strict';

const Promise = require('bluebird');

module.exports = function(knex) {
	return function(postId) {
		return Promise.try(() => {
			return knex('tags_posts').where({postId: postId}).select('tagId').orderBy('tagId');
		}).then((tagAssociations) => {
			console.log('tagAssociations: ', tagAssociations);

			return knex('tags').whereIn('id', tagAssociations[0].tagId).select('name');
		}).map((tag) => {
			console.log('tag: ', tag);

			return tag.name;
		});
	};
};