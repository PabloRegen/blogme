'use strict';

exports.up = function(knex, Promise) {
	return knex.schema.alterTable('posts', (t) => {
		t.timestamp('postedAt', true).defaultTo(knex.raw('CURRENT_TIMESTAMP')).alter();
		t.timestamp('updatedAt', true).alter();
	});
};

exports.down = function(knex, Promise) {
	return knex.schema.alterTable('posts', (t) => {
		t.timestamp('postedAt').defaultTo(knex.raw('CURRENT_TIMESTAMP')).alter();
		t.timestamp('updatedAt').alter();
	});
};