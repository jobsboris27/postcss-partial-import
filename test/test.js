var path    = require('path');
var postcss = require('postcss');
var expect  = require('chai').expect;
var fs      = require('fs-promise');

var plugin = require('../');

function testFixture(name, opts, done) {
	var fixtureDir = './test/fixtures/';
	var inputPath  = path.resolve(fixtureDir + name + '.css');
	var actualPath = path.resolve(fixtureDir + name + '.actual.css');
	var expectPath = path.resolve(fixtureDir + name + '.expect.css');

	var inputCSS  = fs.readFileSync(inputPath, 'utf8');
	var expectCSS = fs.readFileSync(expectPath, 'utf8');

	postcss([plugin(opts)]).process(inputCSS, {
		from: inputPath
	}).then(function (result) {
		var actualCSS = result.css;

		fs.writeFileSync(actualPath, actualCSS);

		expect(actualCSS).to.eql(expectCSS);
		expect(result.warnings()).to.be.empty;

		done();
	}).catch(function (error) {
		done(error);
	});
}

function testString(inputCSS, expectCSS, opts, done) {
	postcss([plugin(opts)]).process(inputCSS).then(function (result) {
		var actualCSS = result.css;

		expect(actualCSS).to.eql(expectCSS);
		expect(result.warnings()).to.be.empty;

		done();
	}).catch(function (error) {
		done(error);
	});
}

describe('postcss-partial-import', function () {
	it('imports up and down a tree', function (done) {
		testFixture('basic', {}, done);
	});

	it('fails on bad imports', function (done) {
		var fixtureDir = './test/fixtures/';
		var inputPath  = path.resolve(fixtureDir + 'broken.css');
		var inputCSS  = fs.readFileSync(inputPath, 'utf8');
		postcss([plugin({})]).process(inputCSS, {
			from: inputPath
		}).then(function () { }, function (err) {
			expect(err).to.eql('Empty import detected');
			done();
		});
	});

	it('generates imports', function (done) {
		var fixtureDir = './test/fixtures/';
		var name       = 'generate';
		var inputPath  = path.resolve(fixtureDir + name + '.css');
		var actualPath = path.resolve(fixtureDir + name + '.actual.css');
		var expectPath = path.resolve(fixtureDir + name + '.expect.css');
		var tempPath   = path.resolve(fixtureDir + name + '-created.css');

		var inputCSS  = fs.readFileSync(inputPath, 'utf8');
		var expectCSS = fs.readFileSync(expectPath, 'utf8');

		postcss([plugin({ generate: true })]).process(inputCSS, {
			from: inputPath
		}).then(function (result) {
			var actualCSS = result.css;

			fs.writeFileSync(actualPath, actualCSS);

			expect(actualCSS).to.eql(expectCSS);
			expect(result.warnings()).to.be.empty;

			fs.stat(tempPath).then(function () {
				fs.remove(tempPath).then(done);
			});
		});
	});

	it('handles string input', function (done) {
		testString('@import "test/fixtures/level1/qux";', '.level-1-qux {\n    background-color: black\n}', {}, done);
	});

	it('ignores remote imports', function (done) {
		testFixture('web', {}, done);
	});

	it('handles media queried imports', function (done) {
		testFixture('media', {}, done);
	});

	it('caches results', function (done) {
		testFixture('basic', { cachedir: path.join(__dirname, 'cache') }, function () {
			var cache = require( path.join(__dirname, 'cache', 'imports.json'));
			expect(Object.keys(cache).length).to.eql(10);
			testFixture('basic', { cachedir: path.join(__dirname, 'cache') }, done);
		});
	});
});
