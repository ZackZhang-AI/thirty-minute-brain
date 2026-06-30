import { IconShieldCheck, IconX } from "@tabler/icons-react";

interface PrivacyNoticeModalProps {
  onAccept: () => void;
  onClose?: () => void;
}

export function PrivacyNoticeModal({ onAccept, onClose }: PrivacyNoticeModalProps) {
  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true" aria-label="Privacy notice">
      <div className="modal-panel max-w-2xl">
        <div className="mb-4 flex items-start justify-between gap-4">
          <div className="flex gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-emerald-400/30 bg-emerald-400/10 text-emerald-300">
              <IconShieldCheck size={22} stroke={1.8} />
            </div>
            <div>
              <h2 className="text-lg font-semibold">隐私边界说明</h2>
              <p className="mt-1 text-sm leading-6 text-zinc-400">Thirty-Minute Brain 默认只在本机保存最近工作线索。</p>
            </div>
          </div>
          {onClose ? (
            <button className="icon-button" type="button" onClick={onClose} title="Close">
              <IconX size={18} stroke={1.8} />
            </button>
          ) : null}
        </div>

        <div className="space-y-3 text-sm leading-6 text-zinc-300">
          <p>当前版本会监听剪贴板文本、用户选择的截图文件夹，以及你手动添加的文本、链接和文件路径。</p>
          <p>它不会自动读取浏览器历史、终端历史、聊天软件内容，也不会上传数据到云端。</p>
          <p>疑似密码、token、API key、信用卡号等敏感内容会在写入前被跳过，只保留“敏感内容已跳过”的提示。</p>
          <p>默认事件 24 小时后过期；被你主动置顶的事件不会自动清理。</p>
        </div>

        <div className="mt-5 flex justify-end">
          <button className="primary-button" type="button" onClick={onAccept}>
            我知道了
          </button>
        </div>
      </div>
    </div>
  );
}
