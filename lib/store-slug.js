'use strict';

const Promise = require('bluebird');
const databaseError = require('database-error');

let duplicateName = {
	name: 'UniqueConstraintViolationError',
	table: 'slugs',
	column: 'name'
};

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
			function attemptStoreSlug(attempt) {
				return Promise.try(() => {
					return knex.transaction(function(trx) {
						return trx('slugs').insert({
							postId: postId,
							name: attempt === 1 ? name : `${name}-${attempt}`,
							isCurrent: true
						}).returning('name');
					});
				}).catch(databaseError.rethrow).catch(duplicateName, (err) => {
					return attemptStoreSlug(attempt + 1);
				});
			}

			return attemptStoreSlug(1);
		});
	};
};