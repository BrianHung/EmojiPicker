import { mergeTests } from "@playwright/test";
import { nvdaTest } from "@guidepup/playwright";
import { test as site } from "../support";
import { notReady } from "./ready";
import { scenarios, type Reader } from "./scenarios";

const test = mergeTests(site, nvdaTest).extend<{ sr: Reader }>({ sr: ({ nvda }, use) => use(nvda) });
test.use({ nvdaStartOptions: { capture: true } });

const skip = process.env.CI ? null : notReady("nvda");
if (skip) console.warn(`Skipping the NVDA suite: ${skip}`);
test.skip(!!skip, skip ?? "");

scenarios(test);
