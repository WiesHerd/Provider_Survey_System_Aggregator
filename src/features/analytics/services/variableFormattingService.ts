/**
 * Analytics Feature - Variable Formatting Service
 * 
 * Service for applying user-defined formatting rules to variables.
 * Provides flexible formatting that can adapt to new survey formats.
 */

interface VariableFormattingRule {
  variableName: string;
  displayName: string;
  formatType: 'currency' | 'number' | 'percentage';
  decimals: number;
  showCurrency: boolean;
  enabled: boolean;
}

interface FormattingOptions {
  rules: VariableFormattingRule[];
  fallbackToDefault?: boolean;
}

export class VariableFormattingService {
  private static instance: VariableFormattingService;
  private formattingRules: VariableFormattingRule[] = [];
  private readonly STORAGE_KEY = 'analytics_variable_formatting_rules';

  static getInstance(): VariableFormattingService {
    if (!VariableFormattingService.instance) {
      VariableFormattingService.instance = new VariableFormattingService();
    }
    return VariableFormattingService.instance;
  }

  /**
   * Load formatting rules from localStorage
   */
  async loadRules(): Promise<VariableFormattingRule[]> {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      if (stored) {
        this.formattingRules = JSON.parse(stored);
        console.log('✅ Loaded variable formatting rules from localStorage');
      }
      return this.formattingRules;
    } catch (error) {
      console.warn('Failed to load formatting rules:', error);
      return [];
    }
  }

  /**
   * Save formatting rules to localStorage
   */
  async saveRules(rules: VariableFormattingRule[]): Promise<void> {
    try {
      this.formattingRules = rules;
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(rules));
      console.log('✅ Saved variable formatting rules to localStorage');
    } catch (error) {
      console.warn('Failed to save formatting rules:', error);
    }
  }

  /**
   * Get formatting rule for a specific variable
   */
  getRuleForVariable(variableName: string): VariableFormattingRule | null {
    return this.formattingRules.find(rule => 
      rule.variableName === variableName && rule.enabled
    ) || null;
  }

  /**
   * Format a variable value using the appropriate rule
   */
  formatVariableValue(
    value: number, 
    variableName: string, 
    options: FormattingOptions
  ): string {
    if (value === 0 || isNaN(value)) {
      return '***';
    }

    // Try to find a specific rule for this variable
    // Use case-insensitive matching to handle variations
    const rule = options.rules.find(r => {
      const ruleVarLower = r.variableName.toLowerCase().trim();
      const inputVarLower = variableName.toLowerCase().trim();
      return ruleVarLower === inputVarLower && r.enabled;
    });

    if (rule) {
      console.log('✅ Found formatting rule for:', variableName, rule);
      return this.applyFormattingRule(value, rule);
    }

    // Fallback to default formatting if enabled
    if (options.fallbackToDefault !== false) {
      return this.applyDefaultFormatting(value, variableName);
    }

    return value.toString();
  }

  /**
   * Apply a specific formatting rule to a value
   */
  private applyFormattingRule(value: number, rule: VariableFormattingRule): string {
    const { formatType, decimals, showCurrency } = rule;

    switch (formatType) {
      case 'currency':
        return new Intl.NumberFormat('en-US', {
          style: 'currency',
          currency: 'USD',
          minimumFractionDigits: decimals,
          maximumFractionDigits: decimals,
        }).format(value);

      case 'percentage':
        return new Intl.NumberFormat('en-US', {
          style: 'percent',
          minimumFractionDigits: decimals,
          maximumFractionDigits: decimals,
        }).format(value / 100); // Convert from decimal to percentage

      case 'number':
      default:
        if (showCurrency) {
          return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
            minimumFractionDigits: decimals,
            maximumFractionDigits: decimals,
          }).format(value);
        }
        
        return new Intl.NumberFormat('en-US', {
          minimumFractionDigits: decimals,
          maximumFractionDigits: decimals,
        }).format(value);
    }
  }

  /**
   * Apply default formatting based on variable name patterns
   */
  private applyDefaultFormatting(value: number, variableName: string): string {
    const lower = variableName.toLowerCase();
    
    // Currency detection
    if (lower.match(/tcc|compensation|salary|cash|pay|base|cf$/)) {
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      }).format(value);
    }
    
    // Percentage detection
    if (lower.includes('percentage') || lower.includes('percent') || lower.includes('ratio')) {
      return new Intl.NumberFormat('en-US', {
        style: 'percent',
        minimumFractionDigits: 1,
        maximumFractionDigits: 1,
      }).format(value / 100);
    }
    
    // Ratio detection (like TCC per Work RVU)
    if (lower.includes('per') || lower.includes('rate') || lower.includes('cf')) {
      return new Intl.NumberFormat('en-US', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }).format(value);
    }
    
    // Default number formatting
    return new Intl.NumberFormat('en-US', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  }

  /**
   * Get display name for a variable
   */
  getDisplayName(variableName: string): string {
    const rule = this.getRuleForVariable(variableName);
    if (rule) {
      return rule.displayName;
    }
    
    return this.formatVariableDisplayName(variableName);
  }

  /**
   * Format variable display name
   */
  private formatVariableDisplayName(variableName: string): string {
    return variableName
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ')
      .replace(/\bTcc\b/g, 'TCC')
      .replace(/\bRvu\b/g, 'RVU')
      .replace(/\bRvus\b/g, 'RVUs')
      .replace(/\bAsa\b/g, 'ASA')
      .replace(/\bCf\b/g, 'CF')
      .replace(/\bCfs\b/g, 'CFs');
  }

  /**
   * Create default rules for a set of variables
   */
  createDefaultRules(variables: string[]): VariableFormattingRule[] {
    return variables.map(variable => ({
      variableName: variable,
      displayName: this.formatVariableDisplayName(variable),
      formatType: this.detectFormatType(variable),
      decimals: this.detectDecimals(variable),
      showCurrency: this.detectCurrency(variable),
      enabled: true
    }));
  }

  /**
   * Detect format type for a variable
   */
  private detectFormatType(variableName: string): 'currency' | 'number' | 'percentage' {
    const lower = variableName.toLowerCase();
    
    if (lower.includes('percentage') || lower.includes('percent') || lower.includes('ratio')) {
      return 'percentage';
    }
    
    if (lower.match(/tcc|compensation|salary|cash|pay|base|cf$/)) {
      return 'currency';
    }
    
    return 'number';
  }

  /**
   * Detect number of decimals for a variable
   */
  private detectDecimals(variableName: string): number {
    const lower = variableName.toLowerCase();
    
    if (lower.includes('per') || lower.includes('rate') || lower.includes('cf')) {
      return 2; // Ratios and rates need 2 decimals
    }
    
    if (lower.includes('percentage') || lower.includes('percent')) {
      return 1; // Percentages need 1 decimal
    }
    
    return 0; // Default to no decimals
  }

  /**
   * Detect if variable should show currency
   */
  private detectCurrency(variableName: string): boolean {
    const lower = variableName.toLowerCase();
    // Include CF/Conversion Factor patterns - they're currency values
    return lower.match(/tcc|compensation|salary|cash|pay|base|cf$|conversion_factor|per.*rvu/) !== null;
  }

  /**
   * Get all current formatting rules
   */
  getRules(): VariableFormattingRule[] {
    return [...this.formattingRules];
  }

  /**
   * Clear all formatting rules
   */
  clearRules(): void {
    this.formattingRules = [];
    localStorage.removeItem(this.STORAGE_KEY);
  }
}
