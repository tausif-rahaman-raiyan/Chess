import { ChildProcessWithoutNullStreams, spawn } from 'node:child_process';
import readline from 'node:readline';

export type UciLineListener = (line: string) => void;

export interface IUciTransport {
  readonly name: string;
  readonly isWasm: boolean;
  start(): Promise<void>;
  send(command: string): void;
  waitFor(predicate: (line: string) => boolean, timeoutMs?: number): Promise<string>;
  onLine(listener: UciLineListener): () => void;
  stop(): Promise<void>;
}

/**
 * Native Stockfish 17 Windows x64 child process with automatic watchdog restart,
 * isready synchronization, and clean shutdown.
 */
export class NativeUciProcess implements IUciTransport {
  public readonly name: string;
  public readonly isWasm = false;
  private proc: ChildProcessWithoutNullStreams | null = null;
  private listeners = new Set<UciLineListener>();
  private startingPromise: Promise<void> | null = null;
  private disposed = false;

  constructor(private readonly binaryPath: string) {
    this.name = binaryPath.split(/[\\/]/).pop() ?? 'stockfish.exe';
  }

  public async start(): Promise<void> {
    if (this.proc && !this.proc.killed && this.proc.exitCode === null) {
      return;
    }
    if (this.startingPromise) {
      return this.startingPromise;
    }

    this.startingPromise = this.spawnInternal().finally(() => {
      this.startingPromise = null;
    });
    return this.startingPromise;
  }

  private async spawnInternal(): Promise<void> {
    this.proc = spawn(this.binaryPath, [], {
      stdio: ['pipe', 'pipe', 'pipe'],
      windowsHide: true,
    });

    const rl = readline.createInterface({ input: this.proc.stdout });
    rl.on('line', (line) => {
      const trimmed = line.trim();
      if (!trimmed) return;
      for (const listener of this.listeners) {
        listener(trimmed);
      }
    });

    this.proc.on('exit', () => {
      this.proc = null;
      if (!this.disposed) {
        // Watchdog auto-recovery on unexpected crash
        setTimeout(() => {
          if (!this.disposed) {
            void this.start().catch(() => undefined);
          }
        }, 300);
      }
    });

    this.send('uci');
    await this.waitFor((line) => line === 'uciok', 6000);
    this.send('isready');
    await this.waitFor((line) => line === 'readyok', 6000);
  }

  public send(command: string): void {
    if (!this.proc || !this.proc.stdin.writable) {
      throw new Error('Stockfish native process is not running');
    }
    this.proc.stdin.write(`${command}
`);
  }

  public waitFor(predicate: (line: string) => boolean, timeoutMs = 8000): Promise<string> {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        off();
        reject(new Error(`UCI timeout after ${timeoutMs}ms`));
      }, timeoutMs);

      const off = this.onLine((line) => {
        if (predicate(line)) {
          clearTimeout(timer);
          off();
          resolve(line);
        }
      });
    });
  }

  public onLine(listener: UciLineListener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  public async stop(): Promise<void> {
    this.disposed = true;
    if (this.proc) {
      try {
        this.send('quit');
      } catch {
        // Ignore pipe write errors on shutdown
      }
      this.proc.kill();
      this.proc = null;
    }
  }
}

/**
 * Pure single-threaded Stockfish WASM fallback transport so the app works
 * immediately even before native .exe binaries are fetched.
 */
export class WasmUciProcess implements IUciTransport {
  public readonly name = 'stockfish-wasm-fallback';
  public readonly isWasm = true;
  private listeners = new Set<UciLineListener>();
  private engine: { postMessage: (cmd: string) => void; onmessage?: (msg: unknown) => void } | null =
    null;

  public async start(): Promise<void> {
    if (this.engine) return;
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const stockfishFactory = require('stockfish') as () => Promise<{
      postMessage: (cmd: string) => void;
      addMessageListener?: (fn: (line: string) => void) => void;
      onmessage?: (event: { data?: string } | string) => void;
    }>;

    const instance = await stockfishFactory();
    const emit = (raw: unknown) => {
      const text =
        typeof raw === 'string'
          ? raw
          : typeof raw === 'object' && raw !== null && 'data' in raw
            ? String((raw as { data: unknown }).data)
            : '';
      for (const line of text.split(/?
/)) {
        const clean = line.trim();
        if (!clean) continue;
        for (const listener of this.listeners) {
          listener(clean);
        }
      }
    };

    if (typeof instance.addMessageListener === 'function') {
      instance.addMessageListener(emit);
    } else {
      instance.onmessage = emit;
    }

    this.engine = instance;
    this.send('uci');
    await this.waitFor((l) => l === 'uciok', 8000);
    this.send('isready');
    await this.waitFor((l) => l === 'readyok', 8000);
  }

  public send(command: string): void {
    if (!this.engine) {
      throw new Error('Stockfish WASM fallback not initialized');
    }
    this.engine.postMessage(command);
  }

  public waitFor(predicate: (line: string) => boolean, timeoutMs = 8000): Promise<string> {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        off();
        reject(new Error(`WASM UCI timeout after ${timeoutMs}ms`));
      }, timeoutMs);

      const off = this.onLine((line) => {
        if (predicate(line)) {
          clearTimeout(timer);
          off();
          resolve(line);
        }
      });
    });
  }

  public onLine(listener: UciLineListener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  public async stop(): Promise<void> {
    if (this.engine) {
      try {
        this.send('quit');
      } catch {
        // Ignore
      }
      this.engine = null;
    }
  }
}
