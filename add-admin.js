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

let knex = require('knex')(rfr('knexfile'));

Promise.try(() => {
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
}).finally(() => {
	knex.destroy();
	promptPromise.done();
});