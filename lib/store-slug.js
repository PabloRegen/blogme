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
		function attemptStoreSlug(attempt) {
			return Promise.try(() => {
				return knex.transaction(function(trx) {
					return Promise.try(() => {
						return trx('slugs').where({
							postId: postId,
							isCurrent: true
						}).update({
							isCurrent: false
						});
					}).then(() => {
						return trx('slugs').insert({
							postId: postId,
							name: attempt === 1 ? name : `${name}-${attempt}`,
							isCurrent: true
						}).returning('name');
					});
				});
			}).catch(databaseError.rethrow).catch(duplicateName, (err) => {
				if (attempt < 100000) {
					return attemptStoreSlug(attempt + 1);
				} else {
					throw new Error('Too many posts have this title already! Please choose another title');
				}
			});
		}

		return attemptStoreSlug(1);
	};
};