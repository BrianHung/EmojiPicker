#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { parseArgs } from "node:util";
import { gzipSync } from "node:zlib";
import { buildDataset, defaultShortcodeSets, emojibaseLocales, findEmojibase } from "./build-data";

const USAGE = `Usage: emoji-picker build-data <locale> [--out <file>] [--shortcodes <sets>]

Builds a dataset for <locale> from emojibase-data.

  --out         Where to write it. Default: ./<locale>.json
  --shortcodes  emojibase shortcode sets, comma-separated, in priority order:
                iamcal (Slack), cldr, cldr-native, emojibase, github, joypixels.
                Default: iamcal for English, iamcal,cldr otherwise.

Example: npx @brianhung/emoji-picker build-data ja --out public/emoji/ja.json`;

const INSTALL = `emoji-picker build-data reads emojibase-data. Install it in your project:

  npm install --save-dev emojibase-data

or run both together: npx -p emojibase-data -p @brianhung/emoji-picker emoji-picker build-data <locale>`;

function fail(message: string): never {
  console.error(message);
  process.exit(1);
}

function main(argv: string[]) {
  const { values, positionals } = parseArgs({
    args: argv,
    allowPositionals: true,
    options: { out: { type: "string", short: "o" }, shortcodes: { type: "string" }, help: { type: "boolean", short: "h" } },
  });
  const [command, locale] = positionals;
  if (values.help || !command) return console.log(USAGE);
  if (command !== "build-data") fail(`Unknown command "${command}".\n\n${USAGE}`);
  if (!locale) fail(USAGE);

  const emojibase = findEmojibase();
  if (!emojibase) fail(INSTALL);
  const locales = emojibaseLocales(emojibase.root);
  if (!locales.includes(locale)) fail(`emojibase-data has no locale "${locale}". Available: ${locales.join(", ")}`);

  const shortcodes =
    values.shortcodes
      ?.split(",")
      .map((s) => s.trim())
      .filter(Boolean) ?? defaultShortcodeSets(locale);
  const { dataset, stats } = buildDataset({ locale, shortcodes, load: emojibase.load });
  const out = path.resolve(values.out ?? `${locale}.json`);
  const json = JSON.stringify(dataset);
  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(out, json);
  const shown = path.relative(process.cwd(), out);
  console.log(
    `${shown.startsWith("..") ? out : shown}: ${stats.emoji} emoji, ${stats.withShortcodes} with shortcodes (${shortcodes.join(", ")}), ` +
      `${stats.computedTones} tone sets computed, ${stats.toneExceptions} exceptions, ` +
      `${(json.length / 1024).toFixed(1)} KB raw / ${(gzipSync(json, { level: 9 }).length / 1024).toFixed(1)} KB gz`,
  );
}

try {
  main(process.argv.slice(2));
} catch (error) {
  fail(error instanceof Error ? error.message : String(error));
}
