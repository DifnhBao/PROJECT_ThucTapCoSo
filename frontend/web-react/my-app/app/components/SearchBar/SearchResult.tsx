"use client";

import React from "react";
import { useState } from "react";
import "./SearchResult.css";
import { Track } from "@/app/types/music";
import { usePlayer } from "@/app/context/PlayerContext";

interface SearchResultProps {
  result: Track;
  searchTerm: string;
}

const SearchResult = ({ result, searchTerm }: SearchResultProps) => {
  const { setPlaylist } = usePlayer();
  const [showResults, setShowResults] = useState(false);

  const highlight = (text: string, term: string) => {
    if (!term) return text;

    const regex = new RegExp(`(${term})`, "gi");
    const parts = text.split(regex);

    return parts.map((part, i) =>
      regex.test(part) ? (
        <span key={i} className="highlight">
          {part}
        </span>
      ) : (
        part
      )
    );
  };
  return (
    <div className="search-result" onClick={() => setPlaylist([result], 0)}>
      {highlight(result.title, searchTerm)}
    </div>
  );
};

export default SearchResult;
