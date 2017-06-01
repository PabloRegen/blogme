'use strict';

const Promise = require('bluebird');

module.exports = function(trx) {
	return function(post) {
		return Promise.try(() => {
			return trx('posts').insert(post).returning('id');
		});
	};
};