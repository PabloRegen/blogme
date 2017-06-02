'use strict';

const Promise = require('bluebird');

module.exports = function(trx) {
	return function(postId, post) {
		return Promise.try(() => {
			return trx('posts').where({id: postId}).update(post);
		});
	};
};