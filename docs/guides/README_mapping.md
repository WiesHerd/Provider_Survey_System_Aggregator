# Specialty Auto-Mapper

A deterministic, auditable specialty mapping system that harmonizes specialties across Gallagher, SullivanCotter, MGMA, and future sources.

## 🎯 Core Principles

- **Domain Barrier**: Adult ↔ Pediatric are hard partitions
- **Parent Bucket First**: Cardiology, Neurology, Surgery, etc.
- **Subspecialty Preservation**: interventional, transplant, EP, etc.
- **Fuzzy ONLY within same (domain + parent) bucket**
- **Explainability**: Every decision includes rules hit, tokens matched, candidates & scores
- **Config-driven**: Add/modify via YAML; engine remains unchanged

## 📁 File Structure

```
src/mapping/
├── types.ts                    # Core TypeScript types
├── config.schema.json          # JSON schema for validation
├── taxonomy.yaml               # Canonical specialty taxonomy
├── synonyms.yaml               # Domain hints, parent aliases, subspecialty tokens
├── rules.base.yaml             # Global rules and regexes
├── rules.pediatric.yaml        # Pediatric-specific rules
├── rules.mgma.yaml             # MGMA-specific overrides
├── engine.ts                   # Core mapping engine
├── config.ts                   # Thresholds, weights, feature flags
├── overrides.json              # Human-approved mappings (append-only)
├── sourceAdapters/             # Source-specific parsers
│   ├── template.ts
│   ├── gallagher.ts
│   ├── sullivancotter.ts
│   └── mgma.ts
└── eval/                       # Testing and evaluation
    ├── testcases.json          # ≥150 test cases
    └── engine.spec.ts          # Unit tests

scripts/
└── map-file.ts                 # CLI for mapping files
```

## 🚀 Quick Start

### 1. Map a CSV File

```bash
npx ts-node scripts/map-file.ts \
  --in data/gallagher.csv --source Gallagher \
  --out data/gallagher.mapped.csv
```

### 2. Use in Your App

```typescript
import { SpecialtyMappingEngine } from './src/mapping/engine';
import { RawInput } from './src/mapping/types';

const engine = new SpecialtyMappingEngine();
const input: RawInput = {
  source: 'MGMA',
  rawName: 'Cardiology: Interventional'
};

const decision = await engine.mapSpecialty(input);
console.log(decision.decidedCanonicalId); // "CARD-INTERVENTIONAL"
```

## ⚙️ Configuration

### Thresholds & Weights

```typescript
import { getConfig } from './src/mapping/config';

// Conservative (higher threshold, fewer auto-decisions)
const config = getConfig('conservative');

// Aggressive (lower threshold, more auto-decisions)
const config = getConfig('aggressive');

// Custom configuration
const customConfig = createCustomConfig({
  minDecisionThreshold: 0.75,
  weights: {
    token: 0.50,
    synonym: 0.25,
    charSim: 0.15,
    negative: -0.40,
    sourceHint: 0.05
  }
});
```

### Feature Flags

```typescript
const config = {
  featureFlags: {
    useJaroWinkler: true,    // Use Jaro-Winkler similarity
    useTokenSetRatio: false  // Use token set ratio
  }
};
```

## 📊 Mapping Process

1. **Normalize**: lowercase, trim, collapse whitespace, standardize separators
2. **Infer Domain**: use domain hints + metadata; default ADULT if none
3. **Parent Bucket**: resolve to exactly one parent using synonyms + regex hints
4. **Negative Guards**: run negative tokens to block cross-parent collisions
5. **Hard Maps**: evaluate rules in order (pediatric → source → base)
6. **Candidate Set**: all canonicals with same (domain + parent)
7. **Scoring**: weighted combination of token overlap, synonyms, char similarity
8. **Decision**: pick top candidate if ≥ threshold; otherwise undecided

## 🔧 Adding a New Survey Source

### 1. Create Source Adapter

```typescript
// src/mapping/sourceAdapters/newsurvey.ts
import { RawInput } from '../types';
import { parseCSVContent } from './template';

export function parseNewSurveyCSV(csvContent: string): RawInput[] {
  return parseCSVContent(csvContent, 'NewSurvey');
}
```

### 2. Add Source-Specific Rules (Optional)

```yaml
# src/mapping/rules.newsurvey.yaml
version: "1.0.0"
hardMaps:
  - id: "NEWSURVEY_SPECIAL_CASE"
    pattern: ".*special.*pattern.*"
    canonicalId: "SPECIAL-CANONICAL-ID"
    confidence: 0.95
```

### 3. Update CLI

```typescript
// scripts/map-file.ts
import { parseNewSurveyCSV } from '../src/mapping/sourceAdapters/newsurvey';

case 'newsurvey':
  rawInputs = parseNewSurveyCSV(csvContent);
  break;
```

### 4. Run Mapping

```bash
npx ts-node scripts/map-file.ts \
  --in data/newsurvey.csv --source NewSurvey \
  --out data/newsurvey.mapped.csv
```

## 🧪 Testing

### Run Unit Tests

```bash
npm test src/mapping/eval/engine.spec.ts
```

### Add Test Cases

```json
{
  "id": "TC_NEW_001",
  "input": {
    "source": "NewSurvey",
    "rawName": "Specialty Name"
  },
  "expectedCanonicalId": "EXPECTED-ID",
  "expectedConfidence": 0.95,
  "description": "Test case description",
  "tags": ["tag1", "tag2"]
}
```

## 📈 Evaluation

### Auto-Decide Rate

Target: ≥95% on seed test set while keeping ambiguous rows below threshold.

### Confusion Report

After mapping, generate a report of all undecided entries:

```typescript
const confusionReport = decisions
  .filter(d => d.decidedCanonicalId === null)
  .map(d => ({
    input: d.input,
    decision: d,
    parent: inferParent(d.input.rawName),
    domain: inferDomain(d.input.rawName)
  }));
```

## 🔄 Versioning

All configuration files include version numbers:

- `taxonomy.yaml`: `version: "1.0.0"`
- `synonyms.yaml`: `version: "1.0.0"`
- `rules.*.yaml`: `version: "1.0.0"`

When updating:
1. Increment version number
2. Update test cases
3. Run evaluation suite
4. Document changes

## 🛠️ Maintenance

### Adding Overrides

```bash
npx ts-node scripts/add-override.ts \
  --pattern ".*special.*pattern.*" \
  --canonical "SPECIAL-ID" \
  --reason "Human-approved mapping"
```

### Updating Taxonomy

1. Edit `taxonomy.yaml`
2. Add new specialties with stable IDs
3. Update synonyms if needed
4. Run tests to ensure no regressions

### Performance Optimization

- Use Jaro-Winkler for better character similarity
- Adjust weights based on evaluation results
- Consider caching for large datasets

## 🚨 Important Notes

- **Never** blend Adult ↔ Pediatric specialties
- **Always** preserve subspecialties (interventional ≠ general)
- **Maintain** stable canonical IDs across versions
- **Validate** all configuration files against schema
- **Test** thoroughly before deploying changes

## 📞 Support

For questions or issues:
1. Check test cases for examples
2. Review configuration files
3. Run evaluation suite
4. Check logs for detailed decision reasoning
