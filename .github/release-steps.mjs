import { execSync } from "node:child_process";

const STEPS = {
  check: [
    "npx biome ci .",
    "npm run typecheck",
    "npm test",
    "npm test -w demo",
    "node .github/build-package.mjs @emoji-components/core",
    "node .github/build-package.mjs emoji-components",
    // Export parity, a declaration-emitting consumer, the naming rules, and the committed API reports
    "node .github/api.mjs",
    "git diff --exit-code -- packages/core/api.md packages/react/api.md",
    "npm run size",
    "npm run build -w @emoji-components/data",
    "npm test -w @emoji-components/data",
    "npm run lint:packages",
    "node .github/version-check.mjs",
  ],
  font: ["node .github/font-check.mjs"],
  smoke: ["npm run smoke"],
  onboarding: ["npm run onboarding"],
  // npx, not npm run: npm 11 drops some flags (such as --output) passed after --
  e2e: ["npx playwright test"],
  a11y: ["npm run test:a11y"],
};

const [groups, extra] = ((args) => {
  const split = args.indexOf("--");
  return split < 0 ? [args, []] : [args.slice(0, split), args.slice(split + 1)];
})(process.argv.slice(2));

const unknown = groups.filter((g) => !(g in STEPS));
if (unknown.length) throw new Error(`unknown step group: ${unknown.join(", ")} (one of ${Object.keys(STEPS).join(", ")})`);

for (const group of groups.length ? groups : Object.keys(STEPS))
  for (const step of STEPS[group]) {
    const command = group === "e2e" ? [step, ...extra].join(" ") : step;
    console.log(`\n> ${command}`);
    execSync(command, { stdio: "inherit", cwd: group === "e2e" ? "apps/demo" : undefined, env: group === "e2e" || group === "a11y" ? { ...process.env, E2E_BUILD: "1" } : process.env });
  }
