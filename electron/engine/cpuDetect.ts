import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

export interface CpuSelectionResult {
  features: string[];
  preferredBinary: string;
  resolvedPath: string | null;
  isWasmFallback: boolean;
}

export function detectCpuFeatures(): string[] {
  const features: string[] = ['x86-64'];
  const cpuModel = os.cpus()[0]?.model ?? '';

  if (process.platform === 'win32') {
    try {
      const output = execFileSync(
        'powershell.exe',
        [
          '-NoProfile',
          '-NonInteractive',
          '-Command',
          '$f=@(); if([System.Runtime.Intrinsics.X86.Avx2]::IsSupported){$f+="avx2"}; if([System.Runtime.Intrinsics.X86.Bmi2]::IsSupported){$f+="bmi2"}; if([System.Runtime.Intrinsics.X86.Sse41]::IsSupported){$f+="sse41"}; if([System.Runtime.Intrinsics.X86.Popcnt]::IsSupported){$f+="popcnt"}; $f -join ","',
        ],
        { timeout: 1500, windowsHide: true, encoding: 'utf8' },
      ).trim();

      if (output) {
        for (const token of output.split(',')) {
          const clean = token.trim().toLowerCase();
          if (clean && !features.includes(clean)) {
            features.push(clean);
          }
        }
        return features;
      }
    } catch {
      // Fall back to CPU model heuristics below
    }
  }

  // Heuristic fallback based on CPU model string
  if (/ryzen|epyc|core\(tm\) i[3579]-(?:[4-9]|1[0-9])|xeon/i.test(cpuModel)) {
    features.push('sse41', 'popcnt', 'avx2', 'bmi2');
  } else if (/core\(tm\) i[3579]-[23]/i.test(cpuModel)) {
    features.push('sse41', 'popcnt');
  }

  return features;
}

export function getCandidateBinaryNames(features: string[]): string[] {
  const hasAvx2 = features.includes('avx2');
  const hasBmi2 = features.includes('bmi2');
  const hasSse41 = features.includes('sse41') && features.includes('popcnt');

  const ordered: string[] = [];
  if (hasAvx2 && hasBmi2) {
    ordered.push('stockfish-windows-x86-64-bmi2.exe');
  }
  if (hasAvx2) {
    ordered.push('stockfish-windows-x86-64-avx2.exe');
  }
  if (hasSse41) {
    ordered.push('stockfish-windows-x86-64-sse41-popcnt.exe');
  }
  ordered.push('stockfish-windows-x86-64.exe');
  return ordered;
}

export function resolveStockfishBinary(
  enginesDir: string,
  customEnginePath?: string,
): CpuSelectionResult {
  const features = detectCpuFeatures();
  const candidates = getCandidateBinaryNames(features);
  const preferredBinary = candidates[0] ?? 'stockfish-windows-x86-64.exe';

  if (customEnginePath && fs.existsSync(customEnginePath)) {
    return {
      features,
      preferredBinary: path.basename(customEnginePath),
      resolvedPath: customEnginePath,
      isWasmFallback: false,
    };
  }

  for (const name of candidates) {
    const full = path.join(enginesDir, name);
    if (fs.existsSync(full)) {
      return {
        features,
        preferredBinary: name,
        resolvedPath: full,
        isWasmFallback: false,
      };
    }
  }

  return {
    features,
    preferredBinary,
    resolvedPath: null,
    isWasmFallback: true,
  };
}
