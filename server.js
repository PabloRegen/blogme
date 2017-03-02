'use strict';

/* require node modules */
const express = require('express');
const bodyParser = require('body-parser');
const rfr = require('rfr');
const path = require('path');
const favicon = require('serve-favicon');
// const expressSession = require('express-session');
// const KnexSessionStore = require('connect-session-knex')();


/* require blogme modules */
const errors = rfr('lib/errors');
const errorHandler = rfr('middleware/error-handler');

let config = rfr('config.json');

let environment;

if (process.env.NODE_ENV != null) {
	environment = process.env.NODE_ENV;
} else {
	environment = config.environment;
}

/* Database setup */
// let knex = require('knex')(rfr('knexfile.js'));

let app = express();

/* Express configuration */
app.set('view engine', 'pug');
app.set('views', path.join(__dirname, 'views'));

app.use(express.static(path.join(__dirname, 'public')));
app.use(favicon(path.join(__dirname, 'public/images/favicon.ico')));
app.use(bodyParser.urlencoded({ extended: true }));

/* Session setup */

/* Fetch current user */

/* Set user as request-wide locals */

/* Route setup */
app.use('/', rfr('routes/home'));
app.use('/accounts', rfr('routes/accounts'));
app.use('/posts', rfr('routes/posts'));

/* Default 404 error handler */
app.use(function(req, res, next) {
	next(new errors.NotFoundError('Page not found'));
});

/* error handling */
app.use(errorHandler(environment));

app.listen(config.listen.port, function() {
	console.log(`Server listening on port ${config.listen.port}`);
});