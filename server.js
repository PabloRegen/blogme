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

let config = rfr('config.json');

let environment;

/* allow testing different environments from shell */
/* ie NODE_ENV=production npm start */
if (process.env.NODE_ENV != null) {
	environment = process.env.NODE_ENV;
} else {
	environment = config.environment;
}

/* Database setup */
let knex = require('knex')(rfr('knexfile'));

let app = express();

/* Express configuration */
app.set('view engine', 'pug');
app.set('views', path.join(__dirname, 'views'));

app.use(express.static(path.join(__dirname, 'public')));
app.use(favicon(path.join(__dirname, 'public/images/favicon.ico')));
app.use(bodyParser.urlencoded({ extended: true }));

/* Session setup */
app.use(expressSession({
    secret: config.sessions.secret,
    resave: false, // don't save session data unless it was modified, to avoid race conditions
    saveUninitialized: false,
    store: new KnexSessionStore({
        knex: knex // use existing Knex instance to interact with the sessions table
    })
}));

/* Fetch current user if logged in so it's available application-wide for every new request */
app.use(fetchCurrentUser(knex));

/* Set user as request-wide locals */
/* to make the current user available in every res.render for all requests */
app.use(function(req,res,next) {
    if (req.currentUser != null) {
       res.locals.currentUser = req.currentUser; 
    } else {
        next();
    } 
});

/* Route setup */
app.use('/', rfr('routes/home'));
app.use('/accounts', rfr('routes/accounts'));
// app.use('/posts', rfr('routes/posts'));

/* 404 Page not found error handler */
app.use(function(req, res, next) {
	next(new errors.NotFoundError('Page not found'));
});

app.use(errorHandler(environment));

app.listen(config.listen.port, function() {
	console.log(`Server listening on port ${config.listen.port}`);
});