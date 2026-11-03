// The scenarios in ./scenarios.ts under NVDA.
import { mergeTests } from "@playwright/test";
import { nvdaTest } from "@guidepup/playwright";
import { test as site } from "../support";
import { notReady } from "./ready";
import { scenarios, type Reader } from "./scenarios";

const test = mergeTests(site, nvdaTest).extend<{ sr: Reader }>({ sr: ({ nvda }, use) => use(nvda) });
test.use({ nvdaStartOptions: { capture: true } });

// Without the setup this skips locally; on CI it runs (and fails), so a broken runner can't pass as skipped.
const skip = process.env.CI ? null : notReady("nvda");
if (skip) console.warn(`Skipping the NVDA suite: ${skip}`);
test.skip(!!skip, skip ?? "");

scenarios(test);
