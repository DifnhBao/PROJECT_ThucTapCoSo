const { UserActivity } = require('../models');

// === BUFFER CONFIGURATION ===
const BATCH_SIZE = 100;
const FLUSH_INTERVAL = 3 * 60 * 1000; // 3 minutes
let activityBuffer = [];
let flushTimer = null;
let isFlushingInProgress = false;

/**
 * Flush buffer to database
 * Handles retry logic on failure
 */
async function flushBuffer() {
  // Prevent concurrent flush operations (race condition protection)
  if (isFlushingInProgress) {
    console.log('[Tracking] Flush already in progress, skipping');
    return;
  }

  if (activityBuffer.length === 0) {
    return;
  }

  isFlushingInProgress = true;
  
  // Create snapshot of current buffer
  // Important: Don't clear activityBuffer here in case insert fails
  const dataToInsert = [...activityBuffer];
  
  try {
    console.log(`[Tracking] Flushing ${dataToInsert.length} records...`);
    
    // Bulk insert to MySQL
    await UserActivity.bulkCreate(dataToInsert, {
      validate: true,
      // ignoreDuplicates: false (remove if handling duplicates differently)
    });

    // Only clear buffer AFTER successful insert
    activityBuffer = [];
    console.log(`[Tracking] Successfully inserted ${dataToInsert.length} records`);
    
  } catch (error) {
    // Keep data in buffer for retry - NOT clearing activityBuffer
    console.error('[Tracking] Bulk insert failed:', {
      error: error.message,
      bufferedRecords: activityBuffer.length,
      timestamp: new Date().toISOString(),
    });
    // Buffer retained for next cycle
    
  } finally {
    isFlushingInProgress = false;
  }
}

/**
 * Schedule automatic flush every FLUSH_INTERVAL
 */
function scheduleFlush() {
  // Cancel previous timer if exists
  if (flushTimer) {
    clearInterval(flushTimer);
  }

  flushTimer = setInterval(async () => {
    await flushBuffer();
  }, FLUSH_INTERVAL);
}

/**
 * Initialize tracking system - call in app startup
 */
function initializeTracking() {
  scheduleFlush();
  console.log('[Tracking] Initialized with batch size:', BATCH_SIZE, 'flush interval:', FLUSH_INTERVAL / 1000, 's');
}

/**
 * POST /api/tracking
 * Receive tracking event and push to buffer
 * Returns immediately without waiting for DB insert
 */
async function createActivity(req, res) {
  try {
    const {
      user_id,
      song_id,
      session_id,
      source,
      exit_reason,
      max_position_reached,
      play_pause_count,
      seek_count,
      song_duration,
      total_listened_time,
    } = req.body;

    // === VALIDATION ===
    if (!user_id || !song_id || !session_id) {
      return res.status(400).json({
        error: 'Missing required fields: user_id, song_id, session_id',
      });
    }

    // === PUSH TO BUFFER ===
    const activityRecord = {
      user_id,
      song_id,
      session_id,
      source: source || 'web',
      exit_reason: exit_reason || null,
      max_position_reached: max_position_reached || 0,
      play_pause_count: play_pause_count || 0,
      seek_count: seek_count || 0,
      song_duration,
      total_listened_time,
      created_at: new Date(),
    };

    activityBuffer.push(activityRecord);

    // === RETURN 200 IMMEDIATELY ===
    res.status(200).json({
      status: 'buffered',
      bufferSize: activityBuffer.length,
    });

    // === CHECK IF FLUSH NEEDED ===
    // No await here - returns to client immediately
    if (activityBuffer.length >= BATCH_SIZE) {
      // Fire and forget: flush in background
      flushBuffer().catch((err) => {
        console.error('[Tracking] Background flush error:', err.message);
      });
    }

  } catch (error) {
    console.error('[Tracking] Error in createActivity:', error.message);
    // Still return 200 to client - validation happened above
    res.status(500).json({ error: error.message });
  }
}

/**
 * GET /api/tracking/status
 * Debug endpoint - check buffer status
 */
function getStatus(req, res) {
  res.json({
    bufferSize: activityBuffer.length,
    isFlushingInProgress,
    nextFlushIn: flushTimer ? 'scheduled' : 'not scheduled',
    bufferCapacityPercent: Math.round((activityBuffer.length / BATCH_SIZE) * 100),
  });
}

/**
 * POST /api/tracking/flush-now
 * Admin endpoint - force flush immediately
 */
async function forceFlush(req, res) {
  try {
    await flushBuffer();
    res.json({
      status: 'flushed',
      bufferSize: activityBuffer.length,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

/**
 * Graceful shutdown - flush remaining buffer
 */
async function gracefulShutdown() {
  console.log('[Tracking] Graceful shutdown initiated...');
  if (flushTimer) {
    clearInterval(flushTimer);
  }
  await flushBuffer();
  console.log('[Tracking] Shutdown complete');
}

module.exports = {
  createActivity,
  getStatus,
  forceFlush,
  initializeTracking,
  gracefulShutdown,
};
