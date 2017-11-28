'use strict';

exports.up = function(knex, Promise) {
	return knex.schema.alterTable('slugs', (t) => {
		t.boolean('isCurrent').notNullable().alter();
	});
};

exports.down = function(knex, Promise) {
	return knex.schema.alterTable('slugs', (t) => {
		t.boolean('isCurrent').defaultTo(false).alter();
	});
};