'use strict';

const Promise = require('bluebird');
const databaseError = require('database-error');
const rfr = require('rfr');
const storeSlug = rfr('lib/store-slug');

let duplicateName = {
	name: 'UniqueConstraintViolationError',
	table: 'slugs',
	column: 'name'
};

module.exports = function(knex) {
	return function(postId, name) {
		return Promise.try(() => {
			console.log('store-slug.js');
			console.log('name1: ', name);

			return knex('slugs').where({
				postId: postId,
				isCurrent: true
			}).update({
				isCurrent: false
			});
		}).then(() => {
			console.log('name2: ', name);

			return knex('slugs').insert({
				postId: postId,
				name: name,
				isCurrent: true
			});
		}).catch(databaseError.rethrow).catch(duplicateName, (err) => {
			console.log('I was caught at database error duplicateName');
			console.log('name3: ', name);

			let name = `${name}-2`;

			console.log('name4: ', name);

			storeSlug(knex)(postId, name);
		});
	};
};