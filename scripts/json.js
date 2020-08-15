const urlJSON = "https://raw.githubusercontent.com/iamcal/emoji-data/master/emoji_pretty.json";
const pathJSON = "./data/emoji.json"
const saveDest = "./data/twemoji.json"

const { download, parseEmojiJSON, readJSON, saveJSON } = require("./utils");

/**
 * Callback function that's called when download completes.
 * @param {error} error
 */
function handleJSON(error = undefined) {
  if (error !== undefined) {
    console.log(`handleJSON failed! ${error.message}`)
    return
  }
  const emojiJSON = readJSON(pathJSON);
  saveJSON(parseEmojiJSON(emojiJSON), saveDest)
}

download(urlJSON, pathJSON, handleJSON)

