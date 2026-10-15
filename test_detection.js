/** 実際のバイト入力で全機種の自動判別を検証する。 */
import assert from 'node:assert/strict';
import { detectSpecFromCSV } from './src/js/services/csv-parser.js';
import { getAllSpecs } from './src/js/models/spec-registry.js';
for (const spec of getAllSpecs()) {
  const fields = spec.hasHeader === false
    ? Array(spec.expectedColumns).fill('0')
    : spec.columns.map(c => c.label);
  const bytes = new TextEncoder().encode(fields.join(',') + '\r\n');
  assert.equal(detectSpecFromCSV(bytes), spec.id);
}
console.log('All model detection tests passed');
