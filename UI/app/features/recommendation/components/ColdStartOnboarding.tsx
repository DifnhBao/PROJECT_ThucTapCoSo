"use client";

import { useId, useState } from "react";
import useSWR from "swr";
import { addFavoriteBatch } from "@/app/features/like/favorite.api";
import { fetchDailySongs } from "@/app/features/song/song.api";
import { assertAuth } from "@/app/lib/auth-state";

const MIN_SELECTION = 3;
const MAX_SELECTION = 10;
const PAGE_SIZE = 12;

interface Props {
  epoch: number;
  onDismiss: () => void;
  onSaved: (songIds: number[]) => Promise<void>;
}

export default function ColdStartOnboarding({ epoch, onDismiss, onSaved }: Props) {
  const titleId = useId();
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<number[]>([]);
  const [submission, setSubmission] = useState<"idle" | "saving" | "error" | "unavailable" | "saved">("idle");
  const { data, error, isValidating, mutate } = useSWR(
    ["recommendation-starter-songs", page],
    ([, pageNumber]) => fetchDailySongs(PAGE_SIZE, pageNumber),
    { shouldRetryOnError: false, revalidateOnFocus: false },
  );

  const toggle = (id: number) => setSelected((ids) =>
    ids.includes(id) ? ids.filter((songId) => songId !== id)
      : ids.length < MAX_SELECTION ? [...ids, id] : ids,
  );

  const save = async () => {
    if (selected.length < MIN_SELECTION || submission === "saving" || submission === "saved") return;
    setSubmission("saving");
    let receipt;
    try {
      assertAuth("user", epoch);
      receipt = await addFavoriteBatch(selected);
    } catch (error) {
      const unavailable = (error as { response?: { data?: { code?: string } } })?.response?.data?.code === "STARTER_SONG_UNAVAILABLE";
      setSubmission(unavailable ? "unavailable" : "error");
      return;
    }
    setSubmission("saved");
    await onSaved(receipt.songIds);
  };

  let content;
  if (submission === "saving" || submission === "saved") {
    content = <p role="status">{submission === "saving" ? "Đang lưu bài hát yêu thích…" : "Đã lưu. Đang cập nhật gợi ý…"}</p>;
  } else if (submission === "unavailable") {
    content = <div className="rec-onboarding-actions">
      <p role="alert">Có bài hát không còn công khai. Vui lòng chọn lại.</p>
      <button type="button" onClick={() => {
        setSelected([]);
        setSubmission("idle");
        void mutate();
      }}>Chọn lại bài hát</button>
    </div>;
  } else if (submission === "error") {
    content = <div className="rec-onboarding-actions">
      <p role="alert">Không thể lưu bài hát yêu thích. Vui lòng thử lại.</p>
      <button type="button" onClick={save}>Thử lưu lại</button>
      <button type="button" onClick={() => setSubmission("idle")}>Quay lại chọn bài</button>
    </div>;
  } else if (error && !isValidating) {
    content = <div className="rec-onboarding-actions">
      <p role="alert">Không thể tải danh sách bài hát.</p>
      <button type="button" onClick={() => void mutate()}>Thử tải lại</button>
    </div>;
  } else if (!data || error) {
    content = <p role="status">Đang tải bài hát…</p>;
  } else if (!data.songs.length && page === 1) {
    content = <p>Chưa có bài hát để chọn.</p>;
  } else {
    const totalPages = Math.max(1, Math.ceil(data.total / PAGE_SIZE));
    content = <>
      <ul className="rec-onboarding-tracks" aria-label="Bài hát để chọn">
        {data.songs.map((song) => {
          const checked = selected.includes(song.trackId);
          return <li key={song.trackId}>
            <label>
              <input type="checkbox" checked={checked} onChange={() => toggle(song.trackId)}
                disabled={!checked && selected.length >= MAX_SELECTION} />
              <span><strong>{song.title}</strong><small>{song.artistName}</small></span>
            </label>
          </li>;
        })}
      </ul>
      <div className="rec-onboarding-actions">
        {totalPages > 1 || page > 1 ? <div className="rec-onboarding-actions" aria-label="Trang bài hát">
          <button type="button" disabled={page === 1} onClick={() => setPage(page - 1)}>Trang trước</button>
          <span>Trang {page}/{totalPages}</span>
          <button type="button" disabled={page >= totalPages} onClick={() => setPage(page + 1)}>Trang sau</button>
        </div> : null}
        <span role="status">Đã chọn {selected.length}/{MAX_SELECTION} bài</span>
        <button className="rec-refresh-btn" type="button" disabled={selected.length < MIN_SELECTION} onClick={save}>
          Lưu và cập nhật gợi ý
        </button>
      </div>
    </>;
  }

  return <section className="rec-onboarding" aria-labelledby={titleId}>
    <div className="rec-onboarding-header">
      <div>
        <h3 id={titleId}>Bắt đầu với gu nhạc của bạn</h3>
        <p>Chọn ít nhất {MIN_SELECTION} bài bạn thích để nhận gợi ý phù hợp hơn.</p>
      </div>
      {submission !== "saving" && submission !== "saved" &&
        <button type="button" onClick={onDismiss}>Bỏ qua lúc này</button>}
    </div>
    {content}
  </section>;
}
