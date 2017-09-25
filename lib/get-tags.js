'use strict';

const Promise = require('bluebird');

module.exports = function(knex) {
	return function(postId) {
		return Promise.try(() => {
			return knex('tags_posts').where({postId: postId}).select('tagId');
		}).map((tagAssociation) => {
			console.log('tagAssociation: ', tagAssociation);

			return knex('tags').where({id: tagAssociation.tagId}).first().select('name');
		}).map((tag) => {
			console.log('tag: ', tag);

			return tag.name;
		});
	};
};