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
const auth = rfr('middleware/auth');

const storeRemoveTags = rfr('lib/store-remove-tags');
const storeSlug = rfr('lib/store-slug');
const storePost = rfr('lib/store-post');
const updatePost = rfr('lib/update-post');
const userID = rfr('lib/user-id');

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

marked.setOptions({
	highlight: function(code) {
		/* TODO: investigate if there's a better way to fix the background color not showing (marked doesn't explicitly support highlight.js)
		Wrapped the original code in a div with the `hljs` class, which the highlight.js stylesheet uses to set the background color
		ideally I'd be able to set the `hljs` class directly on the <pre> that `marked` produces, but `marked` may not have this option
		Original code: return require('highlight.js').highlightAuto(code).value; */
		return `<div class="hljs">${require('highlight.js').highlightAuto(code).value}</div>`;
	}
});

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

	router.param('slug', (req, res, next, slugName) => {
		return Promise.try(() => {
			return knex('slugs').where({name: slugName}).first();
		}).then((slug) => {
			if (slug == null) {
				/* Could be a user error or a bug (rare enough case, so I'm assuming a user error here)
				TODO: check bug case somewhere else where it can't be a user error (if such place exists) */
				throw new errors.NotFoundError('No such post exists');
			} else if (!slug.isCurrent) {
				return Promise.try(() => {
					return knex('slugs').where({
						postId: slug.postId,
						isCurrent: true
					}).first();
				}).then((currentSlug) => {
					if (currentSlug == null) {
						throw new Error(`Post id ${slug.postId} has no current slug version of old slug id ${slug.id} named ${slug.name}`);
					} else {
						res.redirect(`/posts/${currentSlug.name}`);
					}
				});
			} else {
				return Promise.try(() => {
					return knex('posts').where({id: slug.postId}).first();
				}).then((post) => {
					if (post == null) {
						throw new errors.NotFoundError('Page not found');
					}

					let isLoggedIn = (req.currentUser != null);
					/* TODO: confirm if and why both commented out userCase's are identical. They both seem to work
					isAdmin and IsOwnPost need isLoggedIn within their definition otherwise they throw errors when currentUser is not defined
					let isAdmin = isLoggedIn && (req.currentUser.role >= 2);
					let isOwnPost = isLoggedIn && (req.currentUser.id === post.userId);
					let userCase = !isLoggedIn || (!isAdmin && !isOwnPost);
					let userCase = !isAdmin && !isOwnPost;
					*/
					let userCase = !isLoggedIn || (req.currentUser.role < 2 && req.currentUser.id !== post.userId);
					let postIsDeletedOrNotVisible = (post.deletedAt != null) || !post.isVisible

					if (userCase && postIsDeletedOrNotVisible) {
						/* Nonexistent posts should be indistinguishable from soft-deleted and non-visible ones to those who don't have access to them */
						throw new errors.NotFoundError('Page not found');
					} else {
						req.post = post;
						req.ownerId = post.userId;
						/* resolve 'next' (as a string) to make express-promise-router call next() internally */
						return 'next';
					}
				});
			}
		});
	});

	/* create */
	router.get('/create', requireSignin, (req, res) => {
		res.render('posts/create');
	});

	router.post('/create', requireSignin, (req, res) => {
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

					/* FIXME!!! There is a bug with knex subtransactions. See issue https://github.com/tgriesser/knex/issues/2213.
					When running multiple subtransactions concurrently, they don't wait for one another; 
					and if they complete in any order other than "the exact reverse of the order in which they were initiated", 
					the savepoints are released in the wrong order.
					As a workaround I removed the Promise.all that combined the tag and slug queries (both containing subtransactions),
					and made it sequential (using .then) instead.
					As long as there's no multiple subtransactions going on at the same time, the issue doesn't occur */
					return Promise.try(() => {
						if (tags !== '') {
							return storeRemoveTags(trx)(postId, splitFilterTags(tags));
						}
					}).then(() => {
						let generatedSlug = slug(req.body.title);

						if (generatedSlug !== '') {
							return storeSlug(trx)(postId, generatedSlug);
						} else {
							return storeSlug(trx)(postId, 'article');
						}
					});
				});
			});
		}).then((slugName) => {
			res.redirect(`/posts/${slugName}`);
		}).catch(errors.AlreadyUsedTitleError, (err) => {
			let errors = {
				title: {
					message: err.message
				}
			};

			res.render('posts/create', {
				errors: errors,
				body: req.body
			});
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

	/* overview all specific user posts */
	router.get('/overview', requireSignin, (req, res) => {
		return Promise.try(() => {
			let username = req.query.username;

			return Promise.try(() => {
				return userID(knex)(username, req.currentUser);
			}).then((userID) => {
				return knex('posts').where({userId: userID}).orderBy('postedAt', 'desc');
			}).map((post) => {
				return Promise.all([
					knex('likedposts').where({postId: post.id}).count(),
					Promise.try(() => {
						return knex('slugs').where({
							postId: post.id,
							isCurrent: true
						}).first();
					}).then((slug) => {
						if (slug != null) {
							return slug;
						} else {
							throw new Error(`The slug is missing or there is no current slug for post id ${post.id}`);
						}
					})
				]).spread((likes, slug) => {
					return Object.assign({likes: parseInt(likes[0].count)}, {slug: slug.name}, post);
				});
			}).then((postsWithLikesAndSlugs) => {
				res.render('posts/overview', {
					posts: postsWithLikesAndSlugs,
					username: username
				});
			});
		});
	});

	/* display all current tags */
	router.get('/tags', (req, res) => {
		return Promise.try(() => {
			return knex('tags').where({deletedAt: null});
		}).then((currentTags) => {
			res.render('posts/tags', {
				currentTags: currentTags
			});
		});
	});
	
	/* delete */
	router.post('/:slug/delete', requireSignin, auth(2, true), (req, res) => {
		return Promise.try(() => {
			return knex('posts').update({deletedAt: knex.fn.now()}).where({id: req.post.id});
		}).then(() => {
			res.redirect('/accounts/dashboard');
		});
	});

	/* edit */
	router.get('/:slug/edit', requireSignin, auth(2, true), (req, res) => {
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

	router.post('/:slug/edit', requireSignin, auth(2, true), (req, res) => {
		let postId = req.post.id;

		return Promise.try(() => {
			return storeUpload(req, res);
		}).then(() => {
			logReqBody(environment, 'POST/:id/edit req.body: ', req.body);
			logReqFile(environment, 'POST/:id/edit req.file: ', req.file);

			return checkitPost(req.body);
		}).then(() => {
			return knex.transaction(function(trx) {
				return Promise.try(() => {
					return updatePost(trx)(postId, {
						title: req.body.title,
						subtitle: nullIfEmptyString(req.body.subtitle),
						body: req.body.body,
						pic: (req.file != null ? req.file.filename : undefined),
						isDraft: (req.body.publish == null),
						updatedAt: knex.fn.now()
					});
				}).then(() => {
					return storeRemoveTags(trx)(postId, splitFilterTags(req.body.tags));
				}).then(() => {
					if (req.body.title !== req.post.title) {
						return storeSlug(trx)(postId, slug(req.body.title));
					} else {
						return req.params.slug;
					}
				});
			});
		}).then((slugName) => {
			res.redirect(`/posts/${slugName}`);
		}).catch(errors.AlreadyUsedTitleError, (err) => {
			let errors = {
				title: {
					message: err.message
				}
			};

			res.render('posts/edit', {
				slug: req.params.slug,
				errors: errors,
				body: req.body
			});
		}).catch(checkit.Error, (err) => {
			logError(environment, 'checkitError', err);

			/* body needs to get passed within the render call because the form is multipart enctype
			See additional explanation at POST/create route */
			res.render('posts/edit', {
				slug: req.params.slug,
				errors: err.errors,
				body: req.body
			});
		});
	});

	/* like */
	router.post('/:slug/like', requireSignin, (req, res) => {
		return Promise.try(() => {
			return knex('likedposts').insert({
				postId: req.post.id,
				userId: req.currentUser.id,
				postOwnerId: req.ownerId
			});
		}).catch(databaseError.rethrow).catch(likingOwnPost, (err) => {
		}).catch(duplicateLike, (err) => {
			/* Intentionally do nothing on these 2 .catch() because both, the .catch() and the .then() redirect to the same URL
			The error is handled, .catch() returns a promise, and the next .then() will be executed */ 
		}).then(() => {
			res.redirect(`/posts/${req.params.slug}`);
		});
	});

	/* unlike */
	router.post('/:slug/unlike', requireSignin, (req, res) => {
		return Promise.try(() => {
			return knex('likedposts').delete().where({
				postId: req.post.id,
				userId: req.currentUser.id
			});
		}).then(() => {
			res.redirect(`/posts/${req.params.slug}`);
		});
	});

	/* read */
	router.get('/:slug', (req, res) => {
		let postId = req.post.id;

		return Promise.try(() => {
			return knex('users').where({id: req.ownerId}).first();
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
						canFollow: (req.currentUser != null) && (req.currentUser.id !== postedByUser.id),
						canEditAndDelete: (req.currentUser != null) && (req.currentUser.id === postedByUser.id || req.currentUser.role >= 2)
					});
				});
			});
		});
	});

	/* overview all posts by a specific tag */
	router.get('/tagged/:tag', (req, res) => {
		return Promise.try(() => {
			/* Check tag table in case user manually enters the URL */
			return knex('tags').where({
				name: req.params.tag,
				deletedAt: null
			}).first();
		}).then((tag) => {
			if (tag != null) {
				return knex('tags_posts').where({tagId: tag.id});
			} else {
				throw new Error(`There is no current tag "${req.params.tag}"`);
			}
		}).map((tagPostAssociation) => {
			let postId = tagPostAssociation.postId;

			return Promise.all([
				knex('posts').where({
					id: postId,
					deletedAt: null,
					isVisible: true,
					isDraft: false
				}).first(),
				knex('likedposts').where({postId: postId}).count(),
				Promise.try(() => {
					return knex('slugs').where({
						postId: postId,
						isCurrent: true
					}).first();
				}).then((slug) => {
					if (slug != null) {
						return slug;
					} else {
						throw new Error(`The slug is missing or there is no current slug for post id ${postId}`);
					}
				})
			]).spread((post, likes, slug) => {
				return Object.assign(
					post, 
					{likes: parseInt(likes[0].count)}, 
					{slug: slug.name}
				);
			});
		}).then((postsWithLikesAndSlugs) => {
			res.render('posts/tagged', {
				posts: postsWithLikesAndSlugs,
				tag: req.params.tag
			});
		});
	});

	return router;
};