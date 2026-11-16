import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';

const BUILD_DIR = path.resolve(process.cwd(), 'build');
const OUT_PNG = path.join(BUILD_DIR, 'icon.png');
const OUT_ICO = path.join(BUILD_DIR, 'icon.ico');

function crc32(buf) {
  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    crc ^= buf[i];
    for (let k = 0; k < 8; k++) {
      crc = (crc & 1) !== 0 ? 0xedb88320 ^ (crc >>> 1) : crc >>> 1;
    }
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function pngChunk(type, data) {
  const typeBuf = Buffer.from(type, 'ascii');
  const lenBuf = Buffer.alloc(4);
  lenBuf.writeUInt32BE(data.length, 0);
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])), 0);
  return Buffer.concat([lenBuf, typeBuf, data, crcBuf]);
}

function renderKingRGBA(size) {
  const rgba = new Uint8Array(size * size * 4);
  const setPixel = (x, y, r, g, b, a) => {
    if (x < 0 || y < 0 || x >= size || y >= size) return;
    const idx = (y * size + x) * 4;
    const srcA = a / 255;
    const dstA = rgba[idx + 3] / 255;
    const outA = srcA + dstA * (1 - srcA);
    if (outA <= 0) return;
    rgba[idx] = Math.round((r * srcA + rgba[idx] * dstA * (1 - srcA)) / outA);
    rgba[idx + 1] = Math.round((g * srcA + rgba[idx + 1] * dstA * (1 - srcA)) / outA);
    rgba[idx + 2] = Math.round((b * srcA + rgba[idx + 2] * dstA * (1 - srcA)) / outA);
    rgba[idx + 3] = Math.round(outA * 255);
  };

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const nx = x / size;
      const ny = y / size;
      const rad = 0.2;
      const dx = Math.max(0, Math.abs(nx - 0.5) - (0.47 - rad));
      const dy = Math.max(0, Math.abs(ny - 0.5) - (0.47 - rad));
      const dist = Math.hypot(dx, dy);
      if (dist > rad) continue;
      const edgeAlpha = dist > rad - 0.008 ? Math.max(0, Math.min(255, ((rad - dist) / 0.008) * 255)) : 255;

      const radial = Math.hypot(nx - 0.5, ny - 0.42);
      const mist = Math.exp(-((nx - 0.5) ** 2 / 0.055 + (ny - 0.36) ** 2 / 0.065));
      let r = Math.min(255, Math.round(6 + 24 * Math.max(0, 1 - radial * 1.4) + 46 * mist));
      let g = Math.min(255, Math.round(14 + 58 * Math.max(0, 1 - radial * 1.3) + 125 * mist));
      let b = Math.min(255, Math.round(28 + 108 * Math.max(0, 1 - radial * 1.2) + 195 * mist));

      if (ny >= 0.76 && ny <= 0.94) {
        const col = Math.floor(((nx - 0.5) / (0.65 + (ny - 0.76) * 1.4) + 0.5) * 6);
        const row = ny > 0.85 ? 1 : 0;
        if ((col + row) % 2 === 0) {
          r += 14;
          g += 46;
          b += 82;
        }
      }

      setPixel(x, y, Math.min(255, r), Math.min(255, g), Math.min(255, b), edgeAlpha);

      const cx = Math.abs(nx - 0.5);
      let inKing = false;
      let halfWidth = 0;
      if (ny >= 0.09 && ny <= 0.22 && cx <= 0.024) {
        inKing = true;
        halfWidth = 0.024;
      } else if (ny >= 0.13 && ny <= 0.175 && cx <= 0.066) {
        inKing = true;
        halfWidth = 0.066;
      } else if (ny >= 0.23 && ny <= 0.36) {
        const t = (ny - 0.23) / 0.13;
        halfWidth = 0.118 - t * 0.026;
        if (cx <= halfWidth) inKing = true;
      } else if (ny >= 0.365 && ny <= 0.415) {
        halfWidth = ny < 0.395 ? 0.122 : 0.098;
        if (cx <= halfWidth) inKing = true;
      } else if (ny >= 0.415 && ny <= 0.675) {
        const t = (ny - 0.415) / 0.26;
        halfWidth = 0.082 + t * t * 0.064;
        if (cx <= halfWidth) inKing = true;
      } else if (ny >= 0.675 && ny <= 0.72) {
        halfWidth = 0.172;
        if (cx <= halfWidth) inKing = true;
      } else if (ny >= 0.72 && ny <= 0.79) {
        const t = (ny - 0.72) / 0.07;
        halfWidth = 0.195 + t * 0.024;
        if (cx <= halfWidth) inKing = true;
      }

      if (inKing) {
        const rimDist = halfWidth - cx;
        if (rimDist < 0.011) {
          const amberMix = ny > 0.52 && nx > 0.5 ? 0.38 : 0;
          setPixel(
            x,
            y,
            Math.round(92 * (1 - amberMix) + 245 * amberMix),
            Math.round(205 * (1 - amberMix) + 158 * amberMix),
            Math.round(252 * (1 - amberMix) + 11 * amberMix),
            255,
          );
        } else {
          const sheen = Math.max(0, 1 - Math.abs(nx - 0.455) * 18);
          setPixel(x, y, Math.round(11 + sheen * 34), Math.round(19 + sheen * 56), Math.round(31 + sheen * 88), 255);
        }
      }
    }
  }
  return rgba;
}

function encodePNG(width, height, rgba) {
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;

  const stride = width * 4;
  const raw = Buffer.alloc((stride + 1) * height);
  for (let y = 0; y < height; y++) {
    raw[y * (stride + 1)] = 0;
    Buffer.from(rgba.buffer, y * stride, stride).copy(raw, y * (stride + 1) + 1);
  }

  const compressed = zlib.deflateSync(raw, { level: 9 });
  return Buffer.concat([sig, pngChunk('IHDR', ihdr), pngChunk('IDAT', compressed), pngChunk('IEND', Buffer.alloc(0))]);
}

function encodeICO(pngBuffersWithSizes) {
  const count = pngBuffersWithSizes.length;
  const header = Buffer.alloc(6);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(count, 4);

  const dirEntries = [];
  let offset = 6 + count * 16;
  for (const { size, png } of pngBuffersWithSizes) {
    const entry = Buffer.alloc(16);
    entry[0] = size >= 256 ? 0 : size;
    entry[1] = size >= 256 ? 0 : size;
    entry.writeUInt16LE(1, 4);
    entry.writeUInt16LE(32, 6);
    entry.writeUInt32LE(png.length, 8);
    entry.writeUInt32LE(offset, 12);
    dirEntries.push(entry);
    offset += png.length;
  }
  return Buffer.concat([header, ...dirEntries, ...pngBuffersWithSizes.map((item) => item.png)]);
}

fs.mkdirSync(BUILD_DIR, { recursive: true });
const sizes = [16, 24, 32, 48, 64, 128, 256];
const rendered = sizes.map((size) => ({ size, png: encodePNG(size, size, renderKingRGBA(size)) }));
fs.writeFileSync(OUT_PNG, rendered.find((r) => r.size === 256).png);
fs.writeFileSync(OUT_ICO, encodeICO(rendered));
console.log('Generated build/icon.png and multi-size build/icon.ico');
