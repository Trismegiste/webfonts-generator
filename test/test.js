const fs = require('fs');
const path = require('path');
const _ = require('lodash');
const assert = require('assert');

const readChunk = require('read-chunk');
const getFileType = require('file-type');

const webfontsGenerator = require('..');

describe('webfont', () => {
  const SRC = path.join(__dirname, 'src');
  const DEST = path.join(__dirname, 'dest');

  const FILES = _.map(fs.readdirSync(SRC), file => {
    return path.join(SRC, file);
  });

  const TYPES = ['ttf', 'woff', 'woff2', 'svg'];
  const FONT_NAME = 'fontName';

  const OPTIONS = {
    dest: DEST,
    files: FILES,
    fontName: FONT_NAME,
    types: TYPES,
  };

  afterEach(done => fs.rm(DEST, { recursive: true, force: true }, () => done()));

  it('generates all fonts and css files', done => {
    webfontsGenerator(OPTIONS, err => {
      if (err) return done(err);

      const destFiles = fs.readdirSync(DEST);
      for (const type of TYPES) {
        const filename = `${FONT_NAME}.${type}`;
        const filepath = path.join(DEST, filename);
        assert(destFiles.includes(filename), `${type} file exists`);
        assert(fs.statSync(filepath).size > 0, `${type} file is not empty`);

        const DETECTABLE = ['ttf', 'woff', 'woff2'];
        if (_.includes(DETECTABLE, type)) {
          const chunk = readChunk.sync(filepath, 0, 262);
          const filetype = getFileType(chunk);
          assert.equal(
            type,
            filetype && filetype.ext,
            'ttf filetype is correct'
          );
        }
      }

      const cssFile = path.join(DEST, `${FONT_NAME}.css`);
      assert(fs.existsSync(cssFile), 'CSS file exists');
      assert(fs.statSync(cssFile).size > 0, 'CSS file is not empty');

      const htmlFile = path.join(DEST, `${FONT_NAME}.html`);
      assert(!fs.existsSync(htmlFile), 'HTML file does not exists by default');

      done(null);
    });
  });

  it('returns object with fonts and function generateCss()', () => {
    webfontsGenerator(OPTIONS, (err, result) => {
      assert(result.svg);
      assert(result.ttf);

      assert.equal(typeof result.generateCss, 'function');
      const css = result.generateCss();
      assert.equal(typeof css, 'string');
    });
  });

  it('function generateCss can change urls', () => {
    webfontsGenerator(OPTIONS, (err, result) => {
      const urls = { svg: 'AAA', ttf: 'BBB', woff: 'CCC' };
      const css = result.generateCss(urls);
      assert(css.includes('AAA'));
    });
  });

  it('gives error when "dest" is undefined', done => {
    const options = _.extend({}, OPTIONS, { dest: undefined });
    webfontsGenerator(options, err => {
      assert(err !== undefined);
      done();
    });
  });

  it('gives error when "files" is undefined', done => {
    const options = _.extend({}, OPTIONS, { files: undefined });
    webfontsGenerator(options, err => {
      assert(err !== undefined);
      done();
    });
  });

  it('uses codepoints and startCodepoint', done => {
    const START_CODEPOINT = 0x40;
    const CODEPOINTS = {
      close: 0xff,
    };
    const options = _.extend({}, OPTIONS, {
      codepoints: CODEPOINTS,
      startCodepoint: START_CODEPOINT,
    });
    webfontsGenerator(options, err => {
      if (err) return done(err);

      const svg = fs.readFileSync(path.join(DEST, `${FONT_NAME}.svg`), 'utf8');

      function codepointInSvg(cp) {
        return svg.includes(cp.toString(16).toUpperCase());
      }

      assert(codepointInSvg(START_CODEPOINT), 'startCodepoint used');
      assert(codepointInSvg(START_CODEPOINT + 1), 'startCodepoint incremented');
      assert(codepointInSvg(CODEPOINTS.close), 'codepoints used');

      done();
    });
  });

  it('generates html file when options.html is true', done => {
    const options = _.extend({}, OPTIONS, { html: true });
    webfontsGenerator(options, err => {
      if (err) return done(err);

      const htmlFile = path.join(DEST, `${FONT_NAME}.html`);
      assert(fs.existsSync(htmlFile), 'HTML file exists');
      assert(fs.statSync(htmlFile).size > 0, 'HTML file is not empty');

      done(null);
    });
  });
});
