// Changing scoring semantics requires a new algorithm version and rebuild.
module.exports = Object.freeze({
  version: 'node-hybrid-v1', topK: 50, maxCatalog: 500, maxSignals: 20000,
  maxLyrics: 10000, maxSeeds: 20, maxUserSignals: 200,
  favoriteWeight: 5, highRatingWeight: 2, listenWeight: 1,
  repeatCap: 3, lowRating: 2, highRating: 4,
  metadataWeight: 0.6, behavioralWeight: 0.4,
  metadata: Object.freeze({ genre: 0.25, mood: 0.2, artist: 0.15, keyword: 0.1, lyrics: 0.25, duration: 0.05 }),
  behavioralShrinkage: 5,
});
