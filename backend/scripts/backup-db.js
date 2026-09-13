/**
 * Daily MongoDB backup runner
 * Produces a gzip-compressed BSON dump for the configured database.
 *
 * Usage:
 *   node scripts/backup-db.js          # writes to ./backups/
 *   node scripts/backup-db.js /path/to/dir
 *
 * Dependency: mongodump must be on PATH (comes with mongodb-database-tools).
 * Prints a summary line and exits 0 on success, 1 on failure.
 */

const { spawnSync } = require('child_process');
const fs              = require('fs');
const path            = require('path');

const uri      = process.env.MONGODB_URI || '';
const dbMatch  = uri.match(/\/([^/?]+)(\?|$)/);
const dbName   = dbMatch ? dbMatch[1] : 'ikimina-mis';
const dateStamp = new Date().toISOString().replace(/[:.]/g, '-').split('T')[0];

const outDir = process.argv[2] || path.join(__dirname, '..', 'backups');

// Ensure output directory exists
try { fs.mkdirSync(outDir, { recursive: true }); } catch (_) {}

const outFile = path.join(outDir, `${dbName}_${dateStamp}.gz`);
const statsFile = path.join(outDir, `${dbName}_${dateStamp}.json`);

try {
  // mongodump must be installed separately:
  //   mongodump --uri "$MONGODB_URI" --archive="$outFile" --gzip
  const result = spawnSync('mongodump', [
    '--uri', uri,
    '--archive', outFile,
    '--gzip'
  ], { stdio: 'inherit' });

  if (result.status !== 0) throw new Error(result.error?.message || 'mongodump failed');

  const stat = fs.statSync(outFile);
  const summary = {
    database: dbName,
    date:     dateStamp,
    file:     outFile,
    sizeBytes: stat.size,
    status:   'success'
  };
  fs.writeFileSync(statsFile, JSON.stringify(summary, null, 2));
  console.log(`[backup] ✅  Done — ${(stat.size / 1024).toFixed(1)} KB → ${outFile}`);
  process.exit(0);
} catch (err) {
  const summary = { database: dbName, date: dateStamp, status: 'failed', error: err.message };
  try { fs.writeFileSync(statsFile, JSON.stringify(summary, null, 2)); } catch (_) {}
  console.error(`[backup] ❌  Failed: ${err.message}`);
  process.exit(1);
}
