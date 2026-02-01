"use client";

import React, { useState, useEffect, useRef } from "react";
import { FaSearch } from "react-icons/fa";
import { searchSongs } from "@/app/utils/songApi";
import "./SearchBar.css";
import { Track } from "@/app/types/music";

interface SearchBarProps {
  setResults: (results: Track[]) => void;
  setSearchTerm: (searchTerm: string) => void;
}

const SearchBar = ({ setResults, setSearchTerm }: SearchBarProps) => {
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
        setResults(tracks);
      } catch (err) {
        console.error("Search error:", err);
      }
    }, 300);

    return () => clearTimeout(handler);
  }, [input, setResults]);

  const handleChange = (value: string) => {
    setInput(value);
    setSearchTerm(value);
  };

  return (
    <div className="input-wrapper">
      <FaSearch id="search-icon" onClick={() => inputRef.current?.focus()} />
      <input
        ref={inputRef}
        placeholder="Bạn muốn phát nội dung gì?"
        value={input}
        onChange={(e) => handleChange(e.target.value)}
      />
    </div>
  );
};

export default SearchBar;
