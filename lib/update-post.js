'use strict';

const Promise = require('bluebird');

module.exports = function(knex) {
	return function(req, postId) {
		console.log('update-post.js req.currentUser.id: ', req.currentUser.id);
		console.log('update-post.js req.body: ', req.body);
		console.log('update-post.js req.file: ', req.file);

		return Promise.try(() => {
			return knex('posts')
				.where({id: postId})
				.update({
					title: req.body.title,
					subtitle: req.body.subtitle,
					body: req.body.body,
					pic: (req.file != null ? req.file.filename : undefined),
					isDraft: (req.body.publish == null),
					updatedAt: knex.fn.now()
				});
		});
	};
};