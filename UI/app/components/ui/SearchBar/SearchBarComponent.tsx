"use client";

import { useState, useEffect, useRef } from "react";
import styles from "./search.module.css";
import SearchBar from "./SearchBar";
import SearchResultsList from "./SearchResultsList";
import { Track } from "@/app/types/music";

export default function SearchBarComponent() {
  const [results, setResults] = useState<Track[]>([]);
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [isSearchFocused, setIsSearchFocused] = useState<boolean>(false);

  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        wrapperRef.current &&
        !wrapperRef.current.contains(e.target as Node)
      ) {
        setIsSearchFocused(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div ref={wrapperRef} className={styles.container}>
      <SearchBar
        setResults={setResults}
        setSearchTerm={setSearchTerm}
        setIsSearchFocused={setIsSearchFocused}
      />

      <SearchResultsList
        results={results}
        searchTerm={searchTerm}
        isSearchFocused={isSearchFocused}
      />
    </div>
  );
}
