import { describe, expect, it } from "vitest";
import {
  clearSelection,
  getSelectionSummary,
  pruneSelection,
  selectAllVisible,
  toggleSelection
} from "./selection";

describe("event selection helpers", () => {
  it("toggles selected ids without duplicating them", () => {
    expect(toggleSelection([], "a")).toEqual(["a"]);
    expect(toggleSelection(["a"], "a")).toEqual([]);
    expect(toggleSelection(["a"], "b")).toEqual(["a", "b"]);
  });

  it("selects exactly the visible event ids", () => {
    expect(selectAllVisible(["a"], ["b", "c"])).toEqual(["b", "c"]);
  });

  it("prunes selected ids that are no longer visible", () => {
    expect(pruneSelection(["a", "b", "c"], ["b", "c", "d"])).toEqual(["b", "c"]);
  });

  it("reports a useful selection summary", () => {
    expect(getSelectionSummary([])).toBe("未选择事件");
    expect(getSelectionSummary(["a"])).toBe("已选择 1 条事件");
    expect(getSelectionSummary(["a", "b"])).toBe("已选择 2 条事件");
  });

  it("clears selection", () => {
    expect(clearSelection()).toEqual([]);
  });
});
