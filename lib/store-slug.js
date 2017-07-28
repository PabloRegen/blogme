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
			console.log('--------');
			console.log('function storeSlug');
			console.log('postId: ', postId);
			console.log('name: ', name);
			console.log('attempt: ', attempt);
			console.log('about to update slugs isCurrent: false');

			return knex('slugs').where({
				postId: postId,
				isCurrent: true
			}).update({
				isCurrent: false
			});
		}).then(() => {
			console.log('--------');
			console.log('about to insert new slug with attempt # : ', attempt);

			return knex('slugs').insert({
				postId: postId,
				name: attempt === 1 ? name : `${name}-${attempt}`,
				isCurrent: true
			}).returning('name');
		}).catch(databaseError.rethrow).catch(duplicateName, (err) => {
			console.log('--------');
			console.log('store-slug.js - .catch database error');
			return storeSlug(postId, name, attempt + 1);			
		}).catch((err) => {
			console.log('--------');
			console.log('store-slug.js - .catch all error');
			console.log(err);
		});
	};
};