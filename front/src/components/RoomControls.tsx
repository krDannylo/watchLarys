interface RoomControlsProps {
  isSharing: boolean;
  onStart: () => void;
  onStop: () => void;
}

export function RoomControls({
  isSharing,
  onStart,
  onStop,
}: RoomControlsProps) {
  return (
    <div className="flex items-center justify-center gap-3">
      {!isSharing ? (
        <button
          type="button"
          onClick={onStart}
          className="flex items-center gap-2 rounded-xl bg-white px-5 py-3 text-sm font-semibold text-zinc-900 shadow-lg shadow-black/20 transition hover:bg-zinc-200 active:scale-[0.98]"
        >
          <span className="text-base">🖥️</span>
          Compartilhar tela
        </button>
      ) : (
        <button
          type="button"
          onClick={onStop}
          className="flex items-center gap-2 rounded-xl bg-red-500 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-red-500/10 transition hover:bg-red-600 active:scale-[0.98]"
        >
          <span className="text-base">⏹</span>
          Parar compartilhamento
        </button>
      )}
    </div>
  );
}
