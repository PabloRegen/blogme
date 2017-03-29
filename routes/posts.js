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
			res.redirect(`/posts/read/${postId}`);
		});
	});

	/* read */
	router.get('/read/:id', (req, res) => {
		return Promise.try(() => {
			return knex('posts').where({id: req.params.id});
		}).then((posts) => {
			if (posts.length === 0) {
				throw new Error('The selected post does not exist');
			} else {
				let post = posts[0];

				res.render('posts/read', {
					title: post.title,
					subtitle: post.subtitle,
					body: post.body
				});
			}
		});
	});

	/* edit */
	router.get('/edit/:id', requireSignin, (req, res) => {
		return Promise.try(() => {
			return knex('posts').where({id: req.params.id});
		}).then((posts) => {
			if (posts.length == 0) {
				throw new Error('The selected post does not exist');
			} else {
				let post = posts[0];
				
				res.render('posts/edit', {
					id: post.id,
					title: post.title,
					subtitle: post.subtitle,
					body: post.body
				});
			}
		});
	});

	router.post('/edit/:id', requireSignin, (req, res) => {
		if (environment === 'development') {
			console.log(req.body)
		}

		return Promise.try(() => {
			return knex('posts').where({id: req.params.id}).update({
				title: req.body.title,
				subtitle: req.body.subtitle,
				body: req.body.body
			});
		}).then(() => {
			res.redirect(`/posts/read/${req.params.id}`);
		});
	});

	/* delete */

	return router;
};