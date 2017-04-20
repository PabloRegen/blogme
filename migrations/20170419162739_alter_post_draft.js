'use strict'

exports.up = function(knex, Promise) {
	return knex.schema.alterTable('posts', (t) => {
		t.boolean('isDraft').notNullable().alter();
	});
};

exports.down = function(knex, Promise) {
	return knex.schema.alterTable('posts', (t) => {
		t.boolean('isDraft').notNullable().defaultTo(false).alter();
	});
};