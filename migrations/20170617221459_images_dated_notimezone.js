'use strict';

exports.up = function(knex, Promise) {
	return knex.schema.alterTable('images', (t) => {
		t.timestamp('dated', true).alter();
	});
};

exports.down = function(knex, Promise) {
	return knex.schema.alterTable('images', (t) => {
		t.timestamp('dated').alter();
	});
};