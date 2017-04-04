'use strict';

const express = require('express');
const bodyParser = require('body-parser');
const rfr = require('rfr');
const path = require('path');
const favicon = require('serve-favicon');
const expressSession = require('express-session');
const KnexSessionStore = require('connect-session-knex')(expressSession);

const errors = rfr('lib/errors');
const errorHandler = rfr('middleware/error-handler');
const fetchCurrentUser = rfr('middleware/fetch-current-user');
const sessionsPromises = rfr('middleware/sessions-promises');

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

/* Make site name available application-wide */
app.locals.siteName = 'Blogme';

/* Fetch current user (if logged in) so it's available application-wide */
app.use(fetchCurrentUser(knex, environment));

 /* Set values as request-wide template locals variables so they are available for every res.render */
app.use((req,res,next) => {
    res.locals.currentUser = req.currentUser;

    /* Allow forms to display previously specified values when input validation fails, and forms are re-rendered with error messages */
    res.locals.body = req.body;

    res.locals.file = req.file;

    /* Default value for the 'errors' local, so that the templates don't throw an error when displaying a form without errors */
    res.locals.errors = {};
    next();
});

app.use('/', rfr('routes/home'));
app.use('/accounts', rfr('routes/accounts')(knex, environment));
app.use('/posts', rfr('routes/posts')(knex, environment));

/* 404 Page not found error handler */
app.use((req, res, next) => {
	next(new errors.NotFoundError('Page not found'));
});

app.use(errorHandler(environment));

app.listen(config.listen.port, () => {
	console.log(`Server listening on port ${config.listen.port}...`);
});