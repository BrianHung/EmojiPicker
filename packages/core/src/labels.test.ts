import { describe, expect, it } from "vitest";
import { defaultLabels, plural } from "./labels";

describe("labels", () => {
  it("counts with plural rules and the locale's digits", () => {
    expect([0, 1, 2, 1234].map(defaultLabels.resultCount)).toEqual(["No results", "1 result", "2 results", "1,234 results"]);
    const ru = plural("ru", { one: "# результат", few: "# результата", many: "# результатов", other: "# результата" });
    expect([1, 3, 5, 21].map(ru)).toEqual(["1 результат", "3 результата", "5 результатов", "21 результат"]);
    expect(plural("de", { other: "# Ergebnisse" })(1234)).toBe("1.234 Ergebnisse");
  });
});
