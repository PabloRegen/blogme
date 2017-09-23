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
			}).orderBy('postedAt', 'desc').limit(5);
		}).map((post) => {
			return Promise.all([
				Promise.try(() => {
					return knex('slugs').where({
						postId: post.id,
						isCurrent: true
					}).first();
				}).then((slug) => {
					if (slug != null) {
						if (slug.name != null) {
							return slug;
						} else {
							throw new Error('The post slug name is missing');
						}
					} else {
						throw new Error('The post slug is missing');
					}
				}),
				Promise.try(() => {
					return knex('users').where({id: post.userId}).first();
				}).then((user) => {
					if (user != null) {
						if (user.username != null) {
							return user;
						} else {
							throw new Error('The post owner name is missing');
						}
					} else {
						throw new Error('The post owner is missing');
					}
				})
			]).spread((slug, owner) => {
				return Object.assign(
					{}, 
					{slug: slug.name}, 
					{owner: owner.username},
					post
				);
			});
		}).then((postsWithSlugsAndOwner) => {
			res.render('home/home', {
				title: 'home',
				postsWithSlugsAndOwner: postsWithSlugsAndOwner
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