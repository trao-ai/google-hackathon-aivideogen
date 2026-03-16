import ffmpeg from "fluent-ffmpeg";
import { promisify } from "util";

interface KenBurnsOptions {
  startFrame: string;
  endFrame?: string;
  output: string;
  duration: number;
  motionType: "zoom-in" | "zoom-out" | "pan-right" | "pan-left" | "static";
}

export async function applyKenBurnsEffect(
  options: KenBurnsOptions
): Promise<void> {
  const { startFrame, endFrame, output, duration, motionType } = options;

  return new Promise((resolve, reject) => {
    const fps = 30;
    const totalFrames = Math.floor(duration * fps);

    // Build FFmpeg filter complex based on motion type
    const filter = buildKenBurnsFilter(motionType, totalFrames, fps, !!endFrame);

    let command = ffmpeg();

    if (endFrame) {
      // Crossfade between start and end frames
      command = command
        .input(startFrame)
        .inputOptions(["-loop 1", `-t ${duration / 2}`])
        .input(endFrame)
        .inputOptions(["-loop 1", `-t ${duration / 2}`])
        .complexFilter([
          // Apply Ken Burns to first frame
          `[0:v]${filter.start}[v0]`,
          // Apply Ken Burns to second frame
          `[1:v]${filter.end}[v1]`,
          // Crossfade between them
          `[v0][v1]xfade=transition=fade:duration=0.5:offset=${duration / 2 - 0.25}[vout]`,
        ])
        .outputOptions(["-map [vout]", "-c:v libx264", "-pix_fmt yuv420p", "-r 30"]);
    } else {
      // Single frame with Ken Burns
      command = command
        .input(startFrame)
        .inputOptions(["-loop 1", `-t ${duration}`])
        .complexFilter([`[0:v]${filter.start}[vout]`])
        .outputOptions(["-map [vout]", "-c:v libx264", "-pix_fmt yuv420p", "-r 30"]);
    }

    command
      .output(output)
      .on("end", () => resolve())
      .on("error", (err) => reject(err))
      .run();
  });
}

function buildKenBurnsFilter(
  motionType: string,
  totalFrames: number,
  fps: number,
  hasEndFrame: boolean
): { start: string; end: string } {
  const duration = totalFrames / fps;

  let startFilter = "";
  let endFilter = "";

  switch (motionType) {
    case "zoom-in":
      // Zoom from 1.0x to 1.2x scale
      startFilter = `zoompan=z='min(zoom+0.0005,1.2)':d=${totalFrames}:x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':s=1280x720`;
      endFilter = `zoompan=z='min(zoom+0.0005,1.2)':d=${totalFrames}:x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':s=1280x720`;
      break;

    case "zoom-out":
      // Zoom from 1.2x to 1.0x scale
      startFilter = `zoompan=z='if(lte(zoom,1.0),1.0,max(1.0,zoom-0.0005))':d=${totalFrames}:x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':s=1280x720`;
      endFilter = `zoompan=z='if(lte(zoom,1.0),1.0,max(1.0,zoom-0.0005))':d=${totalFrames}:x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':s=1280x720`;
      break;

    case "pan-right":
      // Pan from left to right
      startFilter = `zoompan=z='1.1':d=${totalFrames}:x='iw/2-(iw/zoom/2)+((iw/4)*(on/${totalFrames}))':y='ih/2-(ih/zoom/2)':s=1280x720`;
      endFilter = `zoompan=z='1.1':d=${totalFrames}:x='iw/2-(iw/zoom/2)+((iw/4)*(on/${totalFrames}))':y='ih/2-(ih/zoom/2)':s=1280x720`;
      break;

    case "pan-left":
      // Pan from right to left
      startFilter = `zoompan=z='1.1':d=${totalFrames}:x='iw/2-(iw/zoom/2)-((iw/4)*(on/${totalFrames}))':y='ih/2-(ih/zoom/2)':s=1280x720`;
      endFilter = `zoompan=z='1.1':d=${totalFrames}:x='iw/2-(iw/zoom/2)-((iw/4)*(on/${totalFrames}))':y='ih/2-(ih/zoom/2)':s=1280x720`;
      break;

    default:
      // Static with slight zoom for visual interest
      startFilter = `zoompan=z='min(zoom+0.0002,1.05)':d=${totalFrames}:x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':s=1280x720`;
      endFilter = `zoompan=z='min(zoom+0.0002,1.05)':d=${totalFrames}:x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':s=1280x720`;
  }

  return { start: startFilter, end: endFilter };
}
