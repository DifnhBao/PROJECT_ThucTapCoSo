"use client";
import "@/app/styles/library.css";
import LibraryTable from "@/app/components/MusicContainer/LibraryTable";

export default function LibraryPage() {
  return (
    <div id="library_menu">
      <h2>Your Library</h2>
      <div className="table">
        <div className="table_header">
          <div className="col_index">#</div>
          <div className="col_title">Title</div>
          <div className="col_artist">Artist</div>
          <div className="col_duration">Duration</div>
        </div>

        <LibraryTable />
      </div>
    </div>
  );
}
