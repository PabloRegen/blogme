'use strict';

const express = require('express');
const bodyParser = require('body-parser');
const rfr = require('rfr');
const path = require('path');
const favicon = require('serve-favicon');
const sanitizer = require('sanitizer');
const expressSession = require('express-session');
const KnexSessionStore = require('connect-session-knex')(expressSession);
const moment = require('moment');
const reportErrors = require('report-errors');

const requireSignin = rfr('middleware/require-signin');
const errors = rfr('lib/errors');
const errorHandler = rfr('middleware/error-handler');
const fetchCurrentUser = rfr('middleware/fetch-current-user');
const sessionsPromises = rfr('middleware/sessions-promises');
const loginUser = rfr('middleware/login-user');

let config = rfr('config.json');

let environment;
/* allow testing different environments from shell */
/* ie NODE_ENV=production npm start */
if (process.env.NODE_ENV != null) {
	environment = process.env.NODE_ENV;
} else {
	environment = config.environment;
}

let errorReporter = reportErrors(path.join(__dirname, 'errors'));

let knex = require('knex')(rfr('knexfile'));

let app = express();

/* Set values as application-wide locals variables so they are available to the templates */
app.locals.siteName = 'BLOGME';
app.locals.sanitizer = sanitizer;
app.locals.moment = moment;

app.set('view engine', 'pug');
app.set('views', path.join(__dirname, 'views'));

app.use(express.static(path.join(__dirname, 'public')));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use(favicon(path.join(__dirname, 'public/images/favicon.ico')));
app.use(bodyParser.urlencoded({ extended: true }));
app.use(expressSession({
    secret: config.sessions.secret,
    resave: false, // don't save session data unless it was modified, to avoid race conditions
    saveUninitialized: false,
    store: new KnexSessionStore({
        knex: knex // use existing Knex instance to interact with the sessions table
    })
}));

app.use(sessionsPromises);

/* Make req.loginUser method available application-wide. Calling it with userID argument assigns the userID to req.session.userId */
app.use(loginUser);

/* Fetch current user (if logged in) so it's available application-wide as req.currentUser */
app.use(fetchCurrentUser(knex, environment));

 /* Set values as request-wide locals variables so they are available only to the templates rendered during that request/response cycle */
app.use((req,res,next) => {
    res.locals.currentUser = req.currentUser;

    /* Allow forms to display previously specified values when input validation fails, and forms are re-rendered with error messages */
    res.locals.body = req.body;

    /* Default value for the 'errors' locals, so that the templates don't throw an error when displaying a form without errors */
    res.locals.errors = {};

    next();
});

app.use('/', rfr('routes/home')(knex, environment));
app.use('/accounts', rfr('routes/accounts')(knex, environment));
app.use('/posts', rfr('routes/posts')(knex, environment));
app.use('/uploads', requireSignin, rfr('routes/uploads')(knex, environment));

/* 404 Page not found error handler */
app.use((req, res, next) => {
	next(new errors.NotFoundError('Page not found'));
});

app.use(errorHandler(environment, errorReporter));

app.listen(config.listen.port, () => {
	console.log(`Server listening on port ${config.listen.port}...`);
});