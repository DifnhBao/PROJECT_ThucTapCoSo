"use client";

import React, { useState, useEffect, useRef } from "react";
import styles from "./search.module.css";
import { FaSearch, FaTimes } from "react-icons/fa";
import { searchSongs } from "@/app/features/song/song.api";
import { Track } from "@/app/types/music";

interface SearchBarProps {
  setResults: (results: Track[]) => void;
  setSearchTerm: (searchTerm: string) => void;
  setIsSearchFocused: (focused: boolean) => void;
}

const SearchBar = ({
  setResults,
  setSearchTerm,
  setIsSearchFocused,
}: SearchBarProps) => {
  const [input, setInput] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handler = setTimeout(async () => {
      const value = input.trim();

      if (!value) {
        setResults([]);
        return;
      }

      try {
        const tracks = await searchSongs(value, 10);

        setResults(tracks || []);
      } catch (err) {
        console.error("Search error:", err);
        const errorMessage =
          err instanceof Error ? err.message : "Lỗi tìm kiếm";
        setResults([]);
      }
    }, 300);

    return () => clearTimeout(handler);
  }, [input]);

  const handleChange = (value: string) => {
    setInput(value);
    setSearchTerm(value);
  };

  const clearInput = () => {
    setInput("");
    setSearchTerm("");
    setResults([]);
    inputRef.current?.focus();
  };

  return (
    <div className={styles.inputWrapper}>
      <FaSearch
        className={`${styles.icon} ${styles.searchIcon}`}
        onClick={() => inputRef.current?.focus()}
      />

      <div className={styles.inputContainer}>
        <input
          className={styles.input}
          ref={inputRef}
          placeholder="Bạn muốn phát nội dung gì?"
          value={input}
          onChange={(e) => handleChange(e.target.value)}
          onFocus={() => setIsSearchFocused(true)}
        />

        {input && (
          <FaTimes
            className={`${styles.icon} ${styles.clearIcon}`}
            onClick={clearInput}
            onMouseDown={(e) => e.preventDefault()}
          />
        )}
      </div>
    </div>
  );
};

export default SearchBar;
