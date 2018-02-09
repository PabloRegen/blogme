'use strict';

const Promise = require('bluebird');
const promptPromise = require('prompt-promise');
const scryptForHumans = require('scrypt-for-humans');
const databaseError = require('database-error');
const rfr = require('rfr');
const chalk = require('chalk');

let duplicateUsername = {
	name: 'UniqueConstraintViolationError',
	table: 'users',
	column: 'username'
};

let duplicateEmailAddress = {
	name: 'UniqueConstraintViolationError',
	table: 'users',
	column: 'email'
};

let knex = require('knex')(rfr('knexfile')); 	// Is `let db =` the standard instead of `let knex =`?

return Promise.try(() => { 						// 1st time I see a return outside of a function? Why is it there? What if it's not there?
	let username = process.argv[2];

	if (username == null) {
		throw new Error('You must specify the username to add, as the first argument');
	}

	return Promise.try(() => {
		return promptPromise('Email for the new admin: ');
	}).then((email) => {
		if (email === '') {
			throw new Error('You must specify the email for the new admin');
		} else {
			return Promise.try(() => {
				return promptPromise.password('Password for the new admin: ');
			}).then((password) => {
				if (password.length < 8 || password.length > 1024) {
					throw new Error('The password must be between 8 and 1024 characters long');
				} else {
					return scryptForHumans.hash(password);
				}
			}).then((hash) => {
				return knex('users').insert({
					username: username,
					email: email,
					pwHash: hash,
					isVerified: true,
					role: 2
				});
			}).then(() => {
				console.log(`Done! You can now log in as ${username}`);
			}).catch(databaseError.rethrow).catch(duplicateUsername, (err) => {
				console.error(chalk.red.bold(`A user named '${username}' already exists!`));
			}).catch(duplicateEmailAddress, (err) => {
				console.error(chalk.red.bold(`The email '${email}' is already in use!`));
			});
		}
	});
}).catch((err) => {
	console.error(chalk.red.bold('An error occurred!\n===================='));
	console.error(err);
// .finally Docs: Pass a handler that will be called regardless of this promise's fate. Returns a new promise chained from this promise
// .finally: means forces the callback to be called always?
}).finally(() => {
	knex.destroy(); // explicitly teardown the connection pool. Is destroying the connection === ending the app, or the app ends because the connection is destroyed?
});


/* 
// knexfile.js
'use strict';

const config = require('./config.json');

module.exports = {
	client: 'pg',								// client: 'postgresql' on mine. Doesn't matter?
	connection: {
		hostname: config.database.hostname,
		database: config.database.database,
		charset: 'utf8',						// mising on mine. Needed?
		username: config.database.username,
		password: config.database.password
	},
	pool: {
		min: 2,
		max: 10
	}
}
*/