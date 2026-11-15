// Immutable baseline definition. Future schema changes belong in new migrations.
module.exports = function schema(S) {
  const id = (type = S.INTEGER) => ({ type, primaryKey: true, autoIncrement: true, allowNull: false });
  const ref = (table, key, extra = {}) => ({ type: S.INTEGER, allowNull: false, references: { model: table, key }, onDelete: 'CASCADE', ...extra });
  const str = (length, extra = {}) => ({ type: S.STRING(length), ...extra });
  const timestamps = () => ({ created_at: { type: S.DATE, allowNull: false, defaultValue: S.literal('CURRENT_TIMESTAMP') }, updated_at: { type: S.DATE, allowNull: false, defaultValue: S.literal('CURRENT_TIMESTAMP') } });
  return {
    users: { user_id: id(), username: str(100, { allowNull: false }), email: str(100, { allowNull: false }), password: str(255, { allowNull: false }), first_name: str(100), last_name: str(100), birthday: S.DATEONLY, phone_number: str(20), address: str(255), gender: S.ENUM('male', 'female', 'other'), avatar_url: str(500), role: { type: S.ENUM('user', 'admin', 'super_admin'), allowNull: false, defaultValue: 'user' }, is_active: { type: S.BOOLEAN, allowNull: false, defaultValue: false }, activity_status: { type: S.ENUM('online', 'offline'), allowNull: false, defaultValue: 'offline' }, ...timestamps() },
    artists: { artist_id: id(), name: str(255, { allowNull: false }), image_url: str(500), normalized_name: str(255, { allowNull: false }) },
    genres: { genre_id: id(), name: str(100, { allowNull: false }), normalized_name: str(100, { allowNull: false }) },
    songs: { song_id: id(), title: str(255, { allowNull: false }), duration: { type: S.INTEGER, defaultValue: 0 }, audio_url: str(500, { allowNull: false }), image_url: str(500), view_count: { type: S.INTEGER, defaultValue: 0 }, is_visible: { type: S.BOOLEAN, allowNull: false, defaultValue: true }, status: { type: S.ENUM('pending', 'approved', 'rejected'), allowNull: false, defaultValue: 'approved' }, uploaded_by: ref('users', 'user_id', { allowNull: true, onDelete: 'SET NULL', onUpdate: 'CASCADE' }), lyrics: S.TEXT('long'), mood: S.JSON, keywords: S.JSON, vector_embedding: S.JSON, ...timestamps() },
    refresh_tokens: { token_id: id(), token: str(255, { allowNull: false }), expires_at: { type: S.DATE, allowNull: false }, user_id: ref('users', 'user_id'), ...timestamps() },
    playlists: { playlist_id: id(), user_id: ref('users', 'user_id'), name: str(255, { allowNull: false }), type: { type: S.ENUM('DAILY_MIX', 'NORMAL'), defaultValue: 'NORMAL' }, mix_date: S.DATEONLY, description: S.TEXT, cover_image_url: str(500), is_public: { type: S.BOOLEAN, allowNull: false, defaultValue: true }, ...timestamps() },
    song_artists: { song_id: ref('songs', 'song_id', { primaryKey: true }), artist_id: ref('artists', 'artist_id', { primaryKey: true }) },
    song_genres: { song_id: ref('songs', 'song_id', { primaryKey: true }), genre_id: ref('genres', 'genre_id', { primaryKey: true }) },
    favorites: { user_id: ref('users', 'user_id', { primaryKey: true }), song_id: ref('songs', 'song_id', { primaryKey: true }), ...timestamps() },
    ratings: { rating_id: id(), user_id: ref('users', 'user_id'), song_id: ref('songs', 'song_id'), score: { type: S.TINYINT, allowNull: false }, ...timestamps() },
    playlist_songs: { playlist_id: ref('playlists', 'playlist_id', { primaryKey: true }), song_id: ref('songs', 'song_id', { primaryKey: true }), position: { type: S.INTEGER, allowNull: false, defaultValue: 0 }, ...timestamps() },
    UserActivities: { id: id(S.BIGINT), user_id: ref('users', 'user_id'), song_id: ref('songs', 'song_id'), session_id: str(64, { allowNull: false }), source: str(50, { allowNull: false }), exit_reason: str(50), max_position_reached: { type: S.FLOAT, defaultValue: 0 }, play_pause_count: { type: S.SMALLINT, defaultValue: 0 }, seek_count: { type: S.SMALLINT, defaultValue: 0 }, song_duration: { type: S.FLOAT, allowNull: false }, total_listened_time: { type: S.FLOAT, allowNull: false }, created_at: { type: S.DATE, allowNull: false, defaultValue: S.literal('CURRENT_TIMESTAMP') } },
    song_similarities: { id: id(S.BIGINT), song_id_1: { type: S.INTEGER, allowNull: false }, song_id_2: { type: S.INTEGER, allowNull: false }, behavioral_score: { type: S.FLOAT, allowNull: false, defaultValue: 0 }, metadata_score: { type: S.FLOAT, allowNull: false, defaultValue: 0 }, final_score: { type: S.FLOAT, allowNull: false, defaultValue: 0 }, reason: S.TEXT, detail: S.JSON, updated_at: S.DATE },
  };
};

module.exports.indexes = {
  users: [[['username'], 'unique_users_username', true], [['email'], 'unique_users_email', true]],
  artists: [[['normalized_name'], 'unique_artists_normalized_name', true]],
  genres: [[['normalized_name'], 'unique_genres_normalized_name', true]],
  refresh_tokens: [[['token'], 'refresh_tokens_token', true], [['user_id'], 'refresh_tokens_user_id'], [['expires_at'], 'refresh_tokens_expires_at']],
  playlists: [[['user_id'], 'playlists_user_id']],
  song_genres: [[['genre_id'], 'song_genres_genre_id']],
  ratings: [[['user_id', 'song_id'], 'ratings_user_id_song_id', true], [['song_id'], 'ratings_song_id']],
  playlist_songs: [[['playlist_id', 'position'], 'unique_playlist_position', true]],
  UserActivities: [[['user_id', 'created_at'], 'idx_user_created'], [['song_id', 'created_at'], 'idx_song_created'], [['session_id'], 'idx_session_id'], [['created_at'], 'idx_created_at'], [['user_id', 'song_id', 'created_at'], 'idx_user_song_created']],
  song_similarities: [[['song_id_1', 'song_id_2'], 'uq_song_pair', true], [['song_id_1'], 'idx_song_id_1'], [['song_id_2'], 'idx_song_id_2'], [['final_score'], 'idx_final_score']],
};
