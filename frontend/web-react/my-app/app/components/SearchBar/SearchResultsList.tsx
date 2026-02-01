"use client";

import React from "react";
import "./SearchResultsList.css";
import SearchResult from "./SearchResult";
import { Track } from "@/app/types/music";

interface SearchResultsListProps {
  results: Track[];
  searchTerm: string;
}

const SearchResultsList = ({ results, searchTerm }: SearchResultsListProps) => {
  return (
    <div className="results-list">
      {results.map((track) => (
        <SearchResult
          key={track.trackId}
          result={track}
          searchTerm={searchTerm}
        />
      ))}
    </div>
  );
};

export default SearchResultsList;
