"use client";
import "@/app/(Pages)/(main)/Library/library.css";
import { useModal } from "@/app/context/ModalContext";
import LibraryTable from "@/app/features/song/components/LibraryTable/LibraryTable";
import SongSubmissions from "@/app/features/song/components/SongSubmissions";
import { fetchMySubmissions, submissionsKey } from "@/app/features/song/song.api";
import { useAuthState } from "@/app/lib/use-auth-state";
import useSWR from "swr";
import RecentHistory from "@/app/features/song/components/RecentHistory";

export default function LibraryPage() {
  const { principal, epoch } = useAuthState("user");
  const { openModal } = useModal();
  const { data, error, mutate } = useSWR(
    principal ? submissionsKey(principal.userId, epoch) : null,
    fetchMySubmissions,
  );

  return (
    <div id="library_menu">
      <h2 className="main-title">Thư viện của bạn</h2>
      {principal && <RecentHistory key={`${principal.userId}:${epoch}`} userId={principal.userId} epoch={epoch} />}
      <div className="table">
        <div className="table_header">
          <div className="col_index">#</div>
          <div className="col_title">Title</div>
          <div className="col_artist">Artist</div>
          <div className="col_duration">Duration</div>
        </div>

        <LibraryTable />
      </div>
      {principal && (
        <SongSubmissions
          submissions={data}
          hasError={!!error}
          onRetry={() => void mutate()}
          onUpload={() => openModal("upload-song")}
        />
      )}
    </div>
  );
}
