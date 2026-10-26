import type { GeoPoint, LocalizedText, QuestionOption, ServiceEligibilityRules } from './schema';

export interface SeedDistrict {
  slug: string;
  name: LocalizedText;
  centroid: GeoPoint;
}

/** Kerala's 14 districts; centroids are the district headquarters. Malayalam names need native review. */
export const keralaDistricts: SeedDistrict[] = [
  {
    slug: 'thiruvananthapuram',
    name: { en: 'Thiruvananthapuram', ml: 'തിരുവനന്തപുരം' },
    centroid: { lat: 8.5241, lng: 76.9366 },
  },
  { slug: 'kollam', name: { en: 'Kollam', ml: 'കൊല്ലം' }, centroid: { lat: 8.8932, lng: 76.6141 } },
  {
    slug: 'pathanamthitta',
    name: { en: 'Pathanamthitta', ml: 'പത്തനംതിട്ട' },
    centroid: { lat: 9.2648, lng: 76.787 },
  },
  {
    slug: 'alappuzha',
    name: { en: 'Alappuzha', ml: 'ആലപ്പുഴ' },
    centroid: { lat: 9.4981, lng: 76.3388 },
  },
  {
    slug: 'kottayam',
    name: { en: 'Kottayam', ml: 'കോട്ടയം' },
    centroid: { lat: 9.5916, lng: 76.5222 },
  },
  {
    slug: 'idukki',
    name: { en: 'Idukki', ml: 'ഇടുക്കി' },
    centroid: { lat: 9.8494, lng: 76.9719 },
  },
  {
    slug: 'ernakulam',
    name: { en: 'Ernakulam', ml: 'എറണാകുളം' },
    centroid: { lat: 9.9816, lng: 76.2999 },
  },
  {
    slug: 'thrissur',
    name: { en: 'Thrissur', ml: 'തൃശ്ശൂർ' },
    centroid: { lat: 10.5276, lng: 76.2144 },
  },
  {
    slug: 'palakkad',
    name: { en: 'Palakkad', ml: 'പാലക്കാട്' },
    centroid: { lat: 10.7867, lng: 76.6548 },
  },
  {
    slug: 'malappuram',
    name: { en: 'Malappuram', ml: 'മലപ്പുറം' },
    centroid: { lat: 11.051, lng: 76.0711 },
  },
  {
    slug: 'kozhikode',
    name: { en: 'Kozhikode', ml: 'കോഴിക്കോട്' },
    centroid: { lat: 11.2588, lng: 75.7804 },
  },
  {
    slug: 'wayanad',
    name: { en: 'Wayanad', ml: 'വയനാട്' },
    centroid: { lat: 11.6854, lng: 76.132 },
  },
  {
    slug: 'kannur',
    name: { en: 'Kannur', ml: 'കണ്ണൂർ' },
    centroid: { lat: 11.8745, lng: 75.3704 },
  },
  {
    slug: 'kasaragod',
    name: { en: 'Kasaragod', ml: 'കാസർകോട്' },
    centroid: { lat: 12.4996, lng: 74.9869 },
  },
];

type SeedQuestionType =
  'text' | 'textarea' | 'number' | 'boolean' | 'single_select' | 'multi_select';

export interface SeedQuestion {
  key: string;
  type: SeedQuestionType;
  label: string;
  isRequired: boolean;
  options?: string[][];
}

export interface SeedService {
  slug: string;
  name: string;
  description: string;
  eligibility?: ServiceEligibilityRules;
  documents: { type: 'id_proof' | 'driving_licence'; isMandatory: boolean }[];
  questions: SeedQuestion[];
}

export interface SeedCategory {
  slug: string;
  name: string;
  services: SeedService[];
}

const idProof = { type: 'id_proof', isMandatory: true } as const;
const drivingLicence = { type: 'driving_licence', isMandatory: true } as const;

const driverQuestions: SeedQuestion[] = [
  {
    key: 'driving_experience_years',
    type: 'number',
    label: 'Years of driving experience',
    isRequired: true,
  },
  {
    key: 'licence_categories',
    type: 'multi_select',
    label: 'Driving licence categories held',
    isRequired: true,
    options: [
      ['mcwg', 'Motorcycle with gear (MCWG)'],
      ['lmv', 'Light motor vehicle (LMV)'],
      ['lmv_tr', 'Light motor vehicle, transport (LMV-TR)'],
      ['hmv', 'Heavy motor vehicle (HMV)'],
    ],
  },
  {
    key: 'vehicle_types',
    type: 'multi_select',
    label: 'Vehicle types you can drive',
    isRequired: true,
    options: [
      ['two_wheeler', 'Two-wheeler'],
      ['car_manual', 'Car (manual)'],
      ['car_automatic', 'Car (automatic)'],
      ['suv_van', 'SUV / van'],
    ],
  },
  {
    key: 'owns_vehicle',
    type: 'boolean',
    label: 'Do you have your own vehicle?',
    isRequired: true,
  },
  {
    key: 'has_commercial_licence',
    type: 'boolean',
    label: 'Do you hold a commercial (transport) licence?',
    isRequired: true,
  },
];

const patientQuestions: SeedQuestion[] = [
  {
    key: 'relevant_experience',
    type: 'textarea',
    label: 'Relevant patient-care experience',
    isRequired: true,
  },
  { key: 'training', type: 'textarea', label: 'Training completed', isRequired: false },
  {
    key: 'qualifications',
    type: 'text',
    label: 'Qualifications (e.g. GNM, ANM, caregiver course)',
    isRequired: false,
  },
  {
    key: 'previous_work',
    type: 'textarea',
    label: 'Previous work (hospitals, homes, agencies)',
    isRequired: false,
  },
];

const tradeQuestions: SeedQuestion[] = [
  { key: 'experience_years', type: 'number', label: 'Years of experience', isRequired: true },
  {
    key: 'qualification_or_training',
    type: 'text',
    label: 'Qualification or training (e.g. ITI)',
    isRequired: false,
  },
  {
    key: 'tools_available',
    type: 'boolean',
    label: 'Do you bring your own tools?',
    isRequired: true,
  },
];

const mechanicQuestions: SeedQuestion[] = [
  { key: 'experience_years', type: 'number', label: 'Years of experience', isRequired: true },
  {
    key: 'specialisation',
    type: 'multi_select',
    label: 'Equipment or vehicle specialisation',
    isRequired: true,
    options: [
      ['two_wheeler', 'Two-wheelers'],
      ['car', 'Cars'],
      ['heavy_vehicle', 'Heavy vehicles'],
      ['home_appliances', 'Home appliances'],
    ],
  },
  {
    key: 'tools_available',
    type: 'boolean',
    label: 'Do you bring your own tools?',
    isRequired: true,
  },
];

const childcareQuestions: SeedQuestion[] = [
  {
    key: 'relevant_experience',
    type: 'textarea',
    label: 'Relevant childcare experience',
    isRequired: true,
  },
  {
    key: 'training_qualifications',
    type: 'textarea',
    label: 'Training and qualifications',
    isRequired: false,
  },
  {
    key: 'references',
    type: 'textarea',
    label: 'References (name and contact)',
    isRequired: false,
  },
  {
    key: 'safeguarding_info',
    type: 'textarea',
    label: 'Safeguarding: anything we should know, and any child-safety training',
    isRequired: true,
  },
];

/** Initial catalog from the requirements (§5). Admins extend it without code changes. */
export const initialCatalog: SeedCategory[] = [
  {
    slug: 'transport',
    name: 'Transport Services',
    services: [
      {
        slug: 'taxi-personal-driver',
        name: 'Taxi / Personal Driver',
        description: 'A licensed driver for your car or theirs, by the hour or day.',
        documents: [idProof, drivingLicence],
        questions: driverQuestions,
      },
      {
        slug: 'driver-shopping-assistance',
        name: 'Driver with Shopping Assistance',
        description: 'A driver who also helps with shopping and carrying purchases.',
        documents: [idProof, drivingLicence],
        questions: driverQuestions,
      },
    ],
  },
  {
    slug: 'patient-support',
    name: 'Patient Support',
    services: [
      {
        slug: 'patient-care-assistance',
        name: 'Patient Care Assistance',
        description: 'Non-medical daily care for patients at home or in hospital.',
        documents: [idProof],
        questions: patientQuestions,
      },
      {
        slug: 'patient-companion',
        name: 'Patient Companion',
        description: 'Company and support for hospital visits, stays and recovery at home.',
        documents: [idProof],
        questions: patientQuestions,
      },
    ],
  },
  {
    slug: 'personal-daily-assistance',
    name: 'Personal and Daily Assistance',
    services: [
      {
        slug: 'shopping-assistance',
        name: 'Shopping Assistance',
        description: 'Help with grocery and household shopping.',
        documents: [idProof],
        questions: [],
      },
      {
        slug: 'travel-assistance',
        name: 'Travel Assistance',
        description: 'A companion to help with travel, tickets and luggage.',
        documents: [idProof],
        questions: [],
      },
      {
        slug: 'home-stay-assistance',
        name: 'Home Stay Assistance',
        description: 'Someone to stay at home to help an elderly or unwell family member.',
        documents: [idProof],
        questions: [],
      },
    ],
  },
  {
    slug: 'home-services',
    name: 'Home Services',
    services: [
      {
        slug: 'home-assistance',
        name: 'Home Assistance',
        description: 'Everyday help around the house.',
        documents: [idProof],
        questions: [],
      },
      {
        slug: 'cleaning',
        name: 'Cleaning',
        description: 'Home and deep cleaning.',
        documents: [idProof],
        questions: [],
      },
      {
        slug: 'electrician',
        name: 'Electrician',
        description: 'Wiring, fittings, fans, lights and fault finding.',
        documents: [idProof],
        questions: tradeQuestions,
      },
      {
        slug: 'plumber',
        name: 'Plumber',
        description: 'Leaks, taps, pipes, tanks and bathroom fittings.',
        documents: [idProof],
        questions: tradeQuestions,
      },
      {
        slug: 'mechanic',
        name: 'Mechanic',
        description: 'Vehicle and equipment repairs at your location.',
        documents: [idProof],
        questions: mechanicQuestions,
      },
    ],
  },
  {
    slug: 'personal-care',
    name: 'Personal Care',
    services: [
      {
        slug: 'beauty-grooming',
        name: 'Beauty and Grooming',
        description: 'Hair, skin and grooming services at home.',
        documents: [idProof],
        questions: [],
      },
    ],
  },
  {
    slug: 'childcare',
    name: 'Childcare',
    services: [
      {
        slug: 'childcare-daycare',
        name: 'Childcare / Daycare',
        description: 'Care and supervision for children at home.',
        documents: [idProof],
        questions: childcareQuestions,
      },
    ],
  },
  {
    slug: 'food',
    name: 'Food',
    services: [
      {
        slug: 'homemade-food',
        name: 'Homemade Food',
        description: 'Home-cooked meals prepared by local cooks.',
        documents: [idProof],
        questions: [],
      },
    ],
  },
  { slug: 'other', name: 'Other', services: [] },
];

/** Turns `[value, label]` pairs into stored question options. */
export function toQuestionOptions(pairs: string[][] | undefined): QuestionOption[] | null {
  if (!pairs) {
    return null;
  }
  return pairs.map(([value, label]) => ({ value: value ?? '', label: { en: label ?? '' } }));
}
