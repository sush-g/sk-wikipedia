var request = require('superagent');
var _       = require('underscore');
var async   = require('async');

var WP_API_BASE = 'http://en.wikipedia.org/w/api.php'

var CATEGORY_PARAMS = {
  "action": "query",
  "list": "categorymembers",
  "format": "json",
  "redirects": ""
};

var PAGE_PARAMS = {
  "action": "parse",
  "format": "json",
  "prop": "text"
}

var fetch_category_members = function (cmtitle, options, callback) {
  options = options || {};

  if (options.cmtype == 'subcat') {
    options.cmnamespace = 14;
    options.cmprop = options.cmprop || 'title';
  }

  options.cmtype = options.cmtype || 'page';
  options.cmprop = options.cmprop || 'ids';
  options.cmlimit = options.cmlimit || 500;
  options.cmnamespace = options.cmnamespace || 0;

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
      
        if (querycontinue && !options.nofollow) {
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

var fetch_category_members_r = function (cmtitle, options, callback) {
  fetch_category_members(cmtitle, options, function (err, resp) {
    var subcatOptions = { cmtype: "subcat" };

    fetch_category_members(cmtitle, subcatOptions, function (subcatErr, subcatResp) {
      if (subcatErr) {
        callback(subcatErr, null);
        return;
      }
      async.eachLimit(subcatResp.query.categorymembers, 15, function(subcat, cb) {
        console.log("Subcat fetch", subcat.title);
        fetch_category_members(subcat.title, options, function(err2, resp2) {
          if (err2) {
            callback(err2, null);
            return;
          }
          resp.query.categorymembers = resp.query.categorymembers.concat(
            resp2.query.categorymembers
          );
          cb();
        });
      }, function () {
        callback(null, resp);
      });
      
    });
  });
};

var extract_page_text = function (pageid, options, callback) {
  options = options || {};
  var queryOptions = _.extend({}, PAGE_PARAMS, { pageid: pageid });

  if (options.section !== undefined) {
    queryOptions.section = options.section;
  }

  request.get(WP_API_BASE)
    .query(queryOptions)
    .set({ Accept: 'application/json' })
    .on('error', function(e) {
      console.log(e);
      callback(e, null);
    })
    .end(function (res) {
      if (res.error) {
        callback(res.error, null);
      } else {
        var data = res.body;

        if (data.parse) {
          callback(null, data.parse.text["*"]);
        } else {
          callback(data, null);
        }
      }
    });
};

exports.fetch_category_members = fetch_category_members;
exports.fetch_category_members_r = fetch_category_members_r;
exports.extract_page_text = extract_page_text;

// extract_page_text(54173, {section: 0}, function(err,data){console.log(err, data);});
// fetch_category_members_r("Category:Space_adventure_films", {}, function (err, data) {
// if (err) {
//   console.log(err);
//   return;
// } else {
//   console.log(data.query.categorymembers.length);
// }
// });