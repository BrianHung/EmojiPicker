// @vitest-environment jsdom
import * as React from "react";
import { expect, it } from "vitest";
import { createTestRoot } from "../../../test/render";
import { en } from "../../../test/en";
import { EmojiPicker, EmojiProvider } from "../..";

function Title() {
  return <EmojiPicker.ListSectionTitle className="title">{({ section }) => `${section.name}!`}</EmojiPicker.ListSectionTitle>;
}

const LazyItems = React.lazy(async () => ({ default: () => <EmojiPicker.ListItems>{() => <EmojiPicker.ListCell className="cell" />}</EmojiPicker.ListItems> }));

it("renders section parts given through a wrapper component or a lazy element", async () => {
  const host = document.body.appendChild(document.createElement("div"));
  await React.act(async () =>
    createTestRoot(host).render(
      <EmojiProvider data={en} prepare={false}>
        <EmojiPicker.Root frequent={false}>
          <EmojiPicker.Viewport>
            <React.Suspense>
              <EmojiPicker.List>
                {() => (
                  <EmojiPicker.ListSection>
                    <Title />
                    <LazyItems />
                  </EmojiPicker.ListSection>
                )}
              </EmojiPicker.List>
            </React.Suspense>
          </EmojiPicker.Viewport>
        </EmojiPicker.Root>
      </EmojiProvider>,
    ),
  );
  const titles = [...host.querySelectorAll('[data-slot="emoji-picker-section-title"]')];
  expect(titles.length).toBeGreaterThan(0);
  expect(titles.every((t) => t.classList.contains("title") && t.textContent?.endsWith("!"))).toBe(true);
  const cells = host.querySelectorAll('[data-slot="emoji-picker-emoji"]');
  expect(cells.length).toBeGreaterThan(0);
  expect([...cells].every((c) => c.classList.contains("cell"))).toBe(true);
});
