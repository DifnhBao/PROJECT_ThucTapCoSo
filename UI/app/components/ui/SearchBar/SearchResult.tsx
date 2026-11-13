"use client";
import { usePlayerControls } from "@/app/features/player/context/PlayerContext";
import { Track } from "@/app/types/music";
import React from "react";
import styles from "./search.module.css";

interface SearchResultProps {
  result: Track;
  searchTerm: string;
}

const SearchResult = ({ result, searchTerm }: SearchResultProps) => {
  const { setPlaylist } = usePlayerControls();

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
      <img alt=""
        src={result.imageUrl || "/images/default-song.svg"}
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
