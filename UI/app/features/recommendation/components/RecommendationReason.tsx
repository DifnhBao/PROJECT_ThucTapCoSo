"use client";

import React from "react";
import type { RecommendationSong } from "../recommendation.types";

interface Props {
  song: RecommendationSong;
}

/**
 * Hiển thị lý do / điểm số của recommendation.
 * - Nếu có reason → hiển thị reason.
 * - Nếu có scores → hiển thị điểm breakdown.
 */
const RecommendationReason: React.FC<Props> = ({ song }) => {
  const hasScores =
    song.finalScore !== undefined ||
    song.metadataScore !== undefined ||
    song.behavioralScore !== undefined;

  if (!song.reason && !hasScores) return null;

  return (
    <div className="rec-reason">
      {song.reason && <span className="rec-reason-text">{song.reason}</span>}
      {hasScores && (
        <span className="rec-reason-scores">
          {song.metadataScore !== undefined && (
            <span>Meta: {song.metadataScore.toFixed(2)}</span>
          )}
          {song.behavioralScore !== undefined && (
            <span>Behavior: {song.behavioralScore.toFixed(2)}</span>
          )}
          {song.finalScore !== undefined && (
            <span className="rec-final-score">
              Final: {song.finalScore.toFixed(2)}
            </span>
          )}
        </span>
      )}
    </div>
  );
};

export default RecommendationReason;
