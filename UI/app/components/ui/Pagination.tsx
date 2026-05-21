"use client";

import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import styles from "@/app/styles/Pagination.module.css";

type Props = {
  currentPage: number;
  totalPages: number;
};

export default function Pagination({ currentPage, totalPages }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [currentPage]);

  const goToPage = (page: number) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("page", page.toString());
    router.push(`?${params.toString()}`);
  };

  const renderPages = () => {
    const pages = [];
    const start = Math.max(1, currentPage - 2);
    const end = Math.min(totalPages, currentPage + 2);

    for (let i = start; i <= end; i++) pages.push(i);
    return pages;
  };

  return (
    <div className={styles.pagination}>
      <button
        className={`${styles.button} ${
          currentPage === 1 ? styles.disabled : ""
        }`}
        disabled={currentPage === 1}
        onClick={() => goToPage(currentPage - 1)}
      >
        &lt;
      </button>

      {renderPages().map((page) => (
        <button
          key={page}
          className={`${styles.button} ${
            page === currentPage ? styles.active : ""
          }`}
          onClick={() => goToPage(page)}
        >
          {page}
        </button>
      ))}

      <button
        className={`${styles.button} ${
          currentPage === totalPages ? styles.disabled : ""
        }`}
        disabled={currentPage === totalPages}
        onClick={() => goToPage(currentPage + 1)}
      >
        &gt;
      </button>
    </div>
  );
}
