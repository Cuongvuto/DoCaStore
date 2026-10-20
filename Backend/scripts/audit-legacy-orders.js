import { readFile } from 'node:fs/promises';
import { auditLegacyOrders } from '../src/services/legacyOrderAudit.js';

// No dotenv, database connection, network request, or write operation.
const args = process.argv.slice(2);
if (args.length !== 1 || args[0].startsWith('-')) {
  console.error('Usage: node scripts/audit-legacy-orders.js <orders-export.json>');
  process.exitCode = 1;
} else {
  try {
    const raw = (await readFile(args[0], 'utf8')).replace(/^\uFEFF/, '').trim();
    if (!raw) throw new Error('Export file is empty. Use [] only for a verified empty collection.');
    const orders = raw.startsWith('[') ? JSON.parse(raw) : raw.split(/\r?\n/).filter(line => line.trim()).map(line => JSON.parse(line));
    const report = auditLegacyOrders(orders);
    console.log(JSON.stringify(report, null, 2));
    if (report.blockers) process.exitCode = 2;
  } catch {
    // Avoid accidentally echoing malformed export rows containing customer data.
    console.error('Cannot audit export. Check the path, JSON format, and unique MongoDB _id values.');
    process.exitCode = 1;
  }
}
