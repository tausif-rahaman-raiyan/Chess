import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const ROOT = process.cwd();
const LOCK_PATH = path.join(ROOT, 'resources.lock.json');

function sha256File(filePath) {
  return new Promise((resolve, reject) => {
    const hash = crypto.createHash('sha256');
    const stream = fs.createReadStream(filePath);
    stream.on('error', reject);
    stream.on('data', (chunk) => hash.update(chunk));
    stream.on('end', () => resolve(hash.digest('hex')));
  });
}

async function main() {
  const strict = process.argv.includes('--strict');
  const lock = JSON.parse(fs.readFileSync(LOCK_PATH, 'utf8'));
  let totalBundledBytes = 0;

  for (const item of lock.resources) {
    const fullTarget = path.join(ROOT, item.targetPath);
    if (!fs.existsSync(fullTarget)) {
      if (strict) throw new Error(`Missing required resource: ${item.targetPath}`);
      continue;
    }
    const stats = fs.statSync(fullTarget);
    totalBundledBytes += stats.size;
    const digest = await sha256File(fullTarget);
    if (item.sha256 !== 'AUTO_POPULATE_ON_FIRST_LOCK_OR_VERIFY' && digest !== item.sha256) {
      throw new Error(`Hash mismatch for ${item.targetPath}`);
    }
    console.log(`[OK] ${item.targetPath} (${(stats.size / (1024 * 1024)).toFixed(1)} MB)`);
  }

  if (totalBundledBytes > lock.modelPackLimitBytes) {
    throw new Error(`Bundled resources (${totalBundledBytes}) exceed NSIS limit (${lock.modelPackLimitBytes})`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
