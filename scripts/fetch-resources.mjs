import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { pipeline } from 'node:stream/promises';
import { Readable } from 'node:stream';
import AdmZip from 'adm-zip';

const ROOT = process.cwd();
const LOCK_PATH = path.join(ROOT, 'resources.lock.json');
const TEMP_DIR = path.join(ROOT, '.tmp-downloads');

function sha256File(filePath) {
  return new Promise((resolve, reject) => {
    const hash = crypto.createHash('sha256');
    const stream = fs.createReadStream(filePath);
    stream.on('error', reject);
    stream.on('data', (chunk) => hash.update(chunk));
    stream.on('end', () => resolve(hash.digest('hex')));
  });
}

async function downloadFile(url, destination) {
  fs.mkdirSync(path.dirname(destination), { recursive: true });
  const response = await fetch(url, { redirect: 'follow' });
  if (!response.ok || !response.body) {
    throw new Error(`HTTP ${response.status} while downloading ${url}`);
  }
  await pipeline(Readable.fromWeb(response.body), fs.createWriteStream(destination));
}

async function main() {
  const lock = JSON.parse(fs.readFileSync(LOCK_PATH, 'utf8'));
  const updateLockMode = process.argv.includes('--update-lock');
  let lockModified = false;

  fs.mkdirSync(path.join(ROOT, 'resources', 'engines'), { recursive: true });
  fs.mkdirSync(path.join(ROOT, 'resources', 'models'), { recursive: true });
  fs.mkdirSync(TEMP_DIR, { recursive: true });

  for (const item of lock.resources) {
    const fullTarget = path.join(ROOT, item.targetPath);
    if (fs.existsSync(fullTarget)) {
      const existingHash = await sha256File(fullTarget);
      if (item.sha256 !== 'AUTO_POPULATE_ON_FIRST_LOCK_OR_VERIFY' && item.sha256 !== existingHash) {
        throw new Error(`SHA256 mismatch for ${item.targetPath}: expected ${item.sha256}, got ${existingHash}`);
      }
      if (item.sha256 === 'AUTO_POPULATE_ON_FIRST_LOCK_OR_VERIFY' && updateLockMode) {
        item.sha256 = existingHash;
        lockModified = true;
      }
      console.log(`[OK] Verified cached ${item.targetPath}`);
      continue;
    }

    console.log(`[DOWNLOAD] ${item.id} -> ${item.targetPath}`);
    const downloadDest = path.join(TEMP_DIR, `${item.id}.bin`);
    await downloadFile(item.url, downloadDest);

    if (item.archiveEntry) {
      const zip = new AdmZip(downloadDest);
      const entry =
        zip.getEntry(item.archiveEntry) ??
        zip.getEntries().find((e) => e.entryName.endsWith(path.basename(item.targetPath)));
      if (!entry) throw new Error(`Archive ${item.url} missing entry ${item.archiveEntry}`);
      fs.mkdirSync(path.dirname(fullTarget), { recursive: true });
      fs.writeFileSync(fullTarget, entry.getData());
    } else {
      fs.mkdirSync(path.dirname(fullTarget), { recursive: true });
      fs.renameSync(downloadDest, fullTarget);
    }

    const actualHash = await sha256File(fullTarget);
    if (item.sha256 === 'AUTO_POPULATE_ON_FIRST_LOCK_OR_VERIFY') {
      if (updateLockMode) {
        item.sha256 = actualHash;
        lockModified = true;
      }
      console.log(`[FETCHED] ${item.id} sha256=${actualHash}`);
    } else if (actualHash !== item.sha256) {
      fs.unlinkSync(fullTarget);
      throw new Error(`CRITICAL: SHA256 mismatch for ${item.id}. Expected ${item.sha256}, got ${actualHash}`);
    }
  }

  if (lockModified) {
    fs.writeFileSync(LOCK_PATH, `${JSON.stringify(lock, null, 2)}
`, 'utf8');
  }
  fs.rmSync(TEMP_DIR, { recursive: true, force: true });
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
