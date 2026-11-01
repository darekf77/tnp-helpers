import { spawn } from 'tnp-core/src'; // @esmRemove

import { ImageToDummyVideoOptions } from './models';

export namespace UtilsFFmpeg {
  export async function drawCenteredDummyLabel(
    inputPath: string,
    outputPath: string,
    text: string,
  ): Promise<void> {
    //#region @backendFunc
    //#region @esmRemove
    const sharePackageName = 'sharp';
    // @taon-ignore
    const sharp = require(sharePackageName) as typeof import('sharp');

    const image = sharp(inputPath);
    const metadata = await image.metadata();

    if (!metadata.width || !metadata.height) {
      throw new Error(`Cannot determine image dimensions: ${inputPath}`);
    }

    const { width, height } = metadata;

    // Check brightness of the area where the text will actually be drawn.
    const sampleWidth = Math.max(1, Math.floor(width * 0.8));
    const sampleHeight = Math.max(1, Math.floor(height * 0.3));

    const left = Math.floor((width - sampleWidth) / 2);
    const top = Math.floor((height - sampleHeight) / 2);

    const stats = await sharp(inputPath)
      .extract({
        left,
        top,
        width: sampleWidth,
        height: sampleHeight,
      })
      .stats();

    const [r, g, b] = stats.channels;

    const luminance = 0.2126 * r.mean + 0.7152 * g.mean + 0.0722 * b.mean;

    // White text on dark backgrounds, black text on bright backgrounds.
    const textColor = luminance > 128 ? '#000000' : '#ffffff';

    // Desired text height.
    const fontSize = Math.floor(height / 5);

    // Rough width estimation for bold sans-serif text.
    //
    // We intentionally keep the font size unchanged and squeeze horizontally
    // only when the text would exceed the available width.
    const estimatedTextWidth = text.length * fontSize * 0.6;
    const maxTextWidth = width * 0.9;

    const scaleX = Math.min(1, maxTextWidth / estimatedTextWidth);

    const svg = `
    <svg
      width="${width}"
      height="${height}"
      xmlns="http://www.w3.org/2000/svg"
    >
      <g
        transform="
          translate(${width / 2} ${height / 2})
          scale(${scaleX} 1)
        "
      >
        <text
          x="0"
          y="0"
          text-anchor="middle"
          dominant-baseline="middle"
          font-family="sans-serif"
          font-size="${fontSize}px"
          font-weight="bold"
          fill="${textColor}"
        >${escapeXml(text)}</text>
      </g>
    </svg>
  `;

    await sharp(inputPath)
      .composite([
        {
          input: Buffer.from(svg),
          top: 0,
          left: 0,
        },
      ])
      .png()
      .toFile(outputPath);

    //#endregion
    return void 0 as any;
    //#endregion
  }

  function escapeXml(value: string): string {
    return value
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  }

  export function imageToDummyVideo(
    options: ImageToDummyVideoOptions,
  ): Promise<void> {
    //#region @backendFunc
    //#region @esmRemove
    const {
      input,
      output,
      duration = 10,
      width = 1920,
      height = 1080,
      fps = 30,
    } = options;

    return new Promise((resolve, reject) => {
      const filter = [
        // Prepare source image
        `[0:v]scale=${width}:${height}:force_original_aspect_ratio=decrease,` +
          `pad=${width}:${height}:(ow-iw)/2:(oh-ih)/2[bg]`,

        // Create spinner
        `[1:v]format=rgba,` +
          `drawbox=x=52:y=8:w=16:h=45:color=white:t=fill,` +
          `rotate='2*PI*t':ow=120:oh=120:c=black@0[spinner]`,

        // Put spinner in top-left
        `[bg][spinner]overlay=40:40`,
      ].join(';');

      const args = [
        '-y',

        '-loop',
        '1',
        '-i',
        input,

        // transparent 120x120 source for spinner
        '-f',
        'lavfi',
        '-i',
        `color=c=black@0.65:s=120x120:r=${fps}`,

        '-filter_complex',
        filter,

        '-t',
        String(duration),

        '-r',
        String(fps),

        '-c:v',
        'libx264',
        '-pix_fmt',
        'yuv420p',

        '-movflags',
        '+faststart',

        output,
      ];

      const proc = spawn('ffmpeg', args, {
        stdio: 'inherit',
      });

      proc.on('error', reject);

      proc.on('close', code => {
        if (code === 0) {
          resolve();
        } else {
          reject(new Error(`ffmpeg exited with code ${code}`));
        }
      });
    });
    //#endregionń
    return void 0 as any;
    //#endregion
  }
}
