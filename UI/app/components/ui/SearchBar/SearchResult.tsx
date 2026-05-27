"use client";

import React from "react";
import { useState } from "react";
import styles from "./search.module.css";
import { Track } from "@/app/types/music";
import { usePlayer } from "@/app/features/player/context/PlayerContext";

interface SearchResultProps {
  result: Track;
  searchTerm: string;
}

const SearchResult = ({ result, searchTerm }: SearchResultProps) => {
  const { setPlaylist } = usePlayer();

  const highlight = (text: string, term: string) => {
    if (!term) return text;

    const parts = text.split(new RegExp(`(${term})`, "gi"));

    return parts.map((part, i) => {
      const isMatch = part.toLowerCase() === term.toLowerCase();

      return isMatch ? (
        <span key={i} className={styles.highlight}>
          {part}
        </span>
      ) : (
        <React.Fragment key={i}>{part}</React.Fragment>
      );
    });
  };
  return (
    <div
      className={styles.resultItem}
      onMouseDown={() => {
        setPlaylist([{ ...result }], 0, "search");
      }}
    >
      <img
        src={result.imageUrl || "/images/default-song.jpg"}
        className={styles.resultImg}
      />

      <div className={styles.resultInfo}>
        <div className={styles.resultTitle}>
          {highlight(result.title, searchTerm)}
        </div>
        <div className={styles.resultArtist}>{result.artistName}</div>
      </div>
    </div>
  );
};

export default SearchResult;
