'use client';

import { OptionList, OptionRow, ToggleRow } from '@/components/player/SheetControls';
import { Badge } from '@/components/ui/Badge';
import { InlineNotice } from '@/components/ui/ErrorState';
import { ExternalIcon } from '@/components/ui/Icons';
import { Sheet } from '@/components/ui/Sheet';
import { NXSHA_DOCS_URL } from '@/lib/nxsha/provider';
import { AUTO_SERVER_ID, PLAYBACK_SERVERS } from '@/lib/nxsha/servers';

/**
 * Server selection.
 *
 * The list is a *configuration* of the nodes Nxsha documents, not a promise that
 * each one exists forever — the documentation itself says more nodes live inside
 * the player. So a node that stops working is a normal event here: it gets marked
 * as unresponsive and the viewer picks another one.
 */
export function ServerSheet({
  open,
  onClose,
  activeId,
  lockServer,
  autoFailover,
  unresponsive,
  onPick,
  onLockChange,
  onAutoFailoverChange,
}: {
  open: boolean;
  onClose: () => void;
  activeId: string;
  lockServer: boolean;
  autoFailover: boolean;
  /** Server ids that failed to load during this session. */
  unresponsive: string[];
  onPick: (id: string) => void;
  onLockChange: (value: boolean) => void;
  onAutoFailoverChange: (value: boolean) => void;
}) {
  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="Playback server"
      description="Auto lets Nxsha choose a node and fall back on its own. Pick a specific server if a title will not start."
      size="lg"
    >
      <div className="flex flex-col gap-2 pb-2">
        <ToggleRow
          checked={autoFailover}
          onChange={onAutoFailoverChange}
          title="Switch automatically when a server does not respond"
          description="Cineora waits for the embed to load; if nothing arrives, it tries the next server in this list and tells you which one it moved to."
        />
        {activeId !== AUTO_SERVER_ID ? (
          <ToggleRow
            checked={lockServer}
            onChange={onLockChange}
            title="Play only this server"
            description="Sends the documented one_server parameter, so Nxsha stops falling back to other nodes. Useful for testing one source, worse for reliability."
          />
        ) : null}
      </div>

      <div className="divider my-3" />

      <OptionList label="Available servers">
        {PLAYBACK_SERVERS.map((server) => {
          const failed = unresponsive.includes(server.id);
          return (
            <OptionRow
              key={server.id}
              name="playback-server"
              value={server.id}
              checked={server.id === activeId}
              onSelect={() => onPick(server.id)}
              title={server.label}
              subtitle={failed ? 'Did not respond earlier in this session' : server.note}
              badge={
                <>
                  {server.multiLanguage && server.id !== AUTO_SERVER_ID ? (
                    <Badge>Multi-lang</Badge>
                  ) : null}
                  {failed ? <Badge tone="accent">No response</Badge> : null}
                </>
              }
            />
          );
        })}
      </OptionList>

      <InlineNotice className="mt-4">
        Cineora can tell that an embed never loaded. It cannot see inside the player, so it never
        reports whether video is actually playing — if a source stays silent or stalls, switch server
        here.
      </InlineNotice>

      <a
        href={NXSHA_DOCS_URL}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-3 inline-flex items-center gap-1.5 text-xs text-mist-500 transition-colors duration-200 hover:text-mist-200"
      >
        Nxsha embed documentation
        <ExternalIcon className="size-3.5" />
      </a>
    </Sheet>
  );
}
