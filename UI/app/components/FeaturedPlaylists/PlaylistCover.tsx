"use client";

interface PlaylistCoverProps {
  images: string[];
  size?: number | string;
}

export default function PlaylistCover({
  images,
  size = 180,
}: PlaylistCoverProps) {
  const covers = images.slice(0, 4);

  if (covers.length === 0) {
    return (
      <img
        src="/images/default-song.jpg"
        alt="Default Playlist Cover"
        style={{
          width: size,
          height: size,
          objectFit: "cover",
        }}
      />
    );
  }

  if (covers.length === 1) {
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

  if (covers.length === 2) {
    return (
      <div
        style={{
          width: size,
          height: size,
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          overflow: "hidden",
        }}
      >
        <img src={covers[0]} alt="Cover 1" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
        <img src={covers[1]} alt="Cover 2" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
      </div>
    );
  }

  if (covers.length === 3) {
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
        <img src={covers[0]} alt="Cover 1" style={{ width: "100%", height: "100%", objectFit: "cover", gridRow: "1 / span 2" }} />
        <img src={covers[1]} alt="Cover 2" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
        <img src={covers[2]} alt="Cover 3" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
      </div>
    );
  }

  // 4 or more covers
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
