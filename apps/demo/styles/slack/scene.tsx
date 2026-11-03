// Slack style, in situ: the existing Slack channel mockup (sections/slack.tsx), re-exported
// so every app's scene lives under styles/<app>/scene.tsx. It follows the site theme
// (its own `dark:` classes) rather than forcing one.
export { SlackDemo as SlackScene, SlackDemo as default } from "../../sections/slack";
