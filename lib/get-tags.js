'use strict';

const Promise = require('bluebird');

module.exports = function(knex) {
	return function(postId) {
		let postTags = [];

		return Promise.try(() => {
			return knex('tags_posts')
				.where({postId: postId})
				.select('tagId')
				.orderBy('tagId');
		}).map((tagIdObj) => {
			console.log('tagIdObj: ', tagIdObj);

			return knex('tags')
				.where({id: tagIdObj.tagId})
				.select('name');
		}).map((tagsObj) => {
			console.log('tagsObj: ', tagsObj);

			return postTags.push(tagsObj[0].name);
		}).then(() => {
			return postTags;
		});
	};
};