'use strict';

const express = require('express');
const bodyParser = require('body-parser');
const rfr = require('rfr');
const path = require('path');
const favicon = require('serve-favicon');
const sanitizer = require('sanitizer');
const expressSession = require('express-session');
const KnexSessionStore = require('connect-session-knex')(expressSession);

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

let knex = require('knex')(rfr('knexfile'));

let app = express();

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
/* Make req.loginUser method available application-wide. Calling it with userID arg assigns the userID to req.session.userId */
app.use(loginUser);

/* Make values available application-wide */
app.locals.siteName = 'BLOGME';
app.locals.sanitizer = sanitizer;

/* Fetch current user (if logged in) so it's available application-wide as req.currentUser */
app.use(fetchCurrentUser(knex, environment));

 /* Set values as request-wide template locals variables so they are available for every res.render */
app.use((req,res,next) => {
    res.locals.currentUser = req.currentUser;

    /* Allow forms to display previously specified values when input validation fails, and forms are re-rendered with error messages */
    res.locals.body = req.body;

    /* Default value for the 'errors' locals, so that the templates don't throw an error when displaying a form without errors */
    res.locals.errors = {};

    next();
});

app.use('/', rfr('routes/home'));
app.use('/accounts', rfr('routes/accounts')(knex, environment));
app.use('/posts', rfr('routes/posts')(knex, environment));
app.use('/uploads', requireSignin(environment), rfr('routes/uploads')(knex, environment));

/* 404 Page not found error handler */
app.use((req, res, next) => {
	next(new errors.NotFoundError('Page not found'));
});

app.use(errorHandler(environment));

app.listen(config.listen.port, () => {
	console.log(`Server listening on port ${config.listen.port}...`);
});