'use strict';

exports.up = function(knex, Promise) {
	return Promise.try(() => {
		return knex.schema.alterTable('likedposts', (t) => {
			t.integer('postOwnerId').notNullable().references('users.id').onDelete('RESTRICT');
		});
	}).then(() => {
		return knex.raw('ALTER TABLE likedposts ADD CONSTRAINT check_not_liking_self CHECK ("userId" <> "postOwnerId")');
	});
};

exports.down = function(knex, Promise) {
	return Promise.try(() => {
		return knex.raw('ALTER TABLE likedposts DROP CONSTRAINT check_not_liking_self');
	}).then(() => {
		return knex.schema.alterTable('likedposts', (t) => {
			t.dropColumn('postOwnerId');
		});
	});
};