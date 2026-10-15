// Light entry: feed lines and formatting. The full Chog list lives in '@chog/content/chogs'
// so apps can load it separately.
export { LINES } from './lines';
export type { LineKey } from './lines';
export { createFeedFormatter, formatTimeline, ordinal } from './feed-format';
export type { FeedKind, FeedLine } from './feed-format';
export { hitTime } from './timing';
