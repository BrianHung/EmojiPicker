const gulp = require('gulp');
const filter = require('gulp-filter');
const sprite = require('gulp-svg-sprite');
const path = require('path');

const { download, extractZip, readJSON } = require("./utils");

const zipURL = "https://github.com/brianhung/twemoji/archive/master.zip"
const zipPath = "./data/twemoji.zip"
const svgPath = "./data/twemoji"

/**
 * Callback function that's called when download completes.
 * @param {error} error
 */
function handleZip(error = undefined) {
  if (error !== undefined) {
    console.log(`handleZip failed! ${error.message}`)
    return
  }
  extractZip(zipPath, svgPath)

  let emojiJSON = readJSON("./data/twemoji.json")
  let emojiList = Object.values(emojiJSON).flat().map(emoji => emoji.unicode)

  const emojiFilter = filter(filename => emojiList.includes(path.parse(filename.relative).name ))
  const svgSprite = sprite({ 
    shape: { dimension: { maxWidth: 20, maxHeight: 20 }, },
    mode: { defs: { dest: '.', prefix: 'emoji-%s', sprite: 'twemoji.svg', bust: false } }
  })

  gulp.src(`${svgPath}/*.svg`)
    .pipe(emojiFilter)
    .pipe(svgSprite)           
    .pipe(gulp.dest('./data/')) 
}

download(zipURL, zipPath, handleZip)