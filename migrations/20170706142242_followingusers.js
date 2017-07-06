'use strict';

exports.up = function(knex, Promise) {
	return knex.schema.createTable('followingusers', (t) => {
		t.increments();
		t.integer('userId').notNullable().references('users.id').onDelete('RESTRICT');
		t.integer('followedUserId').notNullable().references('users.id').onDelete('RESTRICT');
		t.timestamp('followAt', true).defaultTo(knex.raw('CURRENT_TIMESTAMP'));
		t.unique(['userId', 'followedUserId']);
	});
};

exports.down = function(knex, Promise) {
	return knex.schema.dropTableIfExists('followingusers');
};