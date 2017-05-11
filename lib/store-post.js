'use strict';

const Promise = require('bluebird');

module.exports = function(knex) {
	return function(req) {
		console.log('store-post.js req.currentUser.id: ', req.currentUser.id);
		console.log('store-post.js req.body: ', req.body);
		console.log('store-post.js req.file: ', req.file);

		return knex('posts')
			.insert({
				userId: req.currentUser.id,
				title: req.body.title,
				subtitle: req.body.subtitle,
				body: req.body.body,
				pic: (req.file != null ? req.file.filename : undefined),
				isDraft: (req.body.publish == null)
			})
			.returning('id');
	};
};