/**
 * Gemini API Service for Specialty Auto-Mapping
 * 
 * EXPERIMENTAL: This service uses Google Gemini API to assist with specialty mapping.
 * It handles the complexities of pediatric vs adult specialties and different naming
 * standards between MGMA, SullivanCotter, and Gallagher.
 * 
 * This is a test/experimental feature that does not disrupt the main mapping engine.
 */

export interface GeminiMappingRequest {
  sourceSpecialty: string;
  surveySource: 'MGMA' | 'SullivanCotter' | 'Gallagher';
  context?: {
    providerType?: 'PHYSICIAN' | 'APP';
    existingMappings?: Array<{ source: string; standardized: string }>;
  };
}

export interface GeminiMappingResponse {
  suggestedMapping: string;
  confidence: number;
  reasoning: string;
  domain?: 'ADULT' | 'PEDIATRIC' | 'APP_OTHER';
  alternatives?: Array<{ name: string; confidence: number }>;
}

export interface GeminiBatchRequest {
  specialties: Array<{
    sourceSpecialty: string;
    surveySource: 'MGMA' | 'SullivanCotter' | 'Gallagher';
  }>;
}

export interface GeminiBatchResponse {
  mappings: Array<{
    sourceSpecialty: string;
    suggestedMapping: string;
    confidence: number;
    reasoning: string;
  }>;
  errors?: Array<{ specialty: string; error: string }>;
}

class GeminiMappingService {
  private apiKey: string | null = null;
  // Using gemini-1.5-pro-002 (latest stable) - gemini-pro was deprecated
  private baseUrl = 'https://generativelanguage.googleapis.com/v1/models/gemini-1.5-pro-002:generateContent';

  constructor() {
    // Get API key from environment variable
    this.apiKey = process.env.REACT_APP_GEMINI_API_KEY || null;
    
    if (!this.apiKey) {
      console.warn('⚠️ Gemini API key not found. Set REACT_APP_GEMINI_API_KEY in .env.local');
    }
  }

  /**
   * Check if Gemini API is configured
   */
  isConfigured(): boolean {
    return this.apiKey !== null && this.apiKey.length > 0;
  }

  /**
   * Map a single specialty using Gemini API
   */
  async mapSpecialty(request: GeminiMappingRequest): Promise<GeminiMappingResponse> {
    if (!this.isConfigured()) {
      throw new Error('Gemini API key not configured. Please set REACT_APP_GEMINI_API_KEY in .env.local');
    }

    try {
      const prompt = this.buildPrompt(request);
      
      const response = await fetch(`${this.baseUrl}?key=${this.apiKey}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [{
            parts: [{
              text: prompt
            }]
          }],
          generationConfig: {
            temperature: 0.3, // Lower temperature for more consistent, factual responses
            topK: 40,
            topP: 0.95,
            maxOutputTokens: 1024,
          }
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const errorMessage = errorData.error?.message || response.statusText;
        
        // Provide more helpful error messages
        if (response.status === 400 && errorMessage.includes('API key')) {
          throw new Error(`Invalid API key. Please verify your REACT_APP_GEMINI_API_KEY in .env.local and ensure the Gemini API is enabled in Google Cloud Console.`);
        }
        
        if (response.status === 403) {
          throw new Error(`API access denied. Please check: 1) Gemini API is enabled in Google Cloud Console, 2) API key has proper permissions, 3) Billing is enabled for your project.`);
        }
        
        if (response.status === 429) {
          throw new Error(`Rate limit exceeded. Please try again in a moment.`);
        }
        
        throw new Error(`Gemini API error: ${response.status} - ${errorMessage}`);
      }

      const data = await response.json();
      
      if (!data.candidates || !data.candidates[0]?.content?.parts?.[0]?.text) {
        throw new Error('Invalid response format from Gemini API');
      }

      const responseText = data.candidates[0].content.parts[0].text;
      return this.parseResponse(responseText, request);
      
    } catch (error) {
      console.error('🔍 Gemini mapping error:', error);
      throw error;
    }
  }

  /**
   * Map multiple specialties in batch
   */
  async mapBatch(request: GeminiBatchRequest): Promise<GeminiBatchResponse> {
    if (!this.isConfigured()) {
      throw new Error('Gemini API key not configured');
    }

    const results: GeminiBatchResponse = {
      mappings: [],
      errors: []
    };

    // Process in smaller batches to avoid rate limits
    const batchSize = 5;
    for (let i = 0; i < request.specialties.length; i += batchSize) {
      const batch = request.specialties.slice(i, i + batchSize);
      
      for (const specialty of batch) {
        try {
          const mapping = await this.mapSpecialty({
            sourceSpecialty: specialty.sourceSpecialty,
            surveySource: specialty.surveySource
          });
          
          results.mappings.push({
            sourceSpecialty: specialty.sourceSpecialty,
            suggestedMapping: mapping.suggestedMapping,
            confidence: mapping.confidence,
            reasoning: mapping.reasoning
          });
          
          // Small delay to avoid rate limits
          await new Promise(resolve => setTimeout(resolve, 200));
        } catch (error) {
          results.errors?.push({
            specialty: specialty.sourceSpecialty,
            error: error instanceof Error ? error.message : 'Unknown error'
          });
        }
      }
    }

    return results;
  }

  /**
   * Build the prompt for Gemini API
   */
  private buildPrompt(request: GeminiMappingRequest): string {
    const { sourceSpecialty, surveySource, context } = request;
    
    return `You are a medical specialty mapping expert helping to standardize specialty names across different survey sources (MGMA, SullivanCotter, Gallagher).

CRITICAL RULES:
1. **Domain Separation**: NEVER mix Adult and Pediatric specialties. If a specialty contains "Pediatric", "Peds", "Child", or similar terms, it MUST be mapped to a pediatric specialty. Adult specialties should NEVER include pediatric terms.
2. **Naming Standards**: Different survey sources use different naming conventions:
   - MGMA: Often uses full names like "Cardiology - Interventional"
   - SullivanCotter: May use abbreviations or different formatting
   - Gallagher: May have variations in naming
3. **Preserve Subspecialties**: If the source specialty is a subspecialty (e.g., "Interventional Cardiology"), map it to the appropriate subspecialty, not just the parent specialty.
4. **Provider Type Awareness**: Consider if this is for PHYSICIAN or APP (Advanced Practice Provider) when relevant.

Source Specialty: "${sourceSpecialty}"
Survey Source: ${surveySource}
${context?.providerType ? `Provider Type: ${context.providerType}` : ''}

${context?.existingMappings && context.existingMappings.length > 0 ? `
Existing Mappings (for context):
${context.existingMappings.map(m => `  - "${m.source}" → "${m.standardized}"`).join('\n')}
` : ''}

Please provide a JSON response with the following structure:
{
  "suggestedMapping": "Standardized specialty name (e.g., 'Interventional Cardiology' or 'Pediatric Cardiology')",
  "confidence": 0.0-1.0,
  "reasoning": "Brief explanation of why this mapping was chosen, including domain (Adult/Pediatric) considerations",
  "domain": "ADULT" | "PEDIATRIC" | "APP_OTHER",
  "alternatives": [
    {"name": "Alternative mapping option", "confidence": 0.0-1.0}
  ]
}

IMPORTANT: 
- Return ONLY valid JSON, no additional text
- Confidence should reflect how certain you are (0.9+ for very clear matches, 0.7-0.9 for good matches, <0.7 for uncertain)
- Always consider the domain (Adult vs Pediatric) in your reasoning
- If uncertain, provide alternatives with lower confidence scores`;
  }

  /**
   * Parse Gemini API response
   */
  private parseResponse(responseText: string, request: GeminiMappingRequest): GeminiMappingResponse {
    try {
      // Try to extract JSON from the response (may have markdown code blocks)
      let jsonText = responseText.trim();
      
      // Remove markdown code blocks if present
      if (jsonText.startsWith('```')) {
        jsonText = jsonText.replace(/^```(?:json)?\n?/g, '').replace(/\n?```$/g, '');
      }
      
      // Try to find JSON object in the response
      const jsonMatch = jsonText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        jsonText = jsonMatch[0];
      }
      
      const parsed = JSON.parse(jsonText);
      
      return {
        suggestedMapping: parsed.suggestedMapping || request.sourceSpecialty,
        confidence: Math.max(0, Math.min(1, parsed.confidence || 0.5)),
        reasoning: parsed.reasoning || 'No reasoning provided',
        domain: parsed.domain || 'ADULT',
        alternatives: parsed.alternatives || []
      };
    } catch (error) {
      console.warn('Failed to parse Gemini response as JSON, using fallback:', error);
      
      // Fallback: try to extract mapping from text
      const lines = responseText.split('\n');
      const mappingLine = lines.find(line => 
        line.toLowerCase().includes('suggestedmapping') || 
        line.toLowerCase().includes('mapping:') ||
        line.toLowerCase().includes('standardized')
      );
      
      return {
        suggestedMapping: mappingLine 
          ? mappingLine.split(':')[1]?.trim().replace(/['"]/g, '') || request.sourceSpecialty
          : request.sourceSpecialty,
        confidence: 0.5,
        reasoning: 'Failed to parse structured response',
        domain: 'ADULT',
        alternatives: []
      };
    }
  }
}

// Export singleton instance
export const geminiMappingService = new GeminiMappingService();
