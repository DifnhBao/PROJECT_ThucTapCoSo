"use client";

interface PlaylistCoverProps {
  images: string[];
  size?: number;
}

export default function PlaylistCover({
  images,
  size = 180,
}: PlaylistCoverProps) {
  const covers = images.slice(0, 4);

  if (covers.length === 0) {
    return (
      <div
        style={{
          width: size,
          height: size,
          backgroundColor: "#2a2a2a",
        }}
      />
    );
  }

  if (covers.length < 4) {
    return (
      <img
        src={covers[0]}
        alt="Playlist cover"
        style={{
          width: size,
          height: size,
          objectFit: "cover",
        }}
      />
    );
  }

  return (
    <div
      style={{
        width: size,
        height: size,
        display: "grid",
        gridTemplateColumns: "1fr 1fr",
        gridTemplateRows: "1fr 1fr",
        overflow: "hidden",
      }}
    >
      {covers.map((img, index) => (
        <img
          key={index}
          src={img}
          alt={`Cover ${index + 1}`}
          style={{
            width: "100%",
            height: "100%",
            objectFit: "cover",
          }}
        />
      ))}
    </div>
  );
}
