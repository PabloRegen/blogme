'use strict';

const express = require('express');
const bodyParser = require('body-parser');
const rfr = require('rfr');
const favicon = require('serve-favicon');
const path = require('path');
// const expressSession = require('express-session');
// const sessionStore = require('connect-session-knex');

const errorHandler = rfr('middleware/error-handler.js');
const config = rfr('config.json');

let app = express();

// set up
app.set('view engine', 'pug');
app.set('views', path.join(__dirname, '/views'));
// app.use(express.static(path.join(__dirname, '/public')));
app.use(favicon(path.join(__dirname, '/public/images/favicon.ico')));
app.use(bodyParser.urlencoded({ extended: true }));

// knex
// let knex = require('knex')(rfr('knexfile.js'));

// set up session

// fetchCurrentUSer

// routes
app.use('/', rfr('routes/home'));
app.use('/accounts', rfr('routes/accounts'));
// app.use('/posts', rfr('routes/posts'));

// 404 error handler
app.use((req, res, next) => {
	next(new Error('Page not found'));
});

// error handler
app.use(errorHandler(config.environment));

app.listen(config.port, function() {
	console.log(`listening on port ${config.port}`);
});