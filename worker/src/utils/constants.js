export const QUEUE_NAME = "event_queue";

// Detection window (1 minute)
export const ABUSE_WINDOW_MS = 60 * 1000;

// Max requests per IP within window
export const ABUSE_THRESHOLD = 100;

// Block duration (5 minutes)
export const BLOCK_DURATION_SECONDS = 300;

// Redis key prefixes
export const IP_ACTIVITY_PREFIX = "ip_activity:";
export const BLOCK_PREFIX = "blocked:";
