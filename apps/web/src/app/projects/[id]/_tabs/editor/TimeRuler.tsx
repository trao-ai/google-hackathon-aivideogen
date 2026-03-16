"use client";

interface TimeRulerProps {
  totalDuration: number;
  zoomLevel: number;
}

function formatTime(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export function TimeRuler({ totalDuration, zoomLevel }: TimeRulerProps) {
  let majorInterval: number;
  let minorInterval: number;
  if (zoomLevel < 10) {
    majorInterval = 60;
    minorInterval = 30;
  } else if (zoomLevel < 20) {
    majorInterval = 30;
    minorInterval = 10;
  } else if (zoomLevel < 40) {
    majorInterval = 10;
    minorInterval = 5;
  } else if (zoomLevel < 80) {
    majorInterval = 5;
    minorInterval = 1;
  } else {
    majorInterval = 2;
    minorInterval = 1;
  }

  const totalWidth = totalDuration * zoomLevel;
  const ticks: { sec: number; isMajor: boolean }[] = [];
  for (let t = 0; t <= totalDuration; t += minorInterval) {
    const roundedT = Math.round(t * 100) / 100;
    ticks.push({ sec: roundedT, isMajor: roundedT % majorInterval === 0 });
  }

  return (
    <div className="relative" style={{ width: totalWidth, height: 32 }}>
      {ticks.map(({ sec, isMajor }) => (
        <div
          key={sec}
          className="absolute top-0"
          style={{ left: sec * zoomLevel }}
        >
          {/* Tick line from top */}
          <div
            className={`w-px ${isMajor ? "h-3 bg-foreground/30" : "h-2 bg-foreground/15"}`}
          />
          {/* Label below tick */}
          {isMajor && (
            <span
              className="absolute top-3.5 text-[11px] font-medium text-foreground/50 tabular-nums select-none whitespace-nowrap"
              style={{ transform: "translateX(-50%)" }}
            >
              {formatTime(sec)}
            </span>
          )}
        </div>
      ))}
    </div>
  );
}
