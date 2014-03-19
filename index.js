var request = require('superagent');
var _ = require('underscore');
var async = require('async');

var WP_API_BASE = 'http://en.wikipedia.org/w/api.php'

var CATEGORY_PARAMS = {
	"action": "query",
	"list": "categorymembers",
	"format": "json",
	"redirects": ""
}

var fetch_category_members = function(cmtitle, options, callback) {
	options = options || {};

	options.cmtype = options.cmtype || 'page';
	options.cmprop = options.cmprop || 'ids';
	options.cmlimit = options.cmlimit || 500;

	options.cmnamespace = options.cmnamespace || 0;
	
	if (options.cmtype == 'subcat') {
		options.cmnamespace = 14;
	}

	var queryOptions = {
		cmtitle: cmtitle,
		cmtype: options.cmtype,
		cmprop: options.cmprop,
		cmlimit: options.cmlimit,
		cmnamespace: options.cmnamespace
	}

	if (options.cmcontinue) {
		queryOptions.cmcontinue = options.cmcontinue;
	}

	queryOptions = _.extend({}, CATEGORY_PARAMS, queryOptions);

	request.get(WP_API_BASE)
		.query(queryOptions)
		.set({ Accept: 'application/json' })
		.end(function(res) {
			if (res.error) {
				callback(res.error, null);
				return;
			} else {
				var data = res.body;
				var querycontinue = data['query-continue'];
				if (querycontinue) {
					var cmcontinue = querycontinue.categorymembers.cmcontinue;
					console.log("Continue with", cmtitle, cmcontinue);
					options.cmcontinue = cmcontinue;

					fetch_category_members(cmtitle, options, function (err, resp) {
						if (err) {
							callback(err, null);
						} else {
							resp.query.categorymembers = data.query.categorymembers
								.concat(resp.query.categorymembers);
							callback(null, resp);
						}
					});

				} else {
					callback(null, data);
				}
			}
		}
	);
};

// fetch_category_members("Category:Space_adventure_films", {}, function (err, data) {
// 	if (err) {
// 		console.log(err);
// 		return;
// 	} else {
// 		console.log(data.query.categorymembers.length);
// 	}
// });