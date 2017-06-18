'use strict';

exports.up = function(knex, Promise) {
	return knex.schema.alterTable('postimages', (t) => {
		t.renameColumn('path-from-destination', 'path');
	});
};

exports.down = function(knex, Promise) {
	return knex.schema.alterTable('postimages', (t) => {
		t.renameColumn('path', 'path-from-destination');
	});
};