'use strict';

const Promise = require('bluebird');

module.exports = function(trx) {
	return function(postId, name) {
		return Promise.try(() => {
			console.log('store-slug.js postId: ', postId);
			console.log('store-slug.js name: ', name);

			return trx('slugs').where({
				postId: postId, 
				isCurrent: true
			}).update({
				isCurrent: false
			});
		}).then(() => {
			return trx('slugs').insert({
				postId: postId,
				name: name,
				isCurrent: true
			});
		});
	};
};