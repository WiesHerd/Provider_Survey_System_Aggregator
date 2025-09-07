#!/usr/bin/env ts-node

/**
 * Script to create initial specialty mappings for future survey uploads
 * 
 * Usage:
 * npx ts-node scripts/create-initial-mappings.ts
 * 
 * This will help you create mappings that will be automatically applied
 * to future survey uploads.
 */

import { ISpecialtyMapping } from '../src/types/specialty';

interface MappingInput {
  standardizedName: string;
  sourceSpecialties: Array<{
    specialty: string;
    surveySource: 'MGMA' | 'SullivanCotter' | 'Gallagher' | string;
  }>;
}

// Example mappings you can customize
const exampleMappings: MappingInput[] = [
  {
    standardizedName: 'Pulmonology',
    sourceSpecialties: [
      { specialty: 'Pulmonology', surveySource: 'MGMA' },
      { specialty: 'Pulmonary Medicine', surveySource: 'SullivanCotter' },
      { specialty: 'Pulmonary Disease', surveySource: 'Gallagher' }
    ]
  },
  {
    standardizedName: 'Gastroenterology',
    sourceSpecialties: [
      { specialty: 'Gastroenterology', surveySource: 'MGMA' },
      { specialty: 'GI Medicine', surveySource: 'SullivanCotter' },
      { specialty: 'Gastroenterology', surveySource: 'Gallagher' }
    ]
  },
  {
    standardizedName: 'Urology',
    sourceSpecialties: [
      { specialty: 'Urology', surveySource: 'MGMA' },
      { specialty: 'Urological Surgery', surveySource: 'SullivanCotter' },
      { specialty: 'Urology', surveySource: 'Gallagher' }
    ]
  },
  {
    standardizedName: 'Ophthalmology',
    sourceSpecialties: [
      { specialty: 'Ophthalmology', surveySource: 'MGMA' },
      { specialty: 'Eye Surgery', surveySource: 'SullivanCotter' },
      { specialty: 'Ophthalmology', surveySource: 'Gallagher' }
    ]
  },
  {
    standardizedName: 'Otolaryngology',
    sourceSpecialties: [
      { specialty: 'Otolaryngology', surveySource: 'MGMA' },
      { specialty: 'ENT', surveySource: 'SullivanCotter' },
      { specialty: 'Otolaryngology', surveySource: 'Gallagher' }
    ]
  }
];

function generateMapping(input: MappingInput, id: number): ISpecialtyMapping {
  return {
    id: id.toString(),
    standardizedName: input.standardizedName,
    sourceSpecialties: input.sourceSpecialties.map((source, index) => ({
      id: `${id}${String.fromCharCode(97 + index)}`, // a, b, c, etc.
      specialty: source.specialty,
      originalName: source.specialty,
      surveySource: source.surveySource,
      frequency: 1,
      mappingId: id.toString()
    })),
    createdAt: new Date(),
    updatedAt: new Date()
  };
}

function generateMappingsCode(mappings: ISpecialtyMapping[]): string {
  const code = mappings.map(mapping => {
    const sourceSpecialtiesCode = mapping.sourceSpecialties.map(source => 
      `      {
        id: '${source.id}',
        specialty: '${source.specialty}',
        originalName: '${source.specialty}',
        surveySource: '${source.surveySource}',
        frequency: 1,
        mappingId: '${source.mappingId}'
      }`
    ).join(',\n');

    return `  {
    id: '${mapping.id}',
    standardizedName: '${mapping.standardizedName}',
    sourceSpecialties: [
${sourceSpecialtiesCode}
    ],
    createdAt: new Date(),
    updatedAt: new Date()
  }`;
  }).join(',\n');

  return `export const additionalSpecialtyMappings: ISpecialtyMapping[] = [
${code}
];`;
}

async function main() {
  console.log('🏗️  Creating Initial Specialty Mappings');
  console.log('=====================================\n');

  // Generate mappings from examples
  const mappings = exampleMappings.map((input, index) => 
    generateMapping(input, 100 + index) // Start from ID 100 to avoid conflicts
  );

  // Generate the code
  const code = generateMappingsCode(mappings);

  console.log('📝 Generated mappings code:');
  console.log('============================');
  console.log(code);
  console.log('\n');

  console.log('📋 Instructions:');
  console.log('================');
  console.log('1. Copy the generated code above');
  console.log('2. Add it to src/data/initialSpecialtyMappings.ts');
  console.log('3. Or create a new file src/data/additionalSpecialtyMappings.ts');
  console.log('4. Import and merge with the existing mappings');
  console.log('\n');

  console.log('🎯 These mappings will be automatically applied to future survey uploads!');
  console.log('   - They will appear in the "Mapped Specialties" tab');
  console.log('   - New surveys with matching specialty names will be auto-mapped');
  console.log('   - You can modify them later through the UI');
}

if (require.main === module) {
  main().catch(console.error);
}

export { generateMapping, generateMappingsCode };
