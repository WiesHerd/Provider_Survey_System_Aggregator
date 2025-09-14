# 📋 **Product Requirements Document (PRD)**
## **Advanced Practice Provider (APP) Data Separation Implementation**

---

## 🎯 **Executive Summary**

### **Project Overview**
Implement a comprehensive separation of Advanced Practice Provider (APP) data processing from Physician data processing in the Survey Aggregator application, creating two distinct but integrated workflows while maintaining enterprise-grade standards and system integrity.

### **Business Objectives**
- **Dual Provider Support**: Support both Physician and APP data processing workflows
- **Specialized Analytics**: Provide APP-specific analytics and reporting capabilities
- **Data Integrity**: Maintain complete separation of data while preserving system performance
- **User Experience**: Intuitive navigation between provider types without confusion
- **Scalability**: Architecture that can support additional provider types in the future

---

## 🏗️ **System Architecture Overview**

### **Current State Analysis**
The application currently processes all provider data through a single pipeline:
```
Upload → Data Preview → Mapping → Analytics → FMV → Reports
```

### **Target State Architecture**
```
Provider Type Selection → Separate Pipelines → Unified Dashboard
```

---

## 📊 **IndexedDB Structure Design**

### **Current Database Schema**
```typescript
// Current single-provider structure
interface Survey {
  id: string;
  name: string;
  source: string;
  data: SurveyRow[];
  // ... other fields
}

interface SurveyRow {
  specialty: string;
  providerType: string;
  region: string;
  tcc_p25: number;
  // ... other fields
}
```

### **New Dual-Provider Database Schema**
```typescript
// Enhanced schema with provider type separation
interface Survey {
  id: string;
  name: string;
  source: string;
  providerType: 'PHYSICIAN' | 'APP'; // NEW: Provider type classification
  data: SurveyRow[];
  createdAt: Date;
  updatedAt: Date;
  metadata: SurveyMetadata;
}

interface SurveyMetadata {
  totalRows: number;
  specialties: string[];
  regions: string[];
  providerTypes: string[];
  compensationMetrics: string[];
  dataQuality: DataQualityMetrics;
}

// Provider-specific row structures
interface PhysicianSurveyRow extends BaseSurveyRow {
  providerType: 'MD' | 'DO' | 'Resident' | 'Fellow';
  specialty: string;
  subspecialty?: string;
  // Physician-specific fields
  boardCertification?: string;
  fellowship?: string;
}

interface APPSurveyRow extends BaseSurveyRow {
  providerType: 'NP' | 'PA' | 'CRNA' | 'CNS' | 'CNM' | 'Other APP';
  specialty: string;
  certification: string;
  practiceSetting: 'Hospital' | 'Clinic' | 'Private Practice' | 'Academic';
  supervisionLevel: 'Independent' | 'Supervised' | 'Collaborative';
  // APP-specific fields
  billingLevel: 'Incident-to' | 'Independent' | 'Split';
  patientVolume?: number;
}

interface BaseSurveyRow {
  id: string;
  surveyId: string;
  region: string;
  n_orgs: number;
  n_incumbents: number;
  // Compensation fields (provider-agnostic)
  tcc_p25: number;
  tcc_p50: number;
  tcc_p75: number;
  tcc_p90: number;
  wrvu_p25: number;
  wrvu_p50: number;
  wrvu_p75: number;
  wrvu_p90: number;
  cf_p25: number;
  cf_p50: number;
  cf_p75: number;
  cf_p90: number;
}

// Provider-specific mapping structures
interface PhysicianSpecialtyMapping {
  id: string;
  standardizedName: string;
  sourceSpecialties: PhysicianSourceSpecialty[];
  providerType: 'PHYSICIAN';
  createdAt: Date;
  updatedAt: Date;
}

interface APPSpecialtyMapping {
  id: string;
  standardizedName: string;
  sourceSpecialties: APPSourceSpecialty[];
  providerType: 'APP';
  certification: string; // NP, PA, CRNA, etc.
  practiceSetting: string;
  createdAt: Date;
  updatedAt: Date;
}

interface PhysicianSourceSpecialty {
  id: string;
  specialty: string;
  originalName: string;
  surveySource: string;
  mappingId: string;
}

interface APPSourceSpecialty {
  id: string;
  specialty: string;
  originalName: string;
  surveySource: string;
  certification: string;
  practiceSetting: string;
  mappingId: string;
}
```

### **Database Migration Strategy**
1. **Phase 1**: Add `providerType` field to existing surveys
2. **Phase 2**: Migrate existing data to new schema
3. **Phase 3**: Implement provider-specific tables
4. **Phase 4**: Update all services to use new schema

---

## 🧭 **Sidebar Menu Architecture**

### **Current Menu Structure**
```
Getting Started
├── Home
└── Upload Data

Data Mapping
├── Specialties
├── Provider Types
├── Regions
├── Comp Metrics
└── Other Column Mappings

Analytics & Reports
├── Normalized Data
├── Survey Analytics
├── Regional Analytics
├── Custom Reports
└── Fair Market Value
```

### **New Dual-Provider Menu Structure**
```
Getting Started
├── Home
└── Upload Data

Provider Selection
├── Physician Data
└── APP Data

Physician Data Mapping
├── Specialties
├── Provider Types
├── Regions
├── Comp Metrics
└── Other Column Mappings

APP Data Mapping
├── APP Specialties
├── APP Provider Types
├── APP Practice Settings
├── APP Supervision Levels
├── APP Comp Metrics
└── APP Other Mappings

Analytics & Reports
├── Normalized Data
├── Survey Analytics
├── Regional Analytics
├── Custom Reports
└── Fair Market Value

Cross-Provider Analytics
├── Provider Comparison
├── Market Analysis
└── Compensation Trends
```

### **Menu State Management**
```typescript
interface MenuState {
  activeProviderType: 'PHYSICIAN' | 'APP' | 'BOTH';
  currentSection: 'mapping' | 'analytics' | 'reports';
  lastAccessedProvider: 'PHYSICIAN' | 'APP';
}

// Menu visibility logic
const getMenuVisibility = (providerType: 'PHYSICIAN' | 'APP' | 'BOTH') => {
  switch (providerType) {
    case 'PHYSICIAN':
      return {
        showPhysicianMapping: true,
        showAPPMapping: false,
        showCrossProvider: false
      };
    case 'APP':
      return {
        showPhysicianMapping: false,
        showAPPMapping: true,
        showCrossProvider: false
      };
    case 'BOTH':
      return {
        showPhysicianMapping: true,
        showAPPMapping: true,
        showCrossProvider: true
      };
  }
};
```

---

## 🧮 **FMV Calculator Architecture**

### **Current FMV Structure**
```typescript
interface FMVCalculator {
  compareType: 'TCC' | 'wRVUs' | 'CFs';
  filters: FMVFilters;
  marketData: MarketData;
  percentiles: UserPercentiles;
}
```

### **New Dual-Provider FMV Structure**
```typescript
interface FMVCalculator {
  providerType: 'PHYSICIAN' | 'APP';
  compareType: 'TCC' | 'wRVUs' | 'CFs';
  filters: ProviderSpecificFilters;
  marketData: ProviderSpecificMarketData;
  percentiles: ProviderSpecificPercentiles;
}

interface PhysicianFMVFilters extends BaseFMVFilters {
  specialty: string;
  providerType: 'MD' | 'DO' | 'Resident' | 'Fellow';
  region: string;
  year: string;
  surveySource: string;
  // Physician-specific filters
  boardCertification?: string;
  fellowship?: string;
  practiceSetting?: string;
}

interface APPFMVFilters extends BaseFMVFilters {
  specialty: string;
  providerType: 'NP' | 'PA' | 'CRNA' | 'CNS' | 'CNM';
  region: string;
  year: string;
  surveySource: string;
  // APP-specific filters
  certification: string;
  practiceSetting: 'Hospital' | 'Clinic' | 'Private Practice' | 'Academic';
  supervisionLevel: 'Independent' | 'Supervised' | 'Collaborative';
  billingLevel?: 'Incident-to' | 'Independent' | 'Split';
}

interface BaseFMVFilters {
  fte: number;
  aggregationMethod: 'simple' | 'weighted' | 'pure';
}
```

### **FMV Component Architecture**
```typescript
// Main FMV component with provider type routing
const FMVCalculator: React.FC = () => {
  const [providerType, setProviderType] = useState<'PHYSICIAN' | 'APP'>('PHYSICIAN');
  
  return (
    <div className="fmv-calculator">
      <ProviderTypeSelector 
        value={providerType}
        onChange={setProviderType}
      />
      
      {providerType === 'PHYSICIAN' ? (
        <PhysicianFMVCalculator />
      ) : (
        <APPFMVCalculator />
      )}
    </div>
  );
};

// Provider-specific FMV calculators
const PhysicianFMVCalculator: React.FC = () => {
  // Physician-specific FMV logic
  const { filters, marketData, percentiles } = usePhysicianFMVData();
  
  return (
    <div className="physician-fmv">
      <PhysicianFilters filters={filters} />
      <PhysicianResults marketData={marketData} percentiles={percentiles} />
    </div>
  );
};

const APPFMVCalculator: React.FC = () => {
  // APP-specific FMV logic
  const { filters, marketData, percentiles } = useAPPFMVData();
  
  return (
    <div className="app-fmv">
      <APPFilters filters={filters} />
      <APPResults marketData={marketData} percentiles={percentiles} />
    </div>
  );
};
```

---

## 📈 **Analytics Screen Architecture**

### **Current Analytics Structure**
```typescript
interface SurveyAnalytics {
  data: SurveyRow[];
  filters: AnalyticsFilters;
  charts: ChartData[];
  tables: TableData[];
}
```

### **New Dual-Provider Analytics Structure**
```typescript
interface AnalyticsScreen {
  providerType: 'PHYSICIAN' | 'APP' | 'BOTH';
  data: ProviderSpecificData;
  filters: ProviderSpecificFilters;
  charts: ProviderSpecificCharts;
  tables: ProviderSpecificTables;
}

interface ProviderSpecificData {
  physicianData?: PhysicianSurveyRow[];
  appData?: APPSurveyRow[];
  combinedData?: CombinedSurveyRow[];
}

interface CombinedSurveyRow {
  id: string;
  providerType: 'PHYSICIAN' | 'APP';
  specialty: string;
  region: string;
  compensation: CompensationData;
  // Provider-specific fields
  physicianFields?: PhysicianSpecificFields;
  appFields?: APPSpecificFields;
}
```

### **Analytics Component Architecture**
```typescript
const SurveyAnalytics: React.FC = () => {
  const [providerType, setProviderType] = useState<'PHYSICIAN' | 'APP' | 'BOTH'>('PHYSICIAN');
  
  return (
    <div className="survey-analytics">
      <ProviderTypeSelector 
        value={providerType}
        onChange={setProviderType}
        showBothOption={true}
      />
      
      <AnalyticsContent providerType={providerType} />
    </div>
  );
};

const AnalyticsContent: React.FC<{ providerType: 'PHYSICIAN' | 'APP' | 'BOTH' }> = ({ providerType }) => {
  switch (providerType) {
    case 'PHYSICIAN':
      return <PhysicianAnalytics />;
    case 'APP':
      return <APPAnalytics />;
    case 'BOTH':
      return <CombinedAnalytics />;
  }
};
```

---

## 🔄 **Data Normalization Pipeline**

### **Current Normalization Process**
```
Raw Data → Column Mapping → Specialty Mapping → Variable Mapping → Normalized Data
```

### **New Dual-Provider Normalization Process**
```
Raw Data → Provider Detection → Provider-Specific Pipeline → Normalized Data
```

### **Provider Detection Logic**
```typescript
interface ProviderDetectionService {
  detectProviderType(data: RawSurveyData): 'PHYSICIAN' | 'APP' | 'UNKNOWN';
  validateProviderData(data: RawSurveyData, providerType: string): ValidationResult;
  routeToPipeline(data: RawSurveyData, providerType: string): void;
}

const detectProviderType = (data: RawSurveyData): 'PHYSICIAN' | 'APP' | 'UNKNOWN' => {
  // Detection logic based on:
  // 1. Column names (MD, DO vs NP, PA, CRNA)
  // 2. Data patterns (compensation ranges)
  // 3. Specialty names (APP-specific specialties)
  // 4. Provider type values
  
  const providerTypeColumn = data.columns.find(col => 
    col.toLowerCase().includes('provider') || 
    col.toLowerCase().includes('type')
  );
  
  if (providerTypeColumn) {
    const values = data.rows.map(row => row[providerTypeColumn]);
    const uniqueValues = [...new Set(values)];
    
    if (uniqueValues.some(val => ['NP', 'PA', 'CRNA', 'CNS', 'CNM'].includes(val))) {
      return 'APP';
    }
    if (uniqueValues.some(val => ['MD', 'DO', 'Resident', 'Fellow'].includes(val))) {
      return 'PHYSICIAN';
    }
  }
  
  return 'UNKNOWN';
};
```

### **Provider-Specific Normalization**
```typescript
interface NormalizationPipeline {
  normalizePhysicianData(data: RawSurveyData): PhysicianSurveyRow[];
  normalizeAPPData(data: RawSurveyData): APPSurveyRow[];
  normalizeCombinedData(physicianData: PhysicianSurveyRow[], appData: APPSurveyRow[]): CombinedSurveyRow[];
}

const normalizePhysicianData = (data: RawSurveyData): PhysicianSurveyRow[] => {
  return data.rows.map(row => ({
    id: generateId(),
    surveyId: data.surveyId,
    providerType: row.providerType as 'MD' | 'DO' | 'Resident' | 'Fellow',
    specialty: mapPhysicianSpecialty(row.specialty),
    region: mapRegion(row.region),
    // ... other physician-specific mappings
  }));
};

const normalizeAPPData = (data: RawSurveyData): APPSurveyRow[] => {
  return data.rows.map(row => ({
    id: generateId(),
    surveyId: data.surveyId,
    providerType: row.providerType as 'NP' | 'PA' | 'CRNA' | 'CNS' | 'CNM',
    specialty: mapAPPSpecialty(row.specialty),
    certification: row.certification,
    practiceSetting: row.practiceSetting,
    supervisionLevel: row.supervisionLevel,
    region: mapRegion(row.region),
    // ... other APP-specific mappings
  }));
};
```

---

## 🎨 **User Experience Design**

### **Provider Type Selection**
```typescript
interface ProviderTypeSelector {
  value: 'PHYSICIAN' | 'APP' | 'BOTH';
  onChange: (type: 'PHYSICIAN' | 'APP' | 'BOTH') => void;
  showBothOption: boolean;
  context: 'navigation' | 'analytics' | 'fmv';
}

// Visual design for provider type selection
const ProviderTypeSelector: React.FC<ProviderTypeSelectorProps> = ({ value, onChange, showBothOption, context }) => {
  return (
    <div className="provider-type-selector">
      <div className="selector-tabs">
        <button 
          className={`tab ${value === 'PHYSICIAN' ? 'active' : ''}`}
          onClick={() => onChange('PHYSICIAN')}
        >
          <MedicalCrossIcon className="w-5 h-5" />
          Physician Data
        </button>
        <button 
          className={`tab ${value === 'APP' ? 'active' : ''}`}
          onClick={() => onChange('APP')}
        >
          <UserIcon className="w-5 h-5" />
          APP Data
        </button>
        {showBothOption && (
          <button 
            className={`tab ${value === 'BOTH' ? 'active' : ''}`}
            onClick={() => onChange('BOTH')}
          >
            <ChartBarIcon className="w-5 h-5" />
            Combined View
          </button>
        )}
      </div>
    </div>
  );
};
```

### **Navigation State Management**
```typescript
interface NavigationState {
  currentProviderType: 'PHYSICIAN' | 'APP' | 'BOTH';
  lastAccessedProvider: 'PHYSICIAN' | 'APP';
  providerSpecificRoutes: {
    PHYSICIAN: string[];
    APP: string[];
    BOTH: string[];
  };
  breadcrumbs: BreadcrumbItem[];
}

interface BreadcrumbItem {
  label: string;
  path: string;
  providerType: 'PHYSICIAN' | 'APP' | 'BOTH';
}
```

---

## 🚀 **Implementation Phases**

### **Phase 1: Foundation (Weeks 1-2)**
1. **Database Schema Updates**
   - Add provider type fields to existing tables
   - Create provider-specific table structures
   - Implement database migration scripts

2. **Provider Detection Service**
   - Implement provider type detection logic
   - Create validation services
   - Add routing logic for provider-specific pipelines

### **Phase 2: Core Infrastructure (Weeks 3-4)**
1. **Provider-Specific Services**
   - Create PhysicianDataService
   - Create APPDataService
   - Implement provider-specific hooks

2. **Navigation Architecture**
   - Update sidebar menu structure
   - Implement provider type selection
   - Add breadcrumb navigation

### **Phase 3: Mapping Components (Weeks 5-6)**
1. **APP Mapping Components**
   - Create APP specialty mapping
   - Create APP provider type mapping
   - Create APP practice setting mapping
   - Create APP supervision mapping

2. **Provider-Specific Routing**
   - Add APP routes to application
   - Implement route guards
   - Add provider-specific page headers

### **Phase 4: Analytics & FMV (Weeks 7-8)**
1. **Provider-Specific Analytics**
   - Create APP analytics components
   - Implement combined analytics view
   - Add provider comparison features

2. **Provider-Specific FMV**
   - Create APP FMV calculator
   - Implement provider-specific filters
   - Add cross-provider comparison

### **Phase 5: Testing & Optimization (Weeks 9-10)**
1. **Comprehensive Testing**
   - Unit tests for all new components
   - Integration tests for data flow
   - End-to-end testing for user workflows

2. **Performance Optimization**
   - Database query optimization
   - Component rendering optimization
   - Memory usage optimization

---

## 📋 **Success Criteria**

### **Functional Requirements**
- ✅ **Provider Detection**: Automatically detect and route APP vs Physician data
- ✅ **Data Separation**: Complete separation of APP and Physician data processing
- ✅ **Specialized Analytics**: APP-specific analytics and reporting capabilities
- ✅ **Cross-Provider Analysis**: Ability to compare APP and Physician data
- ✅ **Data Integrity**: No data corruption or mixing between provider types

### **Performance Requirements**
- ✅ **Response Time**: < 2 seconds for all data operations
- ✅ **Memory Usage**: < 500MB for large datasets
- ✅ **Database Performance**: < 1 second for complex queries
- ✅ **UI Responsiveness**: < 100ms for user interactions

### **User Experience Requirements**
- ✅ **Intuitive Navigation**: Clear separation between provider types
- ✅ **Consistent UI**: Maintain design consistency across provider types
- ✅ **Error Handling**: Graceful error handling and user feedback
- ✅ **Accessibility**: WCAG 2.1 AA compliance

---

## 🔒 **Risk Mitigation**

### **Technical Risks**
1. **Data Migration**: Risk of data loss during schema migration
   - **Mitigation**: Comprehensive backup and rollback procedures
   
2. **Performance Impact**: Risk of performance degradation with dual pipelines
   - **Mitigation**: Extensive performance testing and optimization
   
3. **Complexity**: Risk of increased system complexity
   - **Mitigation**: Clear documentation and modular architecture

### **User Experience Risks**
1. **Confusion**: Risk of user confusion with dual workflows
   - **Mitigation**: Clear navigation and user training
   
2. **Data Mixing**: Risk of accidentally mixing provider data
   - **Mitigation**: Strong validation and user warnings

---

## 📊 **Metrics & Monitoring**

### **Success Metrics**
- **Data Processing Accuracy**: 99.9% accuracy in provider type detection
- **User Adoption**: 80% of users successfully use both provider workflows
- **Performance**: All operations meet performance requirements
- **Error Rate**: < 0.1% error rate in data processing

### **Monitoring Dashboard**
- Real-time provider type detection accuracy
- Data processing performance metrics
- User workflow completion rates
- Error rates and types

---

This PRD provides a comprehensive roadmap for implementing APP data separation while maintaining enterprise-grade standards and system integrity. Each phase builds upon the previous one, ensuring a stable and scalable implementation.
