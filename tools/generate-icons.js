'use strict';

const fs = require('node:fs');
const path = require('node:path');
const zlib = require('node:zlib');

const outputDir = path.resolve(__dirname, '../assets/icons');
fs.mkdirSync(outputDir, { recursive: true });

function crc32(buffer) {
  let crc = 0xffffffff;
  for (const byte of buffer) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit += 1) {
      crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
    }
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const typeBuffer = Buffer.from(type);
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([typeBuffer, data])));
  return Buffer.concat([length, typeBuffer, data, crc]);
}

function png(width, height, pixels) {
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const header = Buffer.alloc(13);
  header.writeUInt32BE(width, 0);
  header.writeUInt32BE(height, 4);
  header[8] = 8;
  header[9] = 6;
  const rows = [];
  for (let y = 0; y < height; y += 1) {
    rows.push(Buffer.from([0]), pixels.subarray(y * width * 4, (y + 1) * width * 4));
  }
  return Buffer.concat([
    signature,
    chunk('IHDR', header),
    chunk('IDAT', zlib.deflateSync(Buffer.concat(rows), { level: 9 })),
    chunk('IEND', Buffer.alloc(0))
  ]);
}

function insideRoundedRect(x, y, size, radius) {
  const cx = Math.max(radius, Math.min(size - radius - 1, x));
  const cy = Math.max(radius, Math.min(size - radius - 1, y));
  return (x - cx) ** 2 + (y - cy) ** 2 <= radius ** 2;
}

function insideTriangle(px, py, a, b, c) {
  const area = (p1, p2, p3) =>
    (p1.x * (p2.y - p3.y) + p2.x * (p3.y - p1.y) + p3.x * (p1.y - p2.y)) / 2;
  const total = Math.abs(area(a, b, c));
  return (
    Math.abs(area({ x: px, y: py }, b, c)) +
      Math.abs(area(a, { x: px, y: py }, c)) +
      Math.abs(area(a, b, { x: px, y: py })) <=
    total + 0.25
  );
}

function renderIcon(size) {
  const pixels = Buffer.alloc(size * size * 4);
  const radius = size * 0.23;
  const triangle = [
    { x: size * 0.39, y: size * 0.29 },
    { x: size * 0.39, y: size * 0.71 },
    { x: size * 0.71, y: size * 0.5 }
  ];
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const index = (y * size + x) * 4;
      if (!insideRoundedRect(x, y, size, radius)) continue;
      const t = (x + y) / (size * 2);
      pixels[index] = Math.round(255);
      pixels[index + 1] = Math.round(58 + 62 * t);
      pixels[index + 2] = Math.round(88 - 18 * t);
      pixels[index + 3] = 255;
      if (insideTriangle(x + 0.5, y + 0.5, ...triangle)) {
        pixels[index] = 255;
        pixels[index + 1] = 255;
        pixels[index + 2] = 255;
      }
    }
  }
  return png(size, size, pixels);
}

for (const size of [16, 32, 48, 128]) {
  fs.writeFileSync(path.join(outputDir, `icon-${size}.png`), renderIcon(size));
}

console.log(`Generated icons in ${outputDir}`);
