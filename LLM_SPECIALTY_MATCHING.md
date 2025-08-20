# LLM-Based Specialty Matching System

## Overview

The new LLM-based specialty matching system uses intelligent semantic similarity to group and match similar medical specialties. This replaces the previous fuzzy matching approach with a more sophisticated system that can understand context and meaning.

## How It Works

### 1. **Semantic Embeddings**
- Uses Hugging Face's free sentence-transformers API
- Converts specialty names into numerical vectors (embeddings)
- Captures semantic meaning, not just text similarity

### 2. **Intelligent Grouping**
- Groups specialties based on semantic similarity
- Automatically identifies related variations (e.g., "allergy and immunology" vs "allergy immunology")
- Uses cosine similarity to measure how related specialties are

### 3. **Fallback System**
- If the API is unavailable, falls back to local word-based similarity
- Ensures the system always works, even without internet access
- Maintains backward compatibility

## Key Benefits

### ✅ **Smarter Matching**
- Understands medical terminology and abbreviations
- Groups "allergy and immunology", "allergy immunology", "allergy/immunology" together
- Recognizes "cardiology" and "cardiovascular" as related

### ✅ **Free to Use**
- Uses Hugging Face's free inference API
- No API key required for basic functionality
- Optional API key for higher rate limits

### ✅ **Robust & Reliable**
- Automatic fallback if API fails
- Handles network issues gracefully
- Works offline with local similarity

### ✅ **Enterprise-Grade**
- Handles large datasets efficiently
- Batch processing for performance
- Configurable confidence thresholds

## Usage

### Basic Usage

```typescript
import { LLMSpecialtyMatchingService } from './src/shared/utils/llmSpecialtyMatching';

const service = new LLMSpecialtyMatchingService();

// Match and group specialties
const result = await service.matchAndGroupSpecialties([
  'allergy and immunology',
  'allergy immunology',
  'cardiology',
  'cardiovascular'
]);

console.log('Groups:', result.groups);
console.log('Matches:', result.matches);
```

### Advanced Configuration

```typescript
const service = new LLMSpecialtyMatchingService({
  provider: 'huggingface',
  apiKey: 'your-api-key', // Optional
  similarityThreshold: 0.7,
  maxRetries: 3
});
```

### Testing

```typescript
// In browser console
window.testLLMMatching.testAllergyImmunologyMatching();
window.testLLMMatching.testVariousSpecialties();
window.testLLMMatching.runAllTests();
```

## API Providers

### 1. **Hugging Face (Default)**
- **Model**: `sentence-transformers/all-MiniLM-L6-v2`
- **Cost**: Free
- **Rate Limit**: 30,000 requests/month
- **Features**: High-quality semantic embeddings

### 2. **Local Fallback**
- **Method**: Word frequency vectors
- **Cost**: Free
- **Availability**: Always works
- **Features**: Basic similarity matching

## Configuration Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `provider` | `LLMProvider` | `'huggingface'` | API provider to use |
| `apiKey` | `string` | `undefined` | Optional API key |
| `similarityThreshold` | `number` | `0.7` | Minimum similarity for grouping |
| `maxRetries` | `number` | `3` | Maximum API retry attempts |

## Examples

### Allergy/Immunology Grouping

**Input:**
```typescript
[
  'allergy and immunology',
  'allergy immunology',
  'allergy/immunology',
  'allergy & immunology'
]
```

**Output:**
```typescript
{
  groupName: 'Allergy Immunology',
  specialties: [
    'allergy and immunology',
    'allergy immunology', 
    'allergy/immunology',
    'allergy & immunology'
  ],
  confidence: 0.95
}
```

### Cardiology Variations

**Input:**
```typescript
[
  'cardiology',
  'cardiovascular',
  'cardiac',
  'heart'
]
```

**Output:**
```typescript
{
  groupName: 'Cardiology',
  specialties: [
    'cardiology',
    'cardiovascular',
    'cardiac',
    'heart'
  ],
  confidence: 0.88
}
```

## Integration with Auto-Mapping

The LLM system is automatically integrated into the auto-mapping feature:

1. **Auto-Map Specialties** button now uses LLM-based grouping
2. **Confidence Threshold** controls how strict the matching is
3. **Fuzzy Matching** toggle enables/disables semantic similarity
4. **Existing Mappings** are considered when making suggestions

## Performance

- **Small datasets** (< 100 specialties): ~1-2 seconds
- **Medium datasets** (100-1000 specialties): ~5-10 seconds  
- **Large datasets** (> 1000 specialties): ~15-30 seconds
- **Fallback mode**: Always < 1 second

## Troubleshooting

### API Errors
- System automatically falls back to local similarity
- Check network connection if API calls fail
- Verify API key if using one

### Low Confidence Scores
- Lower the `similarityThreshold` (default: 0.7)
- Enable fuzzy matching in auto-mapping config
- Check that specialty names are properly formatted

### Performance Issues
- Reduce `maxRetries` for faster failure detection
- Use batch processing for large datasets
- Consider using local fallback for offline scenarios

## Future Enhancements

- **Custom Models**: Support for domain-specific medical models
- **Learning**: System learns from user corrections over time
- **Caching**: Embedding cache for improved performance
- **Multi-language**: Support for non-English specialty names

## Migration from Old System

The new system is **fully backward compatible**:

1. **No code changes required** - existing auto-mapping works
2. **Gradual improvement** - better results with same interface
3. **Fallback protection** - old system still available if needed
4. **Configurable** - can disable LLM features if desired

## Support

For issues or questions:
1. Check browser console for error messages
2. Test with `window.testLLMMatching.runAllTests()`
3. Verify network connectivity for API calls
4. Review configuration settings
