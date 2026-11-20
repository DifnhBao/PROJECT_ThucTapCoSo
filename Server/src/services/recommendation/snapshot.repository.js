const { QueryTypes } = require('sequelize');
const { sequelize } = require('../../models');

async function readNeighbors(seedIds) {
  if (!seedIds.length) return [];
  // One statement resolves active version AND rows: publication cannot mix versions.
  // Both source and candidate policy are applied before ranking/explanations.
  return sequelize.query(`SELECT n.*, s.title AS seed_title, r.algorithm_version
    FROM recommendation_state st
    STRAIGHT_JOIN recommendation_runs r ON r.run_id=st.active_run_id
    STRAIGHT_JOIN recommendation_neighbors n FORCE INDEX (ix_neighbor_rank)
      ON n.run_id=r.run_id AND n.seed_id IN (:ids)
    STRAIGHT_JOIN songs s ON s.song_id=n.seed_id AND s.status='approved' AND s.is_visible=1
    STRAIGHT_JOIN songs c ON c.song_id=n.song_id AND c.status='approved' AND c.is_visible=1
    WHERE st.id=1
    ORDER BY n.seed_id, n.final_score DESC, n.song_id ASC`, {
    replacements: { ids: seedIds }, type: QueryTypes.SELECT,
  });
}
module.exports = { readNeighbors };
