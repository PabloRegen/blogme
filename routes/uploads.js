'use strict';

const Promise = require('bluebird');
const expressPromiseRouter = require('express-promise-router');
const checkit = require('checkit');
const multer = require('multer');
const uuidV4 = require('uuid/v4');
const path = require('path');
const rfr = require('rfr');
const querystring = require('querystring');
const removeUndefined = require('remove-undefined');

const requireSignin = rfr('middleware/require-signin');
const logReqBody = rfr('lib/log-req-body');
const logReqFile = rfr('lib/log-req-file');
const logError = rfr('lib/log-error');
const nullIfEmptyString = rfr('lib/null-if-empty-string');
const errors = rfr('lib/errors');
const auth = rfr('middleware/auth');

const userID = rfr('lib/user-id');

module.exports = function(knex, environment) {
	let router = expressPromiseRouter();

	let storage = multer.diskStorage({
		destination: path.join(__dirname, '../uploads'),
		filename: (req, file, cb) => {
			cb(null, `${uuidV4()}-${file.originalname}`);
		}
	});

	let limits = {
		fileSize: 10000000,
	};

	let storeUpload = Promise.promisify(multer({
		storage: storage,
		limits: limits
	}).array('images', 20));
	// req.files is array of `images`. Optionally error out if more than maxCount files are uploaded

	let imageQuery = function(id) {
		return knex('images').where({id: id}).first();
	};

	router.param('id', (req, res, next, id) => {
		return Promise.try(() => {
			return imageQuery(parseInt(id));
		}).then((image) => {
			if (image == null) {
				throw new errors.NotFoundError('The selected image does not exist');
			}

			let isAdmin = (req.currentUser.role >= 2);
			let isOwnImage = (req.currentUser.id === image.userId);
			let imageIsDeleted = (image.deletedAt != null);

			if (!isAdmin && !isOwnImage && imageIsDeleted) {
				throw new errors.NotFoundError('The selected image does not exist');
			} else {
				req.image = image;
				req.ownerId = image.userId;
				/* resolve 'next' (as a string) to make express-promise-router call next() internally */
				return 'next';
			}
		});
	});

	/* upload */
	router.get('/upload', (req, res) => {
		res.render('uploads/upload');
	});

	router.post('/upload', (req, res) => {
		return Promise.try(() => {
			return storeUpload(req, res);
		}).then(() => {
			logReqBody(environment, 'POST/upload req.body: ', req.body);
			logReqFile(environment, 'POST/upload req.files: ', req.files);

			if (req.files.length === 0) {
				res.render('uploads/upload', {
					message: 'Please choose at least one image'
				});
			} else {
				return Promise.try(() => {
					return knex.transaction((trx) => {
						return Promise.map(req.files, (image) => {
							return knex('images').insert({
								userId: req.currentUser.id,
								path: image.filename,
								originalName: image.originalname,
								size: image.size,
								// height: ,
								// width: ,
								// dated: 
							});
						});
					});
				}).then(() => {
					res.redirect('/uploads/overview/1');
				});
			}
		});
	});

	/* edit */
	router.get('/:id/edit', auth(2, true), (req, res) => {
		res.render('uploads/edit', {image: req.image});
	});

	router.post('/:id/edit', auth(2, true), (req, res) => {
		logReqBody(environment, 'POST/:id/edit req.body:', req.body);

		return Promise.try(() => {
			return imageQuery(parseInt(req.params.id)).update({
				/* with bodyParser.urlencoded, values in req.body can never be null or undefined */
				/* they're always strings */
				caption: nullIfEmptyString(req.body.caption),
				ownerName: nullIfEmptyString(req.body.owner),
				licenseType: nullIfEmptyString(req.body.license),
				originalURL: nullIfEmptyString(req.body.url)
			});
		}).then(() => {
			res.redirect('/uploads/overview/1');
		});
	});

	/* delete */
	router.post('/:id/delete', auth(2, true), (req, res) => {
		logReqBody(environment, 'POST/:id/delete req.body:', req.body);

		return Promise.try(() => {
			return imageQuery(parseInt(req.params.id)).update({deletedAt: knex.fn.now()});
		}).then(() => {
			res.redirect('/uploads/overview/1');
		});
	});

	/* display one image with its details */
	router.get('/:id', auth(2, true), (req, res) => {
		res.render('uploads/details', {image: req.image});
	});

	/* overview all images */
	router.get('/overview/:page', (req, res) => {
		return Promise.try(() => {
			let page = parseInt(req.params.page);
			let imagesPerPage = 4;
			let imageNumber = (page - 1) * imagesPerPage;
			let username = req.query.username;
			let deleted = req.query.deleted;

			if (page < 1) {
				throw new errors.NotFoundError('This page does not exist');
			} else {
				let images = function() {
					if (deleted !== '1') {
						return knex('images').whereNull('deletedAt');
					} else {
						return knex('images').whereNotNull('deletedAt');
					}
				};

				return Promise.try(() => {
					return userID(knex)(username, req.currentUser);
				}).then((userID) => {
					return Promise.all([
						images().where({userId: userID}).offset(imageNumber).limit(imagesPerPage), 
						images().where({userId: userID}).count()
					]);
				}).spread((images, numberOfImages) => {
					let numberOfPages = Math.ceil(parseInt(numberOfImages[0].count) / imagesPerPage);

					if (page > numberOfPages && numberOfPages > 0) {
						throw new errors.NotFoundError('This page does not exist');
					} else {
						res.render('uploads/overview', {
							images: images,
							page: page,
							numberOfPages: numberOfPages,
							deleted: deleted,
							username: username,
							pageQuery: querystring.stringify(removeUndefined({
								username: username,
								deleted: deleted
							})),
							toggleQuery: querystring.stringify(removeUndefined({
								username: username,
								deleted: deleted === '1' ? '' : '1'
							}))
						});
					}
				});
			}
		});
	});

	return router;
};