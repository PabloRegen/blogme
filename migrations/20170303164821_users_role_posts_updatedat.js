'use strict';

exports.up = function(knex, Promise) {
	return Promise.all([
		knex.schema.table('users', function(t) {
			t.integer('role').notNullable().defaultTo(1);
			t.dropColumn('isModerator');
		}),
		knex.raw('ALTER TABLE posts ALTER "updatedAt" DROP DEFAULT')
	]);
};

exports.down = function(knex, Promise) {
	return Promise.all([
		knex.schema.table('users', function(t) {
			t.dropColumn('role');
			t.boolean('isModerator').defaultTo(false);
		}),
		knex.raw('ALTER TABLE posts ALTER "updatedAt" SET DEFAULT "CURRENT_TIMESTAMP"')
	]);
};