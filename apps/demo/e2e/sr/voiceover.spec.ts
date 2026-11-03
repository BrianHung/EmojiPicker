// The scenarios in ./scenarios.ts under VoiceOver.
import { mergeTests } from "@playwright/test";
import { voiceOverTest } from "@guidepup/playwright";
import { test as site } from "../support";
import { notReady } from "./ready";
import { scenarios, type Reader } from "./scenarios";

const test = mergeTests(site, voiceOverTest).extend<{ sr: Reader }>({ sr: ({ voiceOver }, use) => use(voiceOver) });
test.use({ voiceOverStartOptions: { capture: true } });

// Without the setup this skips locally; on CI it runs (and fails), so a broken runner can't pass as skipped.
const skip = process.env.CI ? null : notReady("voiceover");
if (skip) console.warn(`Skipping the VoiceOver suite: ${skip}`);
test.skip(!!skip, skip ?? "");

scenarios(test);
