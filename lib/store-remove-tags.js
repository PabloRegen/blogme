'use strict';

const Promise = require('bluebird');
const databaseError = require('database-error');
const simpleArrayDiff = require('simple-array-diff');
const rfr = require('rfr');
const errors = rfr('lib/errors');

let duplicateTag = {
	name: 'UniqueConstraintViolationError',
	table: 'tags',
	column: 'name'
};

let duplicateAssociation = {
	name: 'UniqueConstraintViolationError',
	table: 'tags_posts',
	columns: ['tagId', 'postId']
};

function removeTag(removedTag, trx1) {
	/* CASE: tag removed from post
	a) this was the only association with a post, so remove the tag itself as well (ie. populate updatedAt)
	b) this was NOT the only association, so do not remove the tag itself (ie. don't populate updatedAt) */
	return Promise.try(() => {
		return trx1('tags').where({name: removedTag.name}).first();
	}).then((result) => {
		let tagId = result.id;

		return Promise.try(() => {
			return trx1('tags_posts').delete().where({
				tagId: tagId,
				postId: postId
			});
		}).then((deletedAssociations) => {
			if (deletedAssociations.length === 0) {
				/* Race condition: there was no tags_posts association deleted for the removed tag so it was deleted before this attempt.
				Throw an error, re-fetch the data and try again */
				throw new errors.AlreadyDeletedError(`There was no tag_post association to delete for the removed "${removedTag.name}" tag`);
			} else {
				return trx1('tags_posts').where({tagId: tagId}).first();
			}
		}).then((additionalTagPostAssociation) => {
			if (additionalTagPostAssociation == null) {
				/* case a */
				return trx1('tags').update({deletedAt: knex.fn.now()}).where({id: tagId});
			}
		});
	});
}

function storeTag(addedTag, trx1) {
	/* CASE: tag added to post
	a) the tag did not exist on any other post, so 1) create the tag first and THEN 2) create the association
	b) the tag already existed on another post, so 1) update deletedAt to null 2) create the association */
	return Promise.try(() => {
		/* Subtransaction needed to allow this query to fail. 
		Otherwise the transaction's failed state would not allow to perform another query until the failed state is resolved,
		and the query within the following .catch would produce an error during the failed state */
		return trx1.transaction(function(trx2) {
			return trx2('tags').insert({name: addedTag.name}).returning('id');
		});
	}).catch(databaseError.rethrow).catch(duplicateTag, (err) => {
		/* case b */
		return trx1('tags').update({deletedAt: null}).where({name: addedTag.name}).returning('id');
	}).then((tagIds) => {
		return trx1('tags_posts').insert({
			tagId: tagIds[0],
			postId: postId
		});
	});
}

module.exports = function(knex) {
	return function(postId, newTags) {
		let wrappedNewTags = newTags.map((newTag) => {
			return {name: newTag};
		});

		/* function to re-fetch data and try again in case of race conditions */
		function storeRemoveTags() {
			return Promise.try(() => {
				/* subtransaction to deal with race conditions */
				return knex.transaction(function(trx1) {
					return Promise.try(() => {
						return trx1('tags_posts').where({postId: postId});
					}).map((tagPostAssociation) => {
						return Promise.try(() => {
							return trx1('tags').where({id: tagPostAssociation.tagId}).first();
						}).then((tag) => {
							return {
								name: tag.name, 
								postId: postId
							};
						});
					}).then((existingAssociatedTags) => {
						let diff = simpleArrayDiff(existingAssociatedTags, wrappedNewTags, 'name');

						return Promise.try(() => {
							return Promise.map(diff.removed, (removedTag) => {
								return removeTag(removedTag, trx1);
							/* FIXME!!! Even if this Promise.map itself doesn't use subtransactions, 
							I use {concurrency: 1} for the same reason I do on the Promise.map below because I don't know how far the bug reaches */
							}, {concurrency: 1});
						}).then(() => {
							return Promise.map(diff.added, (addedTag) => {
								return storeTag(addedTag, trx1);
							/* FIXME!!! There is a bug with knex subtransactions. See issue https://github.com/tgriesser/knex/issues/2213.
							When running multiple subtransactions concurrently, they don't wait for one another; 
							and if they complete in any order other than "the exact reverse of the order in which they were initiated", 
							the savepoints are released in the wrong order.
							As a workaround I added {concurrency: 1} as an extra argument options object after the callback in Bluebird's Promise.map,
							so the tag insertion queries (subtransaction) execute sequentially instead of in parallel (the default option).
							As long as there's no multiple subtransactions going on at the same time, the issue doesn't occur */
							}, {concurrency: 1});
						});
					});
				});
			}).catch({name: 'AlreadyDeletedError'}, duplicateAssociation, (err) => {
				return storeRemoveTags();
			});
		}

		return storeRemoveTags();
	};
};