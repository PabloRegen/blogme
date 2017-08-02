'use strict';

const Promise = require('bluebird');
const expressPromiseRouter = require('express-promise-router');
const checkit = require('checkit');
const multer = require('multer');
const uuidV4 = require('uuid/v4');
const path = require('path');
const rfr = require('rfr');
const marked = require('marked');
const slug = require('slug');
const databaseError = require('database-error');

const requireSignin = rfr('middleware/require-signin');
const checkitPost = rfr('lib/checkit-post');
const splitFilterTags = rfr('lib/split-filter-tags');
const logReqBody = rfr('lib/log-req-body');
const logReqFile = rfr('lib/log-req-file');
const logError = rfr('lib/log-error');
const nullIfEmptyString = rfr('lib/null-if-empty-string');
const errors = rfr('lib/errors');

const storeTags = rfr('lib/store-tags');
// FIXME!!! Temp storeRemoveTags
const storeRemoveTags = rfr('lib/store-remove-tags');
const storeSlug = rfr('lib/store-slug');
const storePost = rfr('lib/store-post');
const removeTags = rfr('lib/remove-tags');
const updatePost = rfr('lib/update-post');

let duplicateLike = {
	name: 'UniqueConstraintViolationError',
	table: 'likedposts',
	columns: ['postId', 'userId']
};

let likingOwnPost = {
	name: 'CheckConstraintViolationError',
	table: 'likedposts',
	constraint: 'check_not_liking_self'
};

module.exports = function(knex, environment) {
	const getTags = rfr('lib/get-tags')(knex);

	let router = expressPromiseRouter();

	let storage = multer.diskStorage({
		destination: path.join(__dirname, '../uploads'),
		filename: (req, file, cb) => {
			cb(null, `${uuidV4()}-${file.originalname}`);
		}
	});

	let storeUpload = Promise.promisify(multer({storage: storage}).single('postPic'));

	let mustOwn = function(req, res, next) {
		if (req.post.userId !== req.currentUser.id) {
			next(new errors.ForbiddenError('This is not your post!'));
		} else {
			next();
		}
	};

	router.param('slug', (req, res, next, slugName) => {
		return Promise.try(() => {
			return knex('slugs').where({name: slugName}).first();
		}).then((slug) => {
			if (slug == null) {
				throw new Error('The selected post does not exist');
			} else if (slug.isCurrent) {
				return Promise.try(() => {
					return knex('posts').where({id: slug.postId}).first();
				}).then((post) => {
					if (post == null) {
						throw new Error('The selected post does not exist');
					} else {
						req.post = post;
						/* resolve 'next' (as a string) to make express-promise-router call next() internally */
						return 'next';
					}
				});
			} else {
				return Promise.try(() => {
					return knex('slugs').where({
						postId: slug.postId,
						isCurrent: true
					}).first();
				}).then((slug) => {
					res.redirect(`/posts/${slug.name}`);
				});
			}
		});
	});

	/* create */
	router.get('/create', requireSignin(environment), (req, res) => {
		res.render('posts/create');
	});

	router.post('/create', requireSignin(environment), (req, res) => {
		return Promise.try(() => {
			return storeUpload(req, res);
		}).then(() => {
			logReqBody(environment, 'POST/create req.body: ', req.body);
			logReqFile(environment, 'POST/create req.file: ', req.file);

			return checkitPost(req.body);
		}).then(() => {
			return knex.transaction(function(trx) {
				return Promise.try(() => {
					return storePost(trx)({
						userId: req.currentUser.id,
						title: req.body.title,
						subtitle: nullIfEmptyString(req.body.subtitle),
						body: req.body.body,
						pic: (req.file != null ? req.file.filename : undefined),
						isDraft: (req.body.publish == null)
					});
				}).then((postIds) => {
					let postId = postIds[0];
					let tags = req.body.tags;

					return Promise.all([
						storeSlug(trx)(postId, slug(req.body.title)),
						// FIXME!!! temp storeRemoveTags
						// (tags !== '' ? storeRemoveTags(trx)(postId, splitFilterTags(tags)) : undefined)
						(tags !== '' ? storeTags(trx)(postId, splitFilterTags(tags)) : undefined)
					]).spread((slugName, _) => {
						return slugName;
					});
				});
			});
		}).then((slugName) => {
			res.redirect(`/posts/${slugName}`);
		}).catch(checkit.Error, (err) => {
			logError(environment, 'checkitError', err);

			/* The data that forms the body of the request is multipart encoded to allow for file uploads
			therefore the usual order: bodyparser, setting res.locals, route with route middleware does not work here
			because bodyparser, which only parses urlencoded data, gets skipped 
			& res.locals.body gets set before the request data gets handled
			so body needs to be set within the route after multer (which handles multipart/form-data) runs */
			res.render('posts/create', {
				errors: err.errors,
				body: req.body
			});
		});
	});

	/* edit */
	router.get('/:slug/edit', requireSignin(environment), mustOwn, (req, res) => {
		return Promise.try(() => {
			return getTags(req.post.id);
		}).then((tags) => {
			res.render('posts/edit', {
				slug: req.params.slug,
				post: req.post,
				tags: tags.join(", ")
			});
		});
	});

	router.post('/:slug/edit', requireSignin(environment), mustOwn, (req, res) => {
		let postId = req.post.id;

		return Promise.try(() => {
			return storeUpload(req, res);
		}).then(() => {
			logReqBody(environment, 'POST/:id/edit req.body: ', req.body);
			logReqFile(environment, 'POST/:id/edit req.file: ', req.file);

			return checkitPost(req.body);
		}).then(() => {
			// FIXME!!! Make this a transaction after figuring out why the transaction is giving me an error
			// return knex.transaction(function(trx) {
				return Promise.try(() => {
					if (req.body.title !== req.post.title) {
						return storeSlug(knex)(postId, slug(req.body.title));
					} else {
						return req.params.slug;
					}
				}).then((slugName) => {
					let tags = req.body.tags;

					return Promise.try(() => {
						return updatePost(knex)(postId, {
							title: req.body.title,
							subtitle: nullIfEmptyString(req.body.subtitle),
							body: req.body.body,
							pic: (req.file != null ? req.file.filename : undefined),
							isDraft: (req.body.publish == null),
							updatedAt: knex.fn.now()
						});
					}).then(() => {
						if (tags !== '') {
							return storeTags(knex)(postId, splitFilterTags(tags));
						}
					}).then(() => {
						return removeTags(knex)(postId, splitFilterTags(tags));
					// FIXME!!! Whenever the transaction bug is solved, figure out how to move the redirect out of the transaction
					}).then(() => {
						res.redirect(`/posts/${slugName}`);
					});
				});
			// });
		}).catch(checkit.Error, (err) => {
			logError(environment, 'checkitError', err);

			/* body needs to get passed within the render call because the form is multipart enctype */
			/* See additional explanation at POST/create route */
			res.render('posts/edit', {
				slug: req.params.slug,
				errors: err.errors,
				body: req.body
			});
		});
	});

	/* read */
	router.get('/:slug', (req, res) => {
		let postId = req.post.id;

		return Promise.try(() => {
			return knex('users').where({id: req.post.userId}).first();
		}).then((postedByUser) => {
			return Promise.try(() => {
				return getTags(postId);
			}).then((postTags) => {
				let likedByCurrentUser;
				let followedByCurrentUser;

				/* Only run these 2 queries at the Promise.all if the user is logged-in. Otherwise it's unnecessary to run them */
				if (req.currentUser != null) {
					likedByCurrentUser = knex('likedposts').where({
						postId: postId,
						userId: req.currentUser.id
					}).first();

					followedByCurrentUser = knex('followingusers').where({
						followedUserId: postedByUser.id,
						userId: req.currentUser.id
					}).first();
				}

				return Promise.all([
					knex('likedposts').where({postId: postId}).count(),
					likedByCurrentUser,
					knex('followingusers').where({followedUserId: postedByUser.id}).count(),
					followedByCurrentUser
				]).spread((likes, likedByCurrentUser, follows, followedByCurrentUser) => {
					res.render('posts/read', {
						slug: req.params.slug,
						post: req.post,
						postBody: marked(req.post.body),
						postedByUser: postedByUser,
						tags: postTags,
						likes: parseInt(likes[0].count),
						alreadyLikedPost: likedByCurrentUser != null,
						canLike:  (req.currentUser != null) && (req.currentUser.id !== postedByUser.id),
						follows: parseInt(follows[0].count),
						alreadyFollowing: followedByCurrentUser != null,
						canFollow: (req.currentUser != null) && (req.currentUser.id !== postedByUser.id)
					});
				});
			});
		});
	});

	/* like */
	router.post('/:slug/like', requireSignin(environment), (req, res) => {
		let postId = req.post.id;

		return Promise.try(() => {
			return knex('likedposts').insert({
				postId: postId,
				userId: req.currentUser.id,
				postOwnerId: req.post.userId
			});
		}).catch(databaseError.rethrow).catch(likingOwnPost, (err) => {
		}).catch(duplicateLike, (err) => {
			/* Intentionally do nothing on these 2 .catch() because both, the .catch() and the .then() redirect to the same URL */
			/* The error is handled, .catch() returns a promise, and the next .then() will be executed */ 
		}).then(() => {
			res.redirect(`/posts/${req.params.slug}`);
		});
	});

	/* unlike */
	router.post('/:slug/unlike', requireSignin(environment), (req, res) => {
		let postId = req.post.id;

		return Promise.try(() => {
			return knex('likedposts').delete().where({
				postId: postId,
				userId: req.currentUser.id
			});
		}).then(() => {
			res.redirect(`/posts/${req.params.slug}`);
		});
	});

	/* delete */

	return router;
};