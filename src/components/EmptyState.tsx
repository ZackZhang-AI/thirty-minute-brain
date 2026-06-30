import { IconClockSearch, IconFileImport, IconClipboardText } from "@tabler/icons-react";

export function EmptyState() {
  return (
    <div className="flex min-h-[420px] flex-col items-center justify-center px-6 text-center">
      <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-xl border border-zinc-800 bg-zinc-950 text-emerald-300">
        <IconClockSearch size={28} stroke={1.8} />
      </div>
      <h2 className="text-lg font-semibold text-zinc-100">还没有临时记忆</h2>
      <p className="mt-2 max-w-md text-sm leading-6 text-zinc-400">
        复制一段文本、手动添加链接或文件路径，最近 30 分钟的线索会出现在这里。
      </p>
      <div className="mt-5 grid w-full max-w-md gap-2 text-left text-sm text-zinc-400 sm:grid-cols-2">
        <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-3">
          <IconClipboardText className="mb-2 text-emerald-300" size={18} stroke={1.8} />
          Clipboard text appears automatically when access is available.
        </div>
        <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-3">
          <IconFileImport className="mb-2 text-emerald-300" size={18} stroke={1.8} />
          Manual links and file paths are safe to add now.
        </div>
      </div>
    </div>
  );
}

