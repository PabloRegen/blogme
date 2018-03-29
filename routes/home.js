'use strict';

const Promise = require('bluebird');
const expressPromiseRouter = require('express-promise-router');

module.exports = function(knex, environment) {
	let router = expressPromiseRouter();

	router.get('/', (req, res) => {
		return Promise.try(() => {
			return knex('posts').where({
				deletedAt: null,
				isVisible: true,
				isDraft: false
			}).orderBy('postedAt', 'desc').limit(10);
		}).map((post) => {
			return Promise.all([
				Promise.try(() => {
					return knex('slugs').where({
						postId: post.id,
						isCurrent: true
					}).first();
				}).then((slug) => {
					if (slug != null) {
						return slug;
					} else {
						throw new Error(`The slug is missing for post id # ${post.id}`);
					}
				}),
				knex('users').where({id: post.userId}).first()
			]).spread((slug, owner) => {
				return Object.assign(
					{}, 
					{slug: slug.name}, 
					{owner: owner},
					post
				);
			});
		}).then((postsWithSlugsAndOwner) => {
			res.render('home/home', {
				title: 'home',
				posts: postsWithSlugsAndOwner
			});
		});
	});

	router.get('/about', (req, res) => {
		res.render('home/about', {title: 'about'});
	});

	router.get('/contact', (req, res) => {
		res.render('home/contact', {title: 'contact'});
	});

	return router;
};