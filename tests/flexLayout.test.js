import { describe, expect, it } from "@jest/globals";
import { flexLayout } from "../src/common/render.js";

describe("flexLayout", () => {
  it("should work with row & col layouts", () => {
    const layout = flexLayout({
      items: ["<text>1</text>", "<text>2</text>"],
      gap: 60,
    });

    expect(layout).toStrictEqual([
      `<g transform="translate(0, 0)"><text>1</text></g>`,
      `<g transform="translate(60, 0)"><text>2</text></g>`,
    ]);

    const columns = flexLayout({
      items: ["<text>1</text>", "<text>2</text>"],
      gap: 60,
      direction: "column",
    });

    expect(columns).toStrictEqual([
      `<g transform="translate(0, 0)"><text>1</text></g>`,
      `<g transform="translate(0, 60)"><text>2</text></g>`,
    ]);
  });

  it("should keep sizes aligned when an item is empty", () => {
    const layout = flexLayout({
      items: ["", "<text>2</text>", "<text>3</text>"],
      gap: 10,
      sizes: [50, 100, 20],
    });

    // The empty item is skipped, but the remaining items keep their own size
    // instead of inheriting the size of the previous (hidden) item.
    expect(layout).toStrictEqual([
      `<g transform="translate(0, 0)"><text>2</text></g>`,
      `<g transform="translate(110, 0)"><text>3</text></g>`,
    ]);
  });

  it("should work with sizes", () => {
    const layout = flexLayout({
      items: [
        "<text>1</text>",
        "<text>2</text>",
        "<text>3</text>",
        "<text>4</text>",
      ],
      gap: 20,
      sizes: [200, 100, 55, 25],
    });

    expect(layout).toStrictEqual([
      `<g transform="translate(0, 0)"><text>1</text></g>`,
      `<g transform="translate(220, 0)"><text>2</text></g>`,
      `<g transform="translate(340, 0)"><text>3</text></g>`,
      `<g transform="translate(415, 0)"><text>4</text></g>`,
    ]);
  });
});
