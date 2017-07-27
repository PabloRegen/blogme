'use strict';

const Promise = require('bluebird');
const databaseError = require('database-error');

let duplicateName = {
	name: 'UniqueConstraintViolationError',
	table: 'slugs',
	column: 'name'
};

module.exports = function(knex) {
	return function storeSlug(postId, name, attempt = 1) {
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
				name: attempt === 1 ? name : `${name}-${attempt}`,
				isCurrent: true
			}).returning('name');
		}).catch(databaseError.rethrow).catch(duplicateName, (err) => {
			console.log('I was caught at database error duplicateName');
			return storeSlug(postId, name, attempt + 1);
		});
	};
};