'use strict';

const Promise = require('bluebird');

module.exports = function(knex) {
	return function(postId) {
		return Promise.try(() => {
			return knex('tags_posts').where({postId: postId});
		}).map((tagAssociation) => {
			return knex('tags').where({id: tagAssociation.tagId}).first();
		}).map((tag) => {
			return tag.name;
		});
	};
};