"use client";

import React from "react";
import styles from "./search.module.css";
import SearchResult from "./SearchResult";
import { Track } from "@/app/types/music";

interface SearchResultsListProps {
  results: Track[];
  searchTerm: string;
  isSearchFocused: boolean;
}

const SearchResultsList = ({
  results,
  searchTerm,
  isSearchFocused,
}: SearchResultsListProps) => {
  if (!searchTerm || !isSearchFocused) {
    return null;
  }

  return (
    <div className={styles.resultsList}>
      {results.length === 0 ? (
        <div className={styles.noResults}>Không tìm thấy bài hát phù hợp</div>
      ) : (
        results.map((track) => (
          <SearchResult
            key={track.trackId || `${track.title}-${track.audioUrl}`}
            result={track}
            searchTerm={searchTerm}
          />
        ))
      )}
    </div>
  );
};

export default SearchResultsList;
