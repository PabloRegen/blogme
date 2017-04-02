'use strict';

const Promise = require('bluebird');
const expressPromiseRouter = require('express-promise-router');
const rfr = require('rfr');

const requireSignin = rfr('middleware/require-signin');

module.exports = function(knex, environment) {
	let router = expressPromiseRouter();

	/* create */
	router.get('/create', requireSignin, (req, res) => {
		res.render('posts/create');
	});

	router.post('/create', requireSignin, (req, res) => {
		if (environment === 'development') {
			console.log('create post - req.body:');
			console.log(req.body)
		}

		return Promise.try(() => {
			return knex('posts').insert({
				userId: req.currentUser.id,
				title: req.body.title,
				subtitle: req.body.subtitle,
				body: req.body.body
			}).returning('id');
		}).then((postId) => {
			res.redirect(`/posts/${postId}`);
		});
	});

	/* read */
	router.get('/:id', (req, res) => {
		return Promise.try(() => {
			return knex('posts').where({id: req.params.id});
		}).then((posts) => {
			if (posts.length === 0) {
				throw new Error('The selected post does not exist');
			} else {
				res.render('posts/read', {
					post: posts[0]
				});
			}
		});
	});

	/* edit */
	router.get('/:id/edit', requireSignin, (req, res) => {
		return Promise.try(() => {
			return knex('posts').where({id: req.params.id});
		}).then((posts) => {
			if (posts.length === 0) {
				throw new Error('The selected post does not exist');
			} else {	
				res.render('posts/edit', {
					post: posts[0]
				});
			}
		});
	});

	router.post('/:id/edit', requireSignin, (req, res) => {
		if (environment === 'development') {
			console.log(req.body)
		}

		return Promise.try(() => {
			return knex('posts')
				.where({id: req.params.id})
				.update({
					title: req.body.title,
					subtitle: req.body.subtitle,
					body: req.body.body,
					updatedAt: knex.fn.now()
				})
			;
		}).then(() => {
			res.redirect(`/posts/${req.params.id}`);
		});
	});

	/* delete */

	return router;
};