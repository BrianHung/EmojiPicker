const request = require('superagent');
const fs = require('fs');
const admZip = require('adm-zip');
const path = require('path');

exports.download = (url, dest, callback) => {
  request
    .get(url)
    .on('error', error => callback(error))
    .pipe(fs.createWriteStream(dest))
    .on('finish', () => callback());
}

exports.readJSON = (path) => {
  return JSON.parse(fs.readFileSync(path))
}

exports.saveJSON = (objectJSON, dest) => {
  fs.writeFileSync(dest, JSON.stringify(objectJSON));
}

const categories = ["Smileys & Emotion", "People & Body", "Animals & Nature", "Food & Drink", "Activities", "Travel & Places", "Objects", "Symbols", "Flags"];

function compareEmoji(a, b) {
  return a.category !== b.category ? categories.indexOf(a.category) - categories.indexOf(b.category)
    : a.sort_order - b.sort_order;
}


function unifiedToNative(unified) {
  const codePoints = unified.split('-').map(u => parseInt(u, 16));
  return String.fromCodePoint.apply(String, codePoints);
}

const emojiLib = require("emojilib");
const emojiArray = Object.values(emojiLib.lib);

function parseEmojiData({ unified, short_name, category, skin_variations }) {
  const emoji = { unicode: unified.toLowerCase(), name: short_name.replace(/_/g, ' '), category };
  const emojiLibItem = emojiArray.find(item => item.char === unifiedToNative(unified))
  emojiLibItem && (emoji.keywords = emojiLibItem.keywords)
  skin_variations && (emoji.skins = Object.values(skin_variations).map(v => v.unified.toLowerCase()))    
  return emoji;
}

function groupByKey(list, key) {
  return list.reduce((groups, item) => {
    groups[item[key]] = groups[item[key]] || [];
    groups[item[key]].push(item);
    return groups;
  }, {});
}

exports.parseEmojiJSON = (dataJSON) => {
  dataJSON = dataJSON.filter(d => !d.obsoleted_by && d.has_img_twitter && categories.includes(d.category));
  dataJSON = dataJSON.sort(compareEmoji);
  dataJSON = dataJSON.map(d => parseEmojiData(d));
  // Group by category and then delete the category key from each emoji.
  dataJSON = groupByKey(dataJSON, "category");
  Object.values(dataJSON).forEach(emojiList => emojiList.forEach(emoji => delete emoji["category"]))
  return dataJSON
}

function ensureDirectory(dest) {
  const dirname = path.dirname(dest);
  if (fs.existsSync(dirname)) 
    return true;
  ensureDirectory(dirname);
  fs.mkdirSync(dirname);
}

exports.extractZip = (zipFile, outputDir) => {
  const zip = new admZip(zipFile)
  zip.extractEntryTo("twemoji-master/assets/svg/", outputDir, false, true);
}

