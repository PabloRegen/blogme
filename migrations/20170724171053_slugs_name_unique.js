'use strict';

exports.up = function(knex, Promise) {
	return knex.schema.alterTable('slugs', (t) => {
		t.text('name').notNullable().unique().alter();
	});
};

exports.down = function(knex, Promise) {
	return knex.schema.alterTable('slugs', (t) => {
		t.text('name').notNullable().alter();
	});
};