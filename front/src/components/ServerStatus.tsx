interface ServerStatusProps {
  status: "connecting" | "connected" | "disconnected";
}

const statusConfig = {
  connecting: {
    label: "Conectando ao servidor...",
    dot: "bg-yellow-400",
    ping: true,
  },
  connected: {
    label: "Servidor conectado",
    dot: "bg-emerald-400",
    ping: true,
  },
  disconnected: {
    label: "Servidor indisponível",
    dot: "bg-red-400",
    ping: false,
  },
};

export function ServerStatus({ status }: ServerStatusProps) {
  const config = statusConfig[status];

  return (
    <div className="flex items-center gap-2 text-sm text-zinc-400">
      <span className="relative flex h-2.5 w-2.5">
        {config.ping && (
          <span
            className={`absolute inline-flex h-full w-full animate-ping rounded-full opacity-75 ${config.dot}`}
          />
        )}

        <span
          className={`relative inline-flex h-2.5 w-2.5 rounded-full ${config.dot}`}
        />
      </span>

      <span>{config.label}</span>
    </div>
  );
}
