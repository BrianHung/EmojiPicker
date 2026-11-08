const logs = [];
console.error = console.warn = (...args) => logs.push(args.join(" "));
const { createElement } = await import("react");
const { renderToString } = await import("react-dom/server");
const { App } = await import("./ssr/app.js");
const html = renderToString(createElement(App));
if (logs.length) throw new Error(`The server render logged:\n${logs.join("\n")}`);
if (!html.includes("<input")) throw new Error("The server render has no search field");
