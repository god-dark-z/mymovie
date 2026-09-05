/**
 * Nxsha server configuration layer.
 *
 * The node names below are the ones Nxsha publishes on its embed documentation
 * page (https://nxsha.space/embed). That page states plainly that it only lists
 * a subset and that more nodes exist inside the player, so this file is a
 * *configuration* layer, never an assumption that a given node is permanent:
 *
 *  - "Auto" sends no `server` parameter at all, which is Nxsha's own documented
 *    multi-server mode with automatic fallback. It is the default.
 *  - Named entries send `?server=<node>`; if a node disappears upstream, Nxsha
 *    falls back on its side unless `one_server=true` is set, and the user can
 *    still pick a different entry here.
 */

export interface PlaybackServerConfig {
  id: string;
  provider: 'nxsha';
  label: string;
  /** Documented Nxsha node name. Omitted for the automatic multi-server mode. */
  nxshaServer?: string;
  /** True when the node name is marked `[Multi-Lang]` upstream. */
  multiLanguage: boolean;
  /** Short human note rendered under the label. */
  note?: string;
}

/**
 * Node names exactly as documented on the Nxsha embed page. Order preserved.
 */
export const NXSHA_DOCUMENTED_NODES = [
  'MbPly-[Multi-Lang]',
  'ZetPly-[Multi-Lang]',
  'OrVid-[Multi-Lang]',
  'QsPly-[Multi-Lang]',
  'Xuhd-[Multi-Lang]',
  'Ophm',
  'Multi-Kil-[Multi-Lang]',
  'Omen',
  'YFLIX',
  'Neon',
  'Cypher',
  'Breach',
  'Vyse',
  'Fade',
  'Raze',
  'River',
  'VidLnx',
  'RPM',
  'MU4',
  'Rive-Ophim',
  'Gbru',
  'HindiSk',
  'Prvibd',
  'AsiaLug',
  'WbStrmr',
  'Vnst-Ophim',
  'Vnst-Alfa',
  'Vnst-Beta',
  'Vnst-Lamda',
  'Vnst-Prime',
  'Vnst-Gama',
  'Vnst-Sigma',
  'Vnst-Hexa',
  'Vnst-Catflix',
] as const;

export const AUTO_SERVER_ID = 'auto';

function isMultiLanguage(node: string): boolean {
  return node.includes('[Multi-Lang]');
}

/** Strips the upstream `[Multi-Lang]` marker for display. */
function nodeDisplayName(node: string): string {
  return node.replace('-[Multi-Lang]', '').replace('[Multi-Lang]', '').trim();
}

export const PLAYBACK_SERVERS: PlaybackServerConfig[] = [
  {
    id: AUTO_SERVER_ID,
    provider: 'nxsha',
    label: 'Auto',
    multiLanguage: true,
    note: 'Nxsha picks a node and fails over on its own',
  },
  ...NXSHA_DOCUMENTED_NODES.map((node, index) => ({
    id: `server-${index + 1}`,
    provider: 'nxsha' as const,
    label: `Server ${index + 1}`,
    nxshaServer: node,
    multiLanguage: isMultiLanguage(node),
    note: nodeDisplayName(node),
  })),
];

export const DEFAULT_SERVER_ID = AUTO_SERVER_ID;

export function getServerConfig(id: string | undefined | null): PlaybackServerConfig {
  if (!id) return PLAYBACK_SERVERS[0]!;
  return PLAYBACK_SERVERS.find((server) => server.id === id) ?? PLAYBACK_SERVERS[0]!;
}

/** Next server in the list, used by timeout-based failover. */
export function nextServerAfter(id: string): PlaybackServerConfig | null {
  const index = PLAYBACK_SERVERS.findIndex((server) => server.id === id);
  if (index < 0) return PLAYBACK_SERVERS[1] ?? null;
  return PLAYBACK_SERVERS[index + 1] ?? null;
}
