'use stricts';

const Promise = require('bluebird');

module.exports = function(knex) {
	return function(userId, postImages) {
		return Promise.map(postImages, (postImage) => {
			return knex('postimages').insert(postImage);
		});
	};
};