interface ParticipantListProps {
  participants: Map<string, string>;
  currentUserId: string | undefined;
}

export function ParticipantList({
  participants,
  currentUserId,
}: ParticipantListProps) {
  return (
    <aside className="flex h-full w-72 flex-col border-l border-white/10 bg-zinc-950/80">
      <div className="border-b border-white/10 px-5 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-semibold text-white">Participantes</h2>

            <p className="mt-1 text-xs text-zinc-500">
              {participants.size + 1}{" "}
              {participants.size === 1 ? "participante" : "participantes"}
            </p>
          </div>

          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/5 text-sm text-zinc-400">
            {participants.size + 1}
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-3">
        <div className="space-y-1">
          {Array.from(participants.entries()).map(([userId, name]) => {
            const isCurrentUser = userId === currentUserId;

            return (
              <div
                key={userId}
                className="flex items-center gap-3 rounded-xl px-3 py-3 transition hover:bg-white/5"
              >
                <div className="relative">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 text-sm font-semibold text-white">
                    {name.charAt(0).toUpperCase()}
                  </div>

                  <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-zinc-950 bg-emerald-500" />
                </div>

                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-zinc-200">
                    {name}
                  </p>

                  <p className="text-xs text-zinc-500">
                    {isCurrentUser ? "Você" : "Online"}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </aside>
  );
}
