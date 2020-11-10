
const { download, readJSON, saveJSON } = require("./utils");

const categories = ["Smileys & Emotion", "People & Body", "Animals & Nature", "Food & Drink", "Activities", "Travel & Places", "Objects", "Symbols", "Flags"];

const compareEmoji = (a, b) => {
  return a.category !== b.category ? categories.indexOf(a.category) - categories.indexOf(b.category) : a.sort_order - b.sort_order;
}

const unifiedToNative = (unified) => {
  const codePoints = unified.split('-').map(u => parseInt(u, 16));
  return String.fromCodePoint.apply(String, codePoints);
}

const equalExceptVariationSelector = (a, b) => {
  return a == b || a == b.substring(0, b.length - 1)
}

const emojiKeywords = require("emoji-keywords");

function parseEmojiData({ name, unified, short_name, short_names, category, skin_variations }) {
  const emoji = { unicode: unified.toLowerCase(), name: short_name.replace(/_/g, '-'), category }
  const keywords = emojiKeywords.find(item => equalExceptVariationSelector(item.character, unifiedToNative(unified)))
  emoji.keywords = [...new Set([name && name.toLowerCase(), ...short_names.map(name => name.replace(/_/g, ' ')), ...(keywords && keywords.keywords)])].filter(Boolean)
  emoji.skins = skin_variations ? Object.values(skin_variations).map(v => v.unified.toLowerCase()) : undefined
  return emoji;
}

function groupByKey(list, key) {
  return list.reduce((groups, item) => {
    groups[item[key]] = groups[item[key]] || [];
    groups[item[key]].push(item);
    return groups;
  }, {});
}

const parseEmojiJSON = (dataJSON) => {
  dataJSON = dataJSON.filter(d => !d.obsoleted_by && d.has_img_twitter && categories.includes(d.category)); // exclude 'Skin Tones' category
  dataJSON = dataJSON.sort(compareEmoji); // sort by category and by sort_order
  dataJSON = dataJSON.map(d => parseEmojiData(d)); // add keywords and skin variations
  dataJSON = groupByKey(dataJSON, "category"); // group by category 
  Object.values(dataJSON).forEach(emojiList => emojiList.forEach(emoji => delete emoji["category"])) // delete the category key 
  return dataJSON
}

download("https://raw.githubusercontent.com/iamcal/emoji-data/master/emoji_pretty.json", "./data/emoji.json", 
  (error) => {
    if (error !== undefined) { console.log(`handleJSON failed! ${error.message}`); return}
    const emojiJSON = readJSON("./data/emoji.json");
    saveJSON(parseEmojiJSON(emojiJSON), "./data/twemoji.json")
  }
)

