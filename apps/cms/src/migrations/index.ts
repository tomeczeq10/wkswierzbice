import * as migration_20260427_190451_init from './20260427_190451_init';
import * as migration_20260428_041852 from './20260428_041852';
import * as migration_20260428_194800_news_cover_badges from './20260428_194800_news_cover_badges';
import * as migration_20260428_231000_matches from './20260428_231000_matches';
import * as migration_20260428_231400_live_match_v1 from './20260428_231400_live_match_v1';
import * as migration_20260428_231450_live_match_created_at from './20260428_231450_live_match_created_at';
import * as migration_20260428_231500_live_match_v2 from './20260428_231500_live_match_v2';
import * as migration_20260429_202200_live_match_kind_custom_label from './20260429_202200_live_match_kind_custom_label';
import * as migration_20260429_203900_matches_lineup from './20260429_203900_matches_lineup';
import * as migration_20260429_204400_live_match_event_text_assists from './20260429_204400_live_match_event_text_assists';
import * as migration_20260429_205300_live_match_kickoff_planned from './20260429_205300_live_match_kickoff_planned';

export const migrations = [
  {
    up: migration_20260427_190451_init.up,
    down: migration_20260427_190451_init.down,
    name: '20260427_190451_init',
  },
  {
    up: migration_20260428_041852.up,
    down: migration_20260428_041852.down,
    name: '20260428_041852'
  },
  {
    up: migration_20260428_194800_news_cover_badges.up,
    down: migration_20260428_194800_news_cover_badges.down,
    name: '20260428_194800_news_cover_badges',
  },
  {
    up: migration_20260428_231000_matches.up,
    down: migration_20260428_231000_matches.down,
    name: '20260428_231000_matches',
  },
  {
    up: migration_20260428_231400_live_match_v1.up,
    down: migration_20260428_231400_live_match_v1.down,
    name: '20260428_231400_live_match_v1',
  },
  {
    up: migration_20260428_231450_live_match_created_at.up,
    down: migration_20260428_231450_live_match_created_at.down,
    name: '20260428_231450_live_match_created_at',
  },
  {
    up: migration_20260428_231500_live_match_v2.up,
    down: migration_20260428_231500_live_match_v2.down,
    name: '20260428_231500_live_match_v2',
  },
  {
    up: migration_20260429_202200_live_match_kind_custom_label.up,
    down: migration_20260429_202200_live_match_kind_custom_label.down,
    name: '20260429_202200_live_match_kind_custom_label',
  },
  {
    up: migration_20260429_203900_matches_lineup.up,
    down: migration_20260429_203900_matches_lineup.down,
    name: '20260429_203900_matches_lineup',
  },
  {
    up: migration_20260429_204400_live_match_event_text_assists.up,
    down: migration_20260429_204400_live_match_event_text_assists.down,
    name: '20260429_204400_live_match_event_text_assists',
  },
  {
    up: migration_20260429_205300_live_match_kickoff_planned.up,
    down: migration_20260429_205300_live_match_kickoff_planned.down,
    name: '20260429_205300_live_match_kickoff_planned',
  },
];
