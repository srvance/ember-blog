'use strict';

/* Dependencies */

var CachingWriter = require('broccoli-caching-writer');
var compiler = require('ember-template-compiler');
var fs = require('fs');
var mkdirp = require('mkdirp');
var parsePost = require('./parse-post');
var path = require('path');
var walkSync = require('walk-sync');

/* Create */

function FixturesCreator(inputTree, options) {
  if (!(this instanceof FixturesCreator)) {
    return new FixturesCreator(inputTree, options);
  }

  CachingWriter.apply(this, arguments); // this._super();

  this.inputTree = inputTree;
  this.options = options;
  this.categoriesFixtures = [];
  this.postsFixtures = [];
}

FixturesCreator.prototype = Object.create(CachingWriter.prototype);
FixturesCreator.prototype.constructor = FixturesCreator;

FixturesCreator.prototype.updateCache = function(srcDir, destDir) {
  var _this = this;
  var options = _this.options;

  var filePaths = walkSync(srcDir);
  var fileOptions = options.fileOptions;
  var fixturesDir  = path.join(destDir, options.fixturesDir);
  var templatesDir = path.join(destDir, options.templatesDir);

  if (!filePaths.length) {
    return;
  }

  /* Check that all necessary directories exist */

  [fixturesDir, templatesDir].forEach(function(dir) {
    if (!fs.exists(dir)) {
      mkdirp.sync(dir);
    }
  });

  /* Parse each post and setup fixtures */

  filePaths.forEach(function(filePath) {
    var srcPath  = path.join(srcDir[0], filePath);
    var isDirectory = srcPath.slice(-1) === '/';
    var dirPath, post, template;

    if (isDirectory) {
      dirPath = path.join(destDir, filePath);

       if (!fs.exists(dirPath)) {
        mkdirp.sync(dirPath);
      }
    } else {
      post = fs.readFileSync(srcPath, fileOptions);
      post = parsePost.parsePost(post);

      template = compiler.precompile(post['body']);
      template = 'Em.Handlebars.template(' + template + ');\n'
      template = "import Em from 'ember';\nexport default " + template;

      fs.writeFileSync(templatesDir + '/' + post['urlString'] + '.js', template, fileOptions);

      _this.postsFixtures.push('\n\n' + JSON.stringify(post));
    }
  });

  /* Setup categories fixtures */

  console.log(parsePost.categories);

  parsePost.categories.forEach(function(category, i) {
    _this.categoriesFixtures.push('\n\n' + JSON.stringify({
      id: i,
      name: category
    }));
  });

  console.log(_this.categoriesFixtures);

  // TODO - Need categories relationships
  // TODO - Need to remove old posts

  ['categories', 'posts'].forEach(function(name) {
    var fixtures = _this[name + 'Fixtures'];
    var fileContents = 'export default [' +  fixtures + '];';
    var fileName = path.join(fixturesDir, name + '.js');

    fs.writeFileSync(fileName, fileContents, fileOptions);
  });

}

module.exports = FixturesCreator;