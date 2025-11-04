import { ISpecialtyMapping } from '../types/specialty';

export const initialSpecialtyMappings: ISpecialtyMapping[] = [
  {
    id: '1',
    standardizedName: 'Cardiology',
    sourceSpecialties: [
      {
        id: '1a',
        specialty: 'Cardiology',
        originalName: 'Cardiology',
        surveySource: 'MGMA',
        frequency: 1,
        mappingId: '1'
      },
      {
        id: '1b',
        specialty: 'Cardiovascular Disease',
        originalName: 'Cardiovascular Disease',
        surveySource: 'SullivanCotter',
        frequency: 1,
        mappingId: '1'
      }
    ],
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    id: '2',
    standardizedName: 'Family Medicine',
    sourceSpecialties: [
      {
        id: '2a',
        specialty: 'Family Medicine',
        originalName: 'Family Medicine',
        surveySource: 'MGMA',
        frequency: 1,
        mappingId: '2'
      },
      {
        id: '2b',
        specialty: 'Family Practice',
        originalName: 'Family Practice',
        surveySource: 'SullivanCotter',
        frequency: 1,
        mappingId: '2'
      }
    ],
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    id: '3',
    standardizedName: 'Internal Medicine',
    sourceSpecialties: [
      {
        id: '3a',
        specialty: 'Internal Medicine',
        originalName: 'Internal Medicine',
        surveySource: 'MGMA',
        frequency: 1,
        mappingId: '3'
      },
      {
        id: '3b',
        specialty: 'General Internal Medicine',
        originalName: 'General Internal Medicine',
        surveySource: 'SullivanCotter',
        frequency: 1,
        mappingId: '3'
      }
    ],
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    id: '4',
    standardizedName: 'Pediatrics',
    sourceSpecialties: [
      {
        id: '4a',
        specialty: 'Pediatrics',
        originalName: 'Pediatrics',
        surveySource: 'MGMA',
        frequency: 1,
        mappingId: '4'
      },
      {
        id: '4b',
        specialty: 'General Pediatrics',
        originalName: 'General Pediatrics',
        surveySource: 'SullivanCotter',
        frequency: 1,
        mappingId: '4'
      }
    ],
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    id: '5',
    standardizedName: 'Emergency Medicine',
    sourceSpecialties: [
      {
        id: '5a',
        specialty: 'Emergency Medicine',
        originalName: 'Emergency Medicine',
        surveySource: 'MGMA',
        frequency: 1,
        mappingId: '5'
      },
      {
        id: '5b',
        specialty: 'Emergency Room',
        originalName: 'Emergency Room',
        surveySource: 'SullivanCotter',
        frequency: 1,
        mappingId: '5'
      }
    ],
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    id: '6',
    standardizedName: 'Orthopedic Surgery',
    sourceSpecialties: [
      {
        id: '6a',
        specialty: 'Orthopedic Surgery',
        originalName: 'Orthopedic Surgery',
        surveySource: 'MGMA',
        frequency: 1,
        mappingId: '6'
      },
      {
        id: '6b',
        specialty: 'Orthopedics',
        originalName: 'Orthopedics',
        surveySource: 'SullivanCotter',
        frequency: 1,
        mappingId: '6'
      }
    ],
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    id: '7',
    standardizedName: 'Obstetrics and Gynecology',
    sourceSpecialties: [
      {
        id: '7a',
        specialty: 'Obstetrics and Gynecology',
        originalName: 'Obstetrics and Gynecology',
        surveySource: 'MGMA',
        frequency: 1,
        mappingId: '7'
      },
      {
        id: '7b',
        specialty: 'OB/GYN',
        originalName: 'OB/GYN',
        surveySource: 'SullivanCotter',
        frequency: 1,
        mappingId: '7'
      }
    ],
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    id: '8',
    standardizedName: 'Neurology',
    sourceSpecialties: [
      {
        id: '8a',
        specialty: 'Neurology',
        originalName: 'Neurology',
        surveySource: 'MGMA',
        frequency: 1,
        mappingId: '8'
      },
      {
        id: '8b',
        specialty: 'Clinical Neurology',
        originalName: 'Clinical Neurology',
        surveySource: 'SullivanCotter',
        frequency: 1,
        mappingId: '8'
      }
    ],
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    id: '9',
    standardizedName: 'Psychiatry',
    sourceSpecialties: [
      {
        id: '9a',
        specialty: 'Psychiatry',
        originalName: 'Psychiatry',
        surveySource: 'MGMA',
        frequency: 1,
        mappingId: '9'
      },
      {
        id: '9b',
        specialty: 'General Psychiatry',
        originalName: 'General Psychiatry',
        surveySource: 'SullivanCotter',
        frequency: 1,
        mappingId: '9'
      }
    ],
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    id: '10',
    standardizedName: 'Dermatology',
    sourceSpecialties: [
      {
        id: '10a',
        specialty: 'Dermatology',
        originalName: 'Dermatology',
        surveySource: 'MGMA',
        frequency: 1,
        mappingId: '10'
      },
      {
        id: '10b',
        specialty: 'Clinical Dermatology',
        originalName: 'Clinical Dermatology',
        surveySource: 'SullivanCotter',
        frequency: 1,
        mappingId: '10'
      }
    ],
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    id: '11',
    standardizedName: 'Anesthesiology',
    sourceSpecialties: [
      {
        id: '11a',
        specialty: 'Anesthesiology',
        originalName: 'Anesthesiology',
        surveySource: 'MGMA',
        frequency: 1,
        mappingId: '11'
      },
      {
        id: '11b',
        specialty: 'Anesthesiology',
        originalName: 'Anesthesiology',
        surveySource: 'SullivanCotter',
        frequency: 1,
        mappingId: '11'
      },
      {
        id: '11c',
        specialty: 'Anesthesiology',
        originalName: 'Anesthesiology',
        surveySource: 'Gallagher',
        frequency: 1,
        mappingId: '11'
      }
    ],
    createdAt: new Date(),
    updatedAt: new Date()
  }
]; 