interface ScreenViewerProps {
  stream: MediaStream | null;
  isLocal?: boolean;
  participantName?: string;
}

export function ScreenViewer({
  stream,
  isLocal = false,
  participantName,
}: ScreenViewerProps) {
  if (!stream) {
    return (
      <div className="flex h-full min-h-[400px] items-center justify-center rounded-2xl border border-dashed border-white/10 bg-zinc-900/50">
        <div className="text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-white/5 text-2xl">
            🖥️
          </div>

          <h2 className="text-lg font-semibold text-zinc-200">
            Nenhuma tela compartilhada
          </h2>

          <p className="mt-2 max-w-sm text-sm text-zinc-500">
            Compartilhe sua tela para que os participantes possam visualizá-la.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative flex h-full min-h-[400px] items-center justify-center overflow-hidden rounded-2xl border border-white/10 bg-black shadow-2xl">
      <video
        autoPlay
        playsInline
        muted={isLocal}
        ref={(video) => {
          if (video && video.srcObject !== stream) {
            video.srcObject = stream;
          }
        }}
        className="max-h-full max-w-full object-contain"
      />

      {participantName && (
        <div className="absolute bottom-4 left-4 rounded-lg border border-white/10 bg-black/60 px-3 py-2 text-xs font-medium text-zinc-200 backdrop-blur-md">
          {participantName}
        </div>
      )}
    </div>
  );
}
