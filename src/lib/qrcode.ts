/**
 * Minimal QR code SVG renderer.
 * Generates a simple data-matrix style visual from input text.
 * Not a real QR encoder — produces a deterministic grid pattern
 * that visually represents the data and is unique per input.
 */
export function generateQRCodeSVG(data: string, size: number = 100): string {
  const modules = 21; // 21x21 grid (Version 1 QR size)
  const cellSize = size / modules;
  
  // Simple hash-based grid generator
  const grid: boolean[][] = [];
  for (let r = 0; r < modules; r++) {
    grid[r] = [];
    for (let c = 0; c < modules; c++) {
      grid[r][c] = false;
    }
  }

  // Add finder patterns (top-left, top-right, bottom-left)
  const setFinder = (startR: number, startC: number) => {
    for (let r = 0; r < 7; r++) {
      for (let c = 0; c < 7; c++) {
        const isOuter = r === 0 || r === 6 || c === 0 || c === 6;
        const isInner = r >= 2 && r <= 4 && c >= 2 && c <= 4;
        grid[startR + r][startC + c] = isOuter || isInner;
      }
    }
  };

  setFinder(0, 0);
  setFinder(0, modules - 7);
  setFinder(modules - 7, 0);

  // Timing patterns
  for (let i = 8; i < modules - 8; i++) {
    grid[6][i] = i % 2 === 0;
    grid[i][6] = i % 2 === 0;
  }

  // Data-driven fill for remaining cells
  let hash = 0;
  for (let i = 0; i < data.length; i++) {
    hash = (Math.imul(31, hash) + data.charCodeAt(i)) | 0;
  }

  for (let r = 0; r < modules; r++) {
    for (let c = 0; c < modules; c++) {
      // Skip finder patterns and timing
      if ((r < 8 && c < 8) || (r < 8 && c >= modules - 8) || (r >= modules - 8 && c < 8)) continue;
      if (r === 6 || c === 6) continue;

      const seed = hash + r * 37 + c * 53;
      const val = Math.imul(seed ^ (seed >>> 16), 0x45d9f3b);
      grid[r][c] = (val & 3) < 2; // ~50% fill
    }
  }

  // Build SVG
  let rects = "";
  for (let r = 0; r < modules; r++) {
    for (let c = 0; c < modules; c++) {
      if (grid[r][c]) {
        rects += `<rect x="${c * cellSize}" y="${r * cellSize}" width="${cellSize}" height="${cellSize}"/>`;
      }
    }
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}" width="${size}" height="${size}"><rect width="${size}" height="${size}" fill="white"/><g fill="currentColor">${rects}</g></svg>`;
}
