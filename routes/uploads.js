'use strict';

const Promise = require('bluebird');
const expressPromiseRouter = require('express-promise-router');
const checkit = require('checkit');
const multer = require('multer');
const uuidV4 = require('uuid/v4');
const path = require('path');
const rfr = require('rfr');

const requireSignin = rfr('middleware/require-signin');
const logReqBody = rfr('lib/log-req-body');
const logReqFile = rfr('lib/log-req-file');
const logError = rfr('lib/log-error');

// const storeImages = rfr('lib/store-images');

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

	/* upload */
	router.get('/upload', requireSignin(environment), (req, res) => {
		res.render('uploads/upload');
	});

	router.post('/upload', requireSignin(environment), (req, res) => {
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
				return Promise.map(req.files, (image) => {
					return knex('images').insert({
						userId: req.currentUser.id,
						path: image.filename,
						originalName: image.originalname,
						size: image.size,
						// height: ,
						// width: ,
						// dated: 
					}).returning('id');
				}).then((imagesIds) => {
					// imagesIds is an array of n arrays (n = images qty)

					res.redirect('/uploads/upload');
				});
			}
		});
	});
	// pic: req.files != null && req.files.postPic != null ? req.files.postPic[0] : undefined,

	/* edit */
	router.get('/:id/edit', requireSignin(environment), (req, res) => {
		return Promise.try(() => {
			return knex('images').where({id: req.params.id});
		}).then((images) => {
			if (images.length === 0) {
				throw new Error('The selected image does not exist');
			} else {
				res.render('uploads/edit', {image: images[0]});
			}
		});
	});

	router.post('/:id/edit', requireSignin(environment), (req, res) => {
		logReqBody(environment, 'POST/:id/edit req.body:', req.body);

		return Promise.try(() => {
			return knex('images').where({id: req.params.id}).update({
				caption: req.body.caption != null ? req.body.caption : undefined,
				ownerName: req.body.owner != null ? req.body.owner : undefined,
				licenseType: req.body.license != null ? req.body.license : undefined,
				originalURL: req.body.url != null ? req.body.url : undefined
			});
		}).then(() => {
			res.redirect('/uploads/1/overview');
		});
	});

	/* delete */
	router.post('/:id/delete', requireSignin(environment), (req, res) => {
		logReqBody(environment, 'POST/:id/delete req.body:', req.body);

		return Promise.try(() => {
			return knex('images').where({id: req.params.id}).update({deletedAt: knex.fn.now()});
		}).then(() => {
			res.redirect('/uploads/1/overview');
		});
	});

	/* overview images */
	router.get('/:page/overview', requireSignin(environment), (req, res) => {
		return Promise.try(() => {
			return knex('images').where({userId: req.currentUser.id}).orderBy('id');
		}).then((images) => {
			let page = req.params.page;
			let imagesPerPage = 4;
			let numberOfPages = Math.ceil(images.length / imagesPerPage);
			let imageNumber = (page - 1) * imagesPerPage;
			// validate page
			let currentPage = function() {
				if (page < 1) {
					return 1;
				} else if (page > numberOfPages) {
					return numberOfPages;
				} else {
					return page;
				}
			};

			// console.log('images qty: ', images.length);
			// console.log('imagesPerPage: ', imagesPerPage);
			// console.log('numberOfPages: ', numberOfPages);
			// console.log('imageNumber: ', imageNumber);
			// console.log('page: ', page);
			// console.log('currentPage: ', currentPage());

			res.render('uploads/overview', {
				images: images.slice(imageNumber, imageNumber + imagesPerPage),
				currentPage: currentPage(),
				numberOfPages: numberOfPages
			});
		});
	});

	/* display one image */
	router.get('/:id', requireSignin(environment), (req, res) => {
		logReqBody(environment, 'GET/:id req.body: ', req.body);

		return Promise.try(() => {
			return knex('images').where({id: req.params.id});
		}).then((images) => {
			if (images.length === 0) {
				throw new Error('The selected image does not exist');
			} else {
				res.render('uploads/details', {
					image: images[0]
				});
			}
		});
	});

	return router;
};