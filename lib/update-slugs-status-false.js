'use strict';

const Promise = require('bluebird');

module.exports = function(knex) {
	return function(postId) {
		return Promise.try(() => {
			console.log('update-slugs-status-false.js postId: ', postId);

			return knex('slugs')
				.where({
					postId: postId, 
					isCurrent: true
				})
				.update({isCurrent: false});
		});
	};
};