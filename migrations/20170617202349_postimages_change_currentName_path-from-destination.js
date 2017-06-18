'use strict';

exports.up = function(knex, Promise) {
	return knex.schema.alterTable('postimages', (t) => {
		t.renameColumn('currentName', 'path-from-destination');
	});
};

exports.down = function(knex, Promise) {
	return knex.schema.alterTable('postimages', (t) => {
		t.renameColumn('path-from-destination', 'currentName');
	});
};