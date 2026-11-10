import { createRequire, registerHooks } from "node:module";
import { pathToFileURL } from "node:url";

const require18 = createRequire(new URL("../../../node_modules/.react18/node_modules/", import.meta.url));
const urls = Object.fromEntries(["react", "react/jsx-runtime", "react/jsx-dev-runtime", "react-dom", "react-dom/client", "react-dom/server"].map((s) => [s, pathToFileURL(require18.resolve(s)).href]));

registerHooks({ resolve: (specifier, context, next) => (urls[specifier] ? { url: urls[specifier], shortCircuit: true } : next(specifier, context)) });
