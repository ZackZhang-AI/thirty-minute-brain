export function toggleSelection(selectedIds: string[], id: string): string[] {
  return selectedIds.includes(id) ? selectedIds.filter((selectedId) => selectedId !== id) : [...selectedIds, id];
}

export function selectAllVisible(_selectedIds: string[], visibleIds: string[]): string[] {
  return [...visibleIds];
}

export function pruneSelection(selectedIds: string[], visibleIds: string[]): string[] {
  const visible = new Set(visibleIds);
  return selectedIds.filter((id) => visible.has(id));
}

export function clearSelection(): string[] {
  return [];
}

export function getSelectionSummary(selectedIds: string[]): string {
  if (selectedIds.length === 0) return "未选择事件";
  return `已选择 ${selectedIds.length} 条事件`;
}
