import { renderMdxPage } from "@/components/site/mdx";
import { Packs } from "./demo";
import * as page from "./page.mdx";
import "@/globals.css";

renderMdxPage(page, "/examples/custom-emoji.md", Packs);
