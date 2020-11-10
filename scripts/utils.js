const request = require('superagent');
const fs = require('fs');
const admZip = require('adm-zip');

exports.download = (url, dest, callback) => {
  request
    .get(url)
    .on('error', error => callback(error))
    .pipe(fs.createWriteStream(dest))
    .on('finish', () => callback());
}

exports.readJSON = (path) => JSON.parse(fs.readFileSync(path));

exports.saveJSON = (objectJSON, dest) => fs.writeFileSync(dest, JSON.stringify(objectJSON));

exports.extractZip = (zipFile, outputDir) => {
  const zip = new admZip(zipFile)
  zip.extractEntryTo("twemoji-master/assets/svg/", outputDir, false, true);
}

