const maxReasonLength = 500;

export default function ModerationConfirmation({
  action,
  reason,
  busy,
  onReasonChange,
  onCancel,
  onConfirm,
  className,
  cancelClassName,
  confirmClassName,
}: {
  action: "approve" | "reject";
  reason: string;
  busy: boolean;
  onReasonChange: (reason: string) => void;
  onCancel: () => void;
  onConfirm: (reason?: string) => void;
  className?: string;
  cancelClassName?: string;
  confirmClassName?: string;
}) {
  const rejecting = action === "reject";
  const overLimit = rejecting && reason.length > maxReasonLength;

  return (
    <form onSubmit={(event) => {
      event.preventDefault();
      if (!busy && !overLimit) onConfirm(rejecting ? reason.trim() || undefined : undefined);
    }}>
      <h3>{rejecting ? "Từ chối bài hát này?" : "Duyệt bài hát này?"}</h3>
      {rejecting && (
        <p>
          <label htmlFor="song-rejection-reason">Lý do từ chối (không bắt buộc)</label>
          <textarea
            id="song-rejection-reason"
            rows={3}
            maxLength={maxReasonLength}
            value={reason}
            disabled={busy}
            aria-describedby="song-rejection-limit"
            onChange={(event) => onReasonChange(event.target.value)}
          />
          <small id="song-rejection-limit">Tối đa {maxReasonLength} ký tự.</small>
        </p>
      )}
      <div className={className}>
        <button type="button" className={cancelClassName} disabled={busy} onClick={onCancel}>Hủy</button>
        <button type="submit" className={confirmClassName} disabled={busy || overLimit}>
          {busy ? "Đang xử lý…" : "Xác nhận"}
        </button>
      </div>
    </form>
  );
}
