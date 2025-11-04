#!/usr/bin/env ts-node

/**
 * CLI script for mapping CSV files from any source
 * 
 * Usage:
 * npx ts-node scripts/map-file.ts \
 *   --in data/gallagher.csv --source Gallagher \
 *   --out data/gallagher.mapped.csv
 */

import * as fs from 'fs';
import * as path from 'path';
import { Command } from 'commander';
import { SpecialtyMappingEngine } from '../src/mapping/engine';
import { RawInput, MappingDecision } from '../src/mapping/types';
import { DEFAULT_MAPPING_CONFIG } from '../src/mapping/config';

// Import source adapters
import { parseGallagherCSV } from '../src/mapping/sourceAdapters/gallagher';
import { parseSullivanCotterCSV } from '../src/mapping/sourceAdapters/sullivancotter';
import { parseMGMACSV } from '../src/mapping/sourceAdapters/mgma';

const program = new Command();

program
  .name('map-file')
  .description('Map specialty names in CSV files to canonical taxonomy')
  .version('1.0.0');

program
  .option('-i, --in <file>', 'Input CSV file path')
  .option('-s, --source <source>', 'Source type (Gallagher, SullivanCotter, MGMA)')
  .option('-o, --out <file>', 'Output CSV file path')
  .option('-c, --config <config>', 'Configuration preset (conservative, aggressive, pediatric, adult)', 'conservative')
  .option('--threshold <number>', 'Minimum confidence threshold', '0.68')
  .option('--verbose', 'Verbose output')
  .action(async (options) => {
    try {
      await mapFile(options);
    } catch (error) {
      console.error('Error:', error);
      process.exit(1);
    }
  });

async function mapFile(options: any) {
  const { in: inputFile, source, out: outputFile, config, threshold, verbose } = options;

  if (!inputFile || !source || !outputFile) {
    console.error('Error: --in, --source, and --out are required');
    process.exit(1);
  }

  if (!fs.existsSync(inputFile)) {
    console.error(`Error: Input file does not exist: ${inputFile}`);
    process.exit(1);
  }

  console.log(`Mapping file: ${inputFile}`);
  console.log(`Source: ${source}`);
  console.log(`Output: ${outputFile}`);
  console.log(`Config: ${config}`);
  console.log(`Threshold: ${threshold}`);

  // Read input file
  const csvContent = fs.readFileSync(inputFile, 'utf-8');
  
  // Parse based on source
  let rawInputs: RawInput[];
  switch (source.toLowerCase()) {
    case 'gallagher':
      rawInputs = parseGallagherCSV(csvContent);
      break;
    case 'sullivancotter':
      rawInputs = parseSullivanCotterCSV(csvContent);
      break;
    case 'mgma':
      rawInputs = parseMGMACSV(csvContent);
      break;
    default:
      console.error(`Error: Unknown source: ${source}`);
      process.exit(1);
  }

  console.log(`Parsed ${rawInputs.length} specialty entries`);

  // Create mapping engine (simplified - in real implementation, load config files)
  const engine = new SpecialtyMappingEngine();
  
  // Map specialties
  const decisions = await engine.mapBatch(rawInputs);
  
  // Generate output CSV
  const outputCsv = generateOutputCSV(decisions, threshold);
  
  // Write output file
  fs.writeFileSync(outputFile, outputCsv);
  
  // Generate statistics
  const stats = generateStatistics(decisions, threshold);
  console.log('\nMapping Statistics:');
  console.log(`Total processed: ${stats.totalProcessed}`);
  console.log(`Auto-decided: ${stats.autoDecided}`);
  console.log(`Undecided: ${stats.undecided}`);
  console.log(`Auto-decide rate: ${stats.autoDecideRate.toFixed(1)}%`);
  console.log(`Average confidence: ${stats.averageConfidence.toFixed(3)}`);
  
  if (verbose) {
    console.log('\nUndecided entries:');
    decisions
      .filter(d => d.decidedCanonicalId === null)
      .forEach(d => {
        console.log(`  ${d.input.rawName} (${d.input.source}) - ${d.notes}`);
      });
  }
  
  console.log(`\nOutput written to: ${outputFile}`);
}

function generateOutputCSV(decisions: MappingDecision[], threshold: number): string {
  const headers = [
    'Source',
    'Raw Name',
    'Canonical ID',
    'Confidence',
    'Status',
    'Top Candidate',
    'Applied Rules',
    'Notes'
  ];
  
  const rows = decisions.map(decision => {
    const status = decision.decidedCanonicalId ? 'DECIDED' : 'UNDECIDED';
    const topCandidate = decision.candidates.length > 0 ? decision.candidates[0].canonicalId : '';
    const appliedRules = decision.appliedRuleIds.join(';');
    
    return [
      decision.input.source,
      `"${decision.input.rawName}"`,
      decision.decidedCanonicalId || '',
      decision.confidence.toFixed(3),
      status,
      topCandidate,
      appliedRules,
      `"${decision.notes || ''}"`
    ].join(',');
  });
  
  return [headers.join(','), ...rows].join('\n');
}

function generateStatistics(decisions: MappingDecision[], threshold: number) {
  const totalProcessed = decisions.length;
  const autoDecided = decisions.filter(d => d.decidedCanonicalId !== null).length;
  const undecided = totalProcessed - autoDecided;
  const autoDecideRate = (autoDecided / totalProcessed) * 100;
  const averageConfidence = decisions.reduce((sum, d) => sum + d.confidence, 0) / totalProcessed;
  
  return {
    totalProcessed,
    autoDecided,
    undecided,
    autoDecideRate,
    averageConfidence
  };
}

// Run the CLI
if (require.main === module) {
  program.parse();
}
