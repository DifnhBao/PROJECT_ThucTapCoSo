import { useCallback,useState } from "react";
import { getMyRating,getSongRatingSummary,rateSong } from "./rating.api";

export const useRating = () => {
  const [loading, setLoading] = useState(false);
  const [userRating, setUserRating] = useState<number | null>(null);
  const [summary, setSummary] = useState({
    averageRating: 0,
    totalRatings: 0,
  });

  const fetchRatingData = useCallback(async (songId: number) => {
    try {
      const [summaryData, userData] = await Promise.all([
        getSongRatingSummary(songId),
        getMyRating(songId),
      ]);

      setSummary(summaryData);
      setUserRating(userData.rating);
    } catch (error) {
      console.error("fetchRatingData error:", error);
    }
  }, []);

  const submitRating = async (songId: number, score: number) => {
    setLoading(true);

    try {
      await rateSong(songId, score);

      setUserRating(score);

      const updatedSummary = await getSongRatingSummary(songId);
      setSummary(updatedSummary);
    } finally {
      setLoading(false);
    }
  };
  return {
    submitRating,
    fetchRatingData,
    userRating,
    summary,
    loading,
  };
};
