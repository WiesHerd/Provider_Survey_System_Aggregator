// Test the formatting function
const formatSpecialtyForDisplay = (specialty) => {
  if (!specialty) return '';
  
  // Handle common abbreviations and special cases
  const specialCases = {
    'ob': 'OB',
    'gyn': 'GYN',
    'ent': 'ENT',
    'gi': 'GI',
    'ir': 'IR',
    'pmr': 'PM&R',
    'cc': 'CC',
    'icu': 'ICU',
    'er': 'ER',
    'ed': 'ED',
    'id': 'ID',
    'heme': 'Heme',
    'onc': 'Onc',
    'peds': 'Peds',
    'derm': 'Derm',
    'psych': 'Psych',
    'neuro': 'Neuro',
    'ortho': 'Ortho',
    'cardio': 'Cardio',
    'pulm': 'Pulm',
    'neph': 'Neph',
    'endo': 'Endo',
    'rheum': 'Rheum',
    'allergy': 'Allergy',
    'immuno': 'Immuno',
    'path': 'Path',
    'rad': 'Rad',
    'surg': 'Surg',
    'anesth': 'Anesth',
    'em': 'EM',
    'im': 'IM',
    'fm': 'FM'
  };

  // First, handle special cases in parentheses
  let formatted = specialty;
  
  // Handle parentheses content
  formatted = formatted.replace(/\(([^)]+)\)/g, (match, content) => {
    const lowerContent = content.toLowerCase();
    if (specialCases[lowerContent]) {
      return `(${specialCases[lowerContent]})`;
    }
    // Capitalize first letter of each word in parentheses
    return `(${content.split(' ').map((word) => 
      word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
    ).join(' ')})`;
  });

  // Handle main specialty name
  const words = formatted.split(' ');
  const formattedWords = words.map(word => {
    const lowerWord = word.toLowerCase();
    
    // Handle special cases
    if (specialCases[lowerWord]) {
      return specialCases[lowerWord];
    }
    
    // Handle common medical terms
    if (lowerWord === 'and') return '&';
    if (lowerWord === 'with') return 'with';
    if (lowerWord === 'without') return 'without';
    
    // Capitalize first letter, lowercase the rest
    return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
  });

  return formattedWords.join(' ');
};

// Test cases from the image
const testCases = [
  'ent otolaryngology',
  'epilepsy neurology',
  'family medicine',
  'family medicine ambulatory only',
  'gastroenterology advanced endoscopy',
  'gastroenterology general',
  'gastroenterology hepatology',
  'general cardiology non invasive',
  'gi advanced endoscopy',
  'gyn oncology',
  'gynecologic oncology'
];

console.log('Testing specialty formatting:');
testCases.forEach(testCase => {
  const result = formatSpecialtyForDisplay(testCase);
  console.log(`"${testCase}" -> "${result}"`);
});
