'use strict';

const Promise = require('bluebird');

module.exports = function(knex) {
	return function(postId, name) {
		return Promise.try(() => {
			return knex('slugs').where({
				postId: postId,
				isCurrent: true
			}).update({
				isCurrent: false
			});
		}).then(() => {
			return knex('slugs').insert({
				postId: postId,
				name: name,
				isCurrent: true
			});
		});
	};
};