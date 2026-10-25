/**
 * Deterministic demo data for the mock API, created once by `seedDatabase()`.
 * Catalog and districts mirror fix60_backend `packages/db/src/seed-data.ts`.
 *
 * Demo accounts (dev sign-in: token `dev:<phone>`, OTP 123456):
 *
 * | Phone          | Role     | Name          | State                                                                 |
 * |----------------|----------|---------------|-----------------------------------------------------------------------|
 * | +919000000001  | customer | Anjali Menon  | Kakkanad, Ernakulam. Requests and bookings in every state, a support  |
 * |                |          |               | ticket with a reply, notifications (some unread), one saved provider. |
 * | +919000000002  | provider | Suresh Kumar  | Approved, active. Cleaning, Home Assistance and Plumber around        |
 * |                |          |               | Kakkanad. Open invitations (one expiring soon, one directed), one     |
 * |                |          |               | declined, bookings upcoming/active today/past with review.            |
 * | +919000000003  | provider | Lakshmi Nair  | Patient support. Application `info_required` (documents + experience  |
 * |                |          |               | steps), police clearance `info_required` with a review note.          |
 * | any other +91  | either   | —             | `registration_required`. Registering as provider creates a draft      |
 * |                |          |               | application and an `onboarding` provider.                             |
 *
 * Other seeded providers (+9190000001NN) and customers (+919000000011 to +919000000013) can sign in too.
 * Every service has at least two auto-accepting providers around Kakkanad.
 * All times are relative to app start so there is always something upcoming, today and past.
 */
import type {
  ApplicationDraft,
  AvailabilityRule,
  AvailabilityType,
  Badge,
  DayPart,
  DocumentType,
  Gender,
  InvitationStatus,
  RequestSource,
  RequestStatus,
  TravelPreference,
  UserRole,
} from '../types';
import { APPLICATION_STEPS } from '../types';
import { toClockTime, toIsoDate } from '../../lib/format';
import {
  db,
  newId,
  type MockBooking,
  type MockInvitation,
  type MockProvider,
  type MockProviderService,
  type MockRequest,
  type MockUser,
  type Qualification,
} from './db';
import { INVITATION_TTL_MS, links } from './lifecycle';
import { seedCatalog, serviceBySlug } from './seed-catalog';
import { seedCms } from './seed-cms';
import { localityBySlug, seedLocations } from './seed-locations';
import { slotEndIso, slotStartIso } from './slots';
import { firstName } from './views';

/** A demo sign-in. */
export interface DemoAccount {
  phone: string;
  role: UserRole;
  name: string;
  description: string;
}

/** Accounts worth trying in mock mode (OTP 123456). */
export const DEMO_ACCOUNTS: DemoAccount[] = [
  {
    phone: '+919000000001',
    role: 'customer',
    name: 'Anjali Menon',
    description: 'Customer in Kakkanad with requests and bookings in every state, a support ticket and a saved provider.',
  },
  {
    phone: '+919000000002',
    role: 'provider',
    name: 'Suresh Kumar',
    description: 'Approved cleaning, home assistance and plumbing provider in Ernakulam with open invitations, bookings today and a review.',
  },
  {
    phone: '+919000000003',
    role: 'provider',
    name: 'Lakshmi Nair',
    description: 'Patient-support provider whose application needs more information (documents and experience).',
  },
];

const MIN = 60_000;
const HOUR = 60 * MIN;
const DAY = 24 * HOUR;

let now = Date.now();
const iso = (ms: number): string => new Date(ms).toISOString();
const ago = (ms: number): string => iso(now - ms);
/** IST calendar date `days` from today. */
const dayOffset = (days: number): string => toIsoDate(new Date(now + days * DAY));

interface UserSeed {
  phone: string;
  role: UserRole;
  fullName: string;
  gender: Gender;
  dateOfBirth: string;
  locality: string;
  email?: string;
  locale?: 'en' | 'ml';
  joinedDaysAgo: number;
}

function addUser(seed: UserSeed): MockUser {
  const locality = localityBySlug(seed.locality);
  const user: MockUser = {
    id: newId(),
    role: seed.role,
    status: 'active',
    fullName: seed.fullName,
    phone: seed.phone,
    whatsappPhone: seed.phone,
    email: seed.email ?? null,
    dateOfBirth: seed.dateOfBirth,
    gender: seed.gender,
    preferredLocale: seed.locale ?? 'en',
    districtId: locality.districtId,
    localityId: locality.id,
    providerCode: null,
    createdAt: ago(seed.joinedDaysAgo * DAY),
    consents: {
      terms: true,
      privacy: true,
      safety_policy: true,
      service_communications: true,
      whatsapp_updates: seed.role === 'customer',
      marketing: false,
      provider_declaration: seed.role === 'provider',
    },
    deletionScheduledFor: null,
  };
  db.users.set(user.id, user);
  return user;
}

type ServiceRateSeed = [slug: string, hourly: number, daily: number | null, monthly: number | null, isNegotiable: boolean, minMinutes: number];
type ReviewSeed = [rating: number, comment: string | null, customerFirstName: string, serviceSlug: string, daysAgo: number];

interface ProviderSeed extends Omit<UserSeed, 'role'> {
  photo: number | null;
  radiusKm: number;
  years: number;
  /** Language codes: ml, en, ta, hi, kn, other. */
  languages: string[];
  bio: string;
  badges: Badge[];
  travel: TravelPreference;
  availabilityTypes: AvailabilityType[];
  dayParts: DayPart[];
  services: ServiceRateSeed[];
  reviews: ReviewSeed[];
  /** Wizard answers per service slug. */
  answers?: Record<string, MockProviderService['answers']>;
  qualifications?: Qualification[];
  rules?: AvailabilityRule[];
}

const WEEKDAY_RULES = (start: string, end: string, days: number[] = [1, 2, 3, 4, 5, 6]): AvailabilityRule[] =>
  days.map((weekday) => ({ weekday, startTime: start, endTime: end }));

/** 14 approved providers. Ten work around Kochi so every service has auto-accepting providers near Kakkanad. */
const PROVIDERS: ProviderSeed[] = [
  {
    phone: '+919000000002', fullName: 'Suresh Kumar', gender: 'male', dateOfBirth: '1986-04-12', locality: 'kakkanad', joinedDaysAgo: 120,
    photo: 12, radiusKm: 15, years: 9, languages: ['ml', 'en', 'ta'], badges: ['verified', 'experienced', 'top_rated'],
    bio: 'Nine years of home cleaning and small plumbing jobs around Kakkanad and Edappally. I bring eco-friendly supplies on request.',
    travel: 'depends_on_distance', availabilityTypes: ['hourly', 'daily'], dayParts: ['morning', 'afternoon'],
    services: [
      ['cleaning', 250, 1800, null, false, 120],
      ['home-assistance', 220, 1600, 16000, true, 120],
      ['plumber', 300, null, null, true, 60],
    ],
    answers: {
      cleaning: { cleaning_types: ['regular', 'deep', 'kitchen', 'bathroom'], team_size: 'with_helper', bring_supplies: true },
      'home-assistance': { tasks: ['cleaning', 'laundry', 'errands'], experience_years: 9 },
      plumber: { experience_years: 6, qualification_or_training: 'ITI Plumber', tools_available: true },
    },
    reviews: [
      [5, 'Spotless kitchen and very polite.', 'Divya', 'cleaning', 12],
      [4, 'Fixed the leaking tap in twenty minutes.', 'Arun', 'plumber', 20],
      [5, 'Did a great deep clean before our housewarming.', 'Neethu', 'cleaning', 35],
      [4, null, 'Vinod', 'home-assistance', 50],
    ],
    rules: WEEKDAY_RULES('08:00', '18:00'),
  },
  {
    phone: '+919000000101', fullName: 'Bindu Joseph', gender: 'female', dateOfBirth: '1982-09-03', locality: 'edappally', joinedDaysAgo: 210,
    photo: 47, radiusKm: 12, years: 6, languages: ['ml', 'en'], badges: ['verified', 'experienced'],
    bio: 'Friendly and careful with your home. I also cook simple Kerala meals and can stay over to help an elder.',
    travel: 'yes', availabilityTypes: ['hourly', 'part_time', 'full_time'], dayParts: ['morning', 'afternoon'],
    services: [
      ['cleaning', 220, 1600, 14000, true, 120],
      ['home-assistance', 200, 1500, 15000, true, 120],
      ['homemade-food', 200, 1500, 15000, false, 120],
      ['home-stay-assistance', 250, 1800, 20000, true, 480],
    ],
    reviews: [
      [5, 'Bindu chechi is wonderful. Our flat has never been cleaner.', 'Reshma', 'cleaning', 8],
      [4, 'Good food, slightly less spice next time please!', 'Akhil', 'homemade-food', 18],
      [5, 'വളരെ നല്ല സേവനം.', 'Sreeja', 'cleaning', 27],
      [4, null, 'Manoj', 'home-assistance', 40],
      [5, 'Stayed with my father for a week. Very reliable.', 'Hari', 'home-stay-assistance', 66],
    ],
  },
  {
    phone: '+919000000102', fullName: 'Mariamma Varghese', gender: 'female', dateOfBirth: '1972-01-22', locality: 'vyttila', joinedDaysAgo: 300,
    photo: 44, radiusKm: 20, years: 14, languages: ['ml', 'en', 'hi'], badges: ['verified', 'experienced', 'top_rated'],
    bio: 'Fourteen years caring for patients at home and in hospital, including post-surgery recovery and dementia care.',
    travel: 'yes', availabilityTypes: ['daily', 'full_time'], dayParts: ['morning', 'afternoon', 'evening', 'night'],
    services: [
      ['patient-care-assistance', 350, 2600, 28000, true, 480],
      ['patient-companion', 300, 2200, 24000, true, 240],
      ['home-stay-assistance', 300, 2200, 24000, true, 480],
    ],
    reviews: [
      [5, 'Took care of my father like family.', 'Rahul', 'patient-care-assistance', 6],
      [5, 'Very patient and kind with my mother at the hospital.', 'Smitha', 'patient-companion', 22],
      [5, 'Excellent after my surgery. Highly recommend.', 'George', 'patient-care-assistance', 34],
      [4, null, 'Lekha', 'patient-companion', 51],
      [5, 'അമ്മയെ നന്നായി നോക്കി.', 'Bijoy', 'home-stay-assistance', 77],
      [5, 'Calm and professional.', 'Tessy', 'patient-care-assistance', 95],
    ],
    qualifications: [{ kind: 'training', title: 'General Duty Assistant (GDA)', issuer: 'Healthcare Sector Skill Council', year: 2012 }],
  },
  {
    phone: '+919000000103', fullName: 'Rajesh Pillai', gender: 'male', dateOfBirth: '1979-06-30', locality: 'kaloor', joinedDaysAgo: 260,
    photo: 15, radiusKm: 25, years: 11, languages: ['ml', 'en', 'hi', 'ta'], badges: ['verified', 'experienced'],
    bio: 'Safe, punctual driver with eleven years in Kochi traffic. Comfortable with long trips, automatic cars and helping with shopping.',
    travel: 'yes', availabilityTypes: ['hourly', 'daily', 'full_time'], dayParts: ['morning', 'afternoon', 'evening'],
    services: [
      ['taxi-personal-driver', 200, 1400, 22000, true, 240],
      ['driver-shopping-assistance', 220, 1500, null, true, 180],
      ['travel-assistance', 250, 1800, null, true, 240],
      ['shopping-assistance', 180, null, null, false, 120],
    ],
    reviews: [
      [5, 'Smooth drive to the airport at 4 am.', 'Sanjay', 'taxi-personal-driver', 14],
      [4, 'Good driver, knows the city well.', 'Aparna', 'taxi-personal-driver', 30],
      [5, null, 'Kiran', 'driver-shopping-assistance', 45],
      [4, 'Helpful on our Munnar trip.', 'Deepa', 'travel-assistance', 70],
    ],
    rules: WEEKDAY_RULES('07:00', '20:00', [0, 1, 2, 3, 4, 5, 6]),
  },
  {
    phone: '+919000000104', fullName: 'Sini Thomas', gender: 'female', dateOfBirth: '1993-11-08', locality: 'kakkanad', joinedDaysAgo: 75,
    photo: 32, radiusKm: 10, years: 4, languages: ['ml', 'en'], badges: ['verified'],
    bio: 'Mother of two, trained in infant first aid and a certified beautician. Happy to help with cleaning and shopping too.',
    travel: 'depends_on_distance', availabilityTypes: ['hourly', 'part_time'], dayParts: ['morning', 'afternoon'],
    services: [
      ['cleaning', 230, 1700, null, false, 120],
      ['childcare-daycare', 250, 1800, 18000, true, 240],
      ['beauty-grooming', 300, null, null, true, 60],
      ['shopping-assistance', 170, null, null, false, 60],
    ],
    reviews: [
      [5, 'Our baby loved her.', 'Nisha', 'childcare-daycare', 9],
      [4, null, 'Varun', 'cleaning', 25],
      [5, 'Lovely bridal makeup for my sister.', 'Anu', 'beauty-grooming', 31],
    ],
    qualifications: [
      { kind: 'certification', title: 'Paediatric first aid', issuer: 'Red Cross Kerala', year: 2023 },
      { kind: 'certification', title: 'Beautician course', issuer: 'Kochi Beauty Academy', year: 2019 },
    ],
  },
  {
    phone: '+919000000105', fullName: 'Abdul Rasheed', gender: 'male', dateOfBirth: '1975-03-17', locality: 'aluva', joinedDaysAgo: 400,
    photo: 53, radiusKm: 25, years: 15, languages: ['ml', 'hi'], badges: ['verified', 'experienced', 'top_rated'],
    bio: 'ITI electrician with fifteen years of wiring, plumbing and appliance repairs. Two-wheeler repairs at your doorstep too.',
    travel: 'yes', availabilityTypes: ['hourly', 'daily', 'flexible'], dayParts: ['morning', 'afternoon', 'evening'],
    services: [
      ['electrician', 300, 2200, null, true, 60],
      ['plumber', 300, 2200, null, true, 60],
      ['mechanic', 350, null, null, true, 60],
    ],
    reviews: [
      [5, 'Found the wiring fault nobody else could.', 'Shameer', 'electrician', 5],
      [5, 'Replaced all the bathroom fittings neatly.', 'Gopika', 'plumber', 19],
      [4, 'Good work, arrived a bit late.', 'Jithin', 'electrician', 33],
      [5, null, 'Fousiya', 'mechanic', 48],
      [5, 'Fixed our washing machine at home.', 'Anoop', 'mechanic', 62],
      [4, 'Tidy and honest.', 'Rekha', 'plumber', 80],
      [5, 'Will call again for the new house.', 'Salim', 'electrician', 110],
    ],
    qualifications: [{ kind: 'qualification', title: 'ITI Electrician', issuer: 'Government ITI Kalamassery', year: 2008 }],
  },
  {
    phone: '+919000000106', fullName: 'Geetha Kumari', gender: 'female', dateOfBirth: '1977-12-02', locality: 'kaloor', joinedDaysAgo: 330,
    photo: 49, radiusKm: 18, years: 10, languages: ['ml', 'en', 'ta'], badges: ['verified', 'experienced'],
    bio: 'Home nurse aide in Kochi. Experienced with bedridden patients, diabetic care and looking after young children.',
    travel: 'yes', availabilityTypes: ['daily', 'full_time'], dayParts: ['morning', 'afternoon', 'evening', 'night'],
    services: [
      ['patient-care-assistance', 330, 2500, 26000, true, 480],
      ['patient-companion', 280, 2000, 22000, true, 240],
      ['childcare-daycare', 240, 1800, 17000, true, 240],
      ['home-assistance', 210, 1500, null, false, 120],
    ],
    reviews: [
      [5, 'Very caring with my grandmother.', 'Aswathy', 'patient-care-assistance', 10],
      [4, null, 'Prakash', 'patient-companion', 29],
      [5, 'Kept us updated every day.', 'Remya', 'patient-care-assistance', 44],
      [4, 'Good with the kids, very punctual.', 'Sunil', 'childcare-daycare', 60],
      [5, 'നല്ല പരിചരണം.', 'Meenakshi', 'patient-care-assistance', 92],
    ],
    qualifications: [{ kind: 'qualification', title: 'Auxiliary Nursing Midwifery (ANM)', issuer: 'Kerala Nurses and Midwives Council', year: 2010 }],
  },
  {
    phone: '+919000000107', fullName: 'Anil Kumar', gender: 'male', dateOfBirth: '1988-08-19', locality: 'vyttila', joinedDaysAgo: 150,
    photo: 59, radiusKm: 20, years: 7, languages: ['ml', 'en'], badges: ['verified', 'experienced'],
    bio: 'Driver for seven years and a trained two-wheeler and car mechanic. Happy to help on long trips.',
    travel: 'depends_on_distance', availabilityTypes: ['hourly', 'daily'], dayParts: ['morning', 'evening'],
    services: [
      ['taxi-personal-driver', 180, 1300, 20000, false, 180],
      ['driver-shopping-assistance', 200, 1400, null, true, 180],
      ['travel-assistance', 220, 1600, null, true, 240],
      ['mechanic', 280, null, null, true, 60],
    ],
    reviews: [
      [5, 'Got my scooter running in half an hour.', 'Vidya', 'mechanic', 16],
      [4, null, 'Ajay', 'taxi-personal-driver', 38],
      [4, 'Careful driver.', 'Latha', 'travel-assistance', 58],
    ],
  },
  {
    phone: '+919000000108', fullName: 'Shobha Rani', gender: 'female', dateOfBirth: '1985-05-25', locality: 'kazhakoottam', joinedDaysAgo: 90,
    photo: null, radiusKm: 15, years: 5, languages: ['ml'], badges: ['verified', 'experienced'],
    bio: 'Neat, quick home cleaning and everyday help around Kazhakoottam and Technopark.',
    travel: 'no', availabilityTypes: ['hourly', 'part_time'], dayParts: ['morning'],
    services: [
      ['cleaning', 200, 1500, null, false, 120],
      ['home-assistance', 180, 1400, 13000, false, 120],
    ],
    reviews: [[4, 'Good work.', 'Anitha', 'cleaning', 21]],
  },
  {
    phone: '+919000000109', fullName: 'Thankamma Mathew', gender: 'female', dateOfBirth: '1968-10-14', locality: 'nagampadam', joinedDaysAgo: 500,
    photo: 45, radiusKm: 15, years: 18, languages: ['ml', 'en'], badges: ['verified', 'experienced', 'top_rated'],
    bio: 'Eighteen years as a nanny and companion in Kottayam. Gentle, patient and organised.',
    travel: 'depends_on_distance', availabilityTypes: ['part_time', 'full_time'], dayParts: ['morning', 'afternoon'],
    services: [
      ['childcare-daycare', 230, 1700, 17000, true, 240],
      ['patient-companion', 260, 1900, 20000, true, 240],
      ['home-stay-assistance', 250, 1900, 21000, true, 480],
    ],
    reviews: [
      [5, 'Our twins adore her.', 'Liya', 'childcare-daycare', 4],
      [5, 'Like a grandmother to my son.', 'Jomon', 'childcare-daycare', 15],
      [5, null, 'Ancy', 'childcare-daycare', 28],
      [4, 'Very experienced.', 'Roshan', 'patient-companion', 37],
      [5, 'Trustworthy and kind.', 'Blessy', 'childcare-daycare', 55],
      [5, 'കുഞ്ഞിനെ നന്നായി നോക്കി.', 'Sneha', 'childcare-daycare', 73],
      [4, null, 'Tom', 'home-stay-assistance', 99],
      [5, 'Highly recommended.', 'Mini', 'childcare-daycare', 130],
    ],
  },
  {
    phone: '+919000000110', fullName: 'Biju Kurian', gender: 'male', dateOfBirth: '1995-02-11', locality: 'vyttila', joinedDaysAgo: 30,
    photo: null, radiusKm: 15, years: 3, languages: ['ml'], badges: ['verified'],
    bio: 'ITI-trained electrician and plumber in Kochi. Fans, lights, taps and tanks.',
    travel: 'yes', availabilityTypes: ['hourly', 'daily'], dayParts: ['morning', 'afternoon'],
    services: [
      ['electrician', 250, 1800, null, true, 60],
      ['plumber', 250, 1800, null, true, 60],
    ],
    reviews: [],
  },
  {
    phone: '+919000000111', fullName: 'Saritha Menon', gender: 'female', dateOfBirth: '1983-07-07', locality: 'punkunnam', joinedDaysAgo: 180,
    photo: 41, radiusKm: 15, years: 8, languages: ['ml', 'en'], badges: ['verified', 'experienced'],
    bio: 'Thrissur-style vegetarian and non-vegetarian home cooking. Sadya specialist.',
    travel: 'yes', availabilityTypes: ['part_time', 'daily'], dayParts: ['morning', 'afternoon'],
    services: [
      ['homemade-food', 230, 1700, 16000, false, 120],
      ['home-assistance', 200, 1500, null, true, 120],
    ],
    reviews: [
      [5, 'Best avial I have had outside home.', 'Krishnan', 'homemade-food', 11],
      [4, null, 'Asha', 'homemade-food', 26],
      [5, 'Onam sadya was perfect.', 'Ravi', 'homemade-food', 42],
      [4, 'Tasty and clean cooking.', 'Priya', 'home-assistance', 64],
    ],
  },
  {
    phone: '+919000000112', fullName: 'Muhammed Faizal', gender: 'male', dateOfBirth: '1990-04-04', locality: 'mavoor-road', joinedDaysAgo: 140,
    photo: 68, radiusKm: 20, years: 6, languages: ['ml', 'en', 'hi'], badges: ['verified', 'experienced'],
    bio: 'Kozhikode driver for hospital visits, airport runs and family trips.',
    travel: 'yes', availabilityTypes: ['hourly', 'daily'], dayParts: ['morning', 'afternoon', 'evening'],
    services: [
      ['taxi-personal-driver', 190, 1400, 21000, true, 180],
      ['driver-shopping-assistance', 210, 1500, null, true, 180],
      ['travel-assistance', 230, 1700, null, true, 240],
    ],
    reviews: [
      [5, 'Very polite and safe.', 'Haseena', 'taxi-personal-driver', 7],
      [4, null, 'Nikhil', 'driver-shopping-assistance', 31],
      [5, 'On time for the Calicut airport pickup.', 'Arjun', 'taxi-personal-driver', 52],
    ],
  },
  {
    phone: '+919000000113', fullName: 'Ramla Beevi', gender: 'female', dateOfBirth: '1987-01-29', locality: 'kakkanad', joinedDaysAgo: 110,
    photo: null, radiusKm: 12, years: 5, languages: ['ml', 'hi'], badges: ['verified', 'experienced'],
    bio: 'Bridal makeup, mehendi and Malabar home cooking around Kakkanad.',
    travel: 'depends_on_distance', availabilityTypes: ['hourly', 'part_time'], dayParts: ['morning', 'afternoon', 'evening'],
    services: [
      ['beauty-grooming', 350, null, null, true, 60],
      ['homemade-food', 220, 1600, 16000, false, 120],
    ],
    reviews: [
      [5, 'Beautiful mehendi for the wedding.', 'Shahana', 'beauty-grooming', 13],
      [4, null, 'Vishnu', 'homemade-food', 47],
    ],
  },
];

function addVerifiedDocument(userId: string, type: DocumentType, last4: string | null, daysAgo: number): void {
  const id = newId();
  db.documents.set(id, {
    id,
    userId,
    isFinalised: true,
    type,
    serviceId: null,
    fileName: `${type}.pdf`,
    mimeType: 'application/pdf',
    sizeBytes: 420_000,
    idNumberLast4: last4,
    status: 'verified',
    reviewNote: null,
    uploadedAt: ago(daysAgo * DAY),
  });
}

function draftFromProvider(provider: MockProvider, user: MockUser): ApplicationDraft {
  return {
    personal: { fullName: user.fullName, dateOfBirth: user.dateOfBirth ?? '1990-01-01', gender: user.gender, whatsappPhone: user.whatsappPhone, email: user.email },
    location: { districtId: provider.districtId ?? '', localityId: provider.localityId ?? '', addressNote: null },
    services: { serviceIds: provider.services.map((service) => service.serviceId) },
    service_details: {
      services: provider.services.map((service) => ({
        serviceId: service.serviceId,
        yearsExperience: service.yearsExperience,
        rates: service.rates,
        answers: service.answers,
      })),
    },
    experience: {
      yearsExperience: provider.yearsExperience,
      bio: provider.bio,
      previousWork: provider.previousWork,
      languages: provider.languages,
      qualifications: provider.qualifications,
    },
    service_area: {
      latitude: provider.latitude ?? 0,
      longitude: provider.longitude ?? 0,
      radiusKm: provider.radiusKm ?? 10,
      travelPreference: provider.travelPreference ?? 'depends_on_distance',
    },
    availability: {
      availabilityTypes: provider.availabilityTypes,
      dayParts: provider.dayParts,
      maxHoursPerDay: provider.availability.maxHoursPerDay,
      rules: provider.availability.rules,
    },
    documents: { acknowledged: true },
    review: { declarationAccepted: true },
  };
}

function addProvider(seed: ProviderSeed, status: MockProvider['status'] = 'active'): MockProvider {
  const user = addUser({ ...seed, role: 'provider' });
  const locality = localityBySlug(seed.locality);
  const code = db.nextCode('provider');
  user.providerCode = code;
  const provider: MockProvider = {
    userId: user.id,
    code,
    status,
    photoUrl: seed.photo === null ? null : `https://i.pravatar.cc/150?img=${seed.photo}`,
    bio: seed.bio,
    previousWork: null,
    languages: seed.languages,
    yearsExperience: seed.years,
    travelPreference: seed.travel,
    availabilityTypes: seed.availabilityTypes,
    dayParts: seed.dayParts,
    qualifications: seed.qualifications ?? [],
    districtId: locality.districtId,
    localityId: locality.id,
    latitude: locality.latitude,
    longitude: locality.longitude,
    radiusKm: seed.radiusKm,
    badges: seed.badges,
    services: seed.services.map(([slug, hourly, daily, monthly, isNegotiable, minMinutes]) => ({
      serviceId: serviceBySlug(slug).id,
      status: status === 'active' ? 'approved' : 'pending',
      reviewNote: null,
      yearsExperience: seed.years,
      rates: { hourlyRate: hourly, dailyRate: daily, monthlyRate: monthly, isNegotiable, minBookingMinutes: minMinutes },
      answers: { ...seed.answers?.[slug] },
    })),
    availability: { rules: seed.rules ?? WEEKDAY_RULES('08:00', '18:00'), maxHoursPerDay: 8, exceptions: [] },
    memberSince: user.createdAt,
    isSimulated: seed.phone !== '+919000000002',
  };
  db.providers.set(user.id, provider);
  for (const [rating, comment, customerFirstName, serviceSlug, daysAgo] of seed.reviews) {
    db.reviews.push({
      id: newId(),
      providerId: user.id,
      serviceId: serviceBySlug(serviceSlug).id,
      rating,
      comment,
      customerFirstName,
      createdAt: ago(daysAgo * DAY),
      bookingCode: null,
    });
  }
  if (status === 'active') {
    const mandatory = new Set<DocumentType>(['id_proof']);
    provider.services.forEach((service) =>
      db.services.get(service.serviceId)?.requiredDocuments.filter((doc) => doc.isMandatory).forEach((doc) => mandatory.add(doc.documentType)),
    );
    mandatory.forEach((type) => addVerifiedDocument(user.id, type, type === 'id_proof' ? seed.phone.slice(-4) : null, seed.joinedDaysAgo - 2));
    if (mandatory.has('police_clearance') && !provider.badges.includes('police_verified')) {
      provider.badges = [...provider.badges, 'police_verified'];
    }
    const submittedAt = ago((seed.joinedDaysAgo - 3) * DAY);
    db.applications.set(user.id, {
      code: db.nextCode('application'),
      status: 'approved',
      currentStep: APPLICATION_STEPS.length,
      draft: draftFromProvider(provider, user),
      completedSteps: [...APPLICATION_STEPS],
      submittedAt,
      decidedAt: ago((seed.joinedDaysAgo - 5) * DAY),
      decisionNote: null,
      infoRequests: [],
    });
  }
  return provider;
}

interface RequestSeed {
  customer: MockUser;
  service: string;
  locality: string;
  source: RequestSource;
  date: string;
  time: string;
  hours: number;
  budget?: number;
  requirements?: string;
  areaNote?: string;
  target?: MockProvider;
  timeline: [RequestStatus, number][];
  cancelReason?: string;
}

function addRequest(seed: RequestSeed): MockRequest {
  const locality = localityBySlug(seed.locality);
  const timeline = seed.timeline.map(([status, at]) => ({ status, at: iso(at) }));
  const last = timeline[timeline.length - 1]!;
  const request: MockRequest = {
    code: db.nextCode('request'),
    customerId: seed.customer.id,
    source: seed.source,
    status: last.status,
    serviceId: serviceBySlug(seed.service).id,
    targetProviderId: seed.target?.userId ?? null,
    localityId: locality.id,
    latitude: locality.latitude,
    longitude: locality.longitude,
    areaNote: seed.areaNote ?? null,
    preferredDate: seed.date,
    startTime: seed.time,
    durationHours: seed.hours,
    budgetAmount: seed.budget ?? null,
    requirements: seed.requirements ?? null,
    contactPhone: seed.customer.phone,
    contactWhatsapp: seed.customer.whatsappPhone,
    createdAt: timeline[0]!.at,
    statusChangedAt: last.at,
    bookingCode: null,
    timeline,
    cancelReason: seed.cancelReason ?? null,
  };
  db.requests.set(request.code, request);
  return request;
}

function addInvitation(
  request: MockRequest,
  provider: MockProvider,
  status: InvitationStatus,
  createdAt: number,
  respondedAt: number | null = null,
  declineReason: string | null = null,
): MockInvitation {
  const invitation: MockInvitation = {
    id: newId(),
    requestCode: request.code,
    providerId: provider.userId,
    status,
    expiresAt: iso(createdAt + INVITATION_TTL_MS),
    createdAt: iso(createdAt),
    respondedAt: respondedAt === null ? null : iso(respondedAt),
    declineReason,
  };
  db.invitations.set(invitation.id, invitation);
  return invitation;
}

function addBooking(
  request: MockRequest,
  provider: MockProvider,
  status: MockBooking['status'],
  extra: Partial<Pick<MockBooking, 'startedAt' | 'completedAt' | 'cancelledAt' | 'cancelledBy' | 'cancelReason' | 'review'>> = {},
): MockBooking {
  const booking: MockBooking = {
    code: db.nextCode('booking'),
    requestCode: request.code,
    customerId: request.customerId,
    providerId: provider.userId,
    serviceId: request.serviceId,
    status,
    startsAt: slotStartIso(request.preferredDate, request.startTime),
    endsAt: slotEndIso(request.preferredDate, request.startTime, request.durationHours),
    durationHours: request.durationHours,
    agreedHourlyRate: provider.services.find((service) => service.serviceId === request.serviceId)?.rates.hourlyRate ?? null,
    startedAt: null,
    completedAt: null,
    cancelledAt: null,
    cancelledBy: null,
    cancelReason: null,
    review: null,
    ...extra,
  };
  db.bookings.set(booking.code, booking);
  request.bookingCode = booking.code;
  if (booking.review) {
    db.reviews.push({
      id: newId(),
      providerId: provider.userId,
      serviceId: booking.serviceId,
      rating: booking.review.rating,
      comment: booking.review.comment,
      customerFirstName: firstName(db.users.get(request.customerId)?.fullName ?? 'Customer'),
      createdAt: booking.review.createdAt,
      bookingCode: booking.code,
    });
  }
  return booking;
}

function addNotification(user: MockUser, title: string, body: string, linkPath: string | null, msAgo: number, isRead: boolean): void {
  db.notifications.push({ id: newId(), userId: user.id, title, body, linkPath, isRead, createdAt: ago(msAgo) });
}

/** A past slot as an IST date + time. */
function slotAt(ms: number): { date: string; time: string } {
  return { date: toIsoDate(new Date(ms)), time: toClockTime(new Date(ms)) };
}


function seedPeople(): void {
  const anjali = addUser({
    phone: '+919000000001', role: 'customer', fullName: 'Anjali Menon', gender: 'female', dateOfBirth: '1990-07-15',
    locality: 'kakkanad', email: 'anjali.menon@example.com', joinedDaysAgo: 60,
  });
  const meera = addUser({ phone: '+919000000011', role: 'customer', fullName: 'Meera Thomas', gender: 'female', dateOfBirth: '1988-03-09', locality: 'edappally', joinedDaysAgo: 45 });
  const joseph = addUser({ phone: '+919000000012', role: 'customer', fullName: 'Joseph Varghese', gender: 'male', dateOfBirth: '1965-12-25', locality: 'fort-kochi', joinedDaysAgo: 80, locale: 'ml' });
  const fathima = addUser({ phone: '+919000000013', role: 'customer', fullName: 'Fathima Rahman', gender: 'female', dateOfBirth: '1996-06-18', locality: 'aluva', joinedDaysAgo: 25 });

  const providers = PROVIDERS.map((seed) => addProvider(seed));
  const byName = (name: string): MockProvider => providers.find((provider) => db.users.get(provider.userId)?.fullName === name)!;
  const suresh = byName('Suresh Kumar');
  const bindu = byName('Bindu Joseph');
  const mariamma = byName('Mariamma Varghese');
  const rajesh = byName('Rajesh Pillai');
  const sini = byName('Sini Thomas');
  const ramla = byName('Ramla Beevi');

  // Lakshmi: patient-support application sent back for more information.
  const lakshmi = addProvider(
    {
      phone: '+919000000003', fullName: 'Lakshmi Nair', gender: 'female', dateOfBirth: '1984-02-20', locality: 'ayyanthole', joinedDaysAgo: 6,
      photo: 36, radiusKm: 12, years: 7, languages: ['ml', 'en'], badges: [],
      bio: 'Home nurse aide with seven years of experience in Thrissur.',
      travel: 'depends_on_distance', availabilityTypes: ['daily', 'full_time'], dayParts: ['morning', 'afternoon', 'night'],
      services: [
        ['patient-care-assistance', 320, 2400, 25000, true, 480],
        ['patient-companion', 270, 2000, 21000, true, 240],
      ],
      answers: {
        'patient-care-assistance': {
          relevant_experience: 'Seven years caring for bedridden and post-surgery patients at home.',
          qualifications: 'Caregiver course',
        },
        'patient-companion': { relevant_experience: 'Accompanied patients to Jubilee and Amala hospitals for check-ups and stays.' },
      },
      reviews: [],
    },
    'onboarding',
  );
  const lakshmiUser = db.requireUser(lakshmi.userId);
  addVerifiedDocument(lakshmi.userId, 'id_proof', '7731', 4);
  const policeDocId = newId();
  db.documents.set(policeDocId, {
    id: policeDocId,
    userId: lakshmi.userId,
    isFinalised: true,
    type: 'police_clearance',
    serviceId: null,
    fileName: 'police-clearance-2025.jpg',
    mimeType: 'image/jpeg',
    sizeBytes: 1_250_000,
    idNumberLast4: null,
    status: 'info_required',
    reviewNote: 'This certificate is dated March 2025. Please upload one issued in the last 6 months.',
    uploadedAt: ago(4 * DAY),
  });
  db.applications.set(lakshmi.userId, {
    code: db.nextCode('application'),
    status: 'info_required',
    currentStep: APPLICATION_STEPS.length,
    draft: draftFromProvider(lakshmi, lakshmiUser),
    completedSteps: [...APPLICATION_STEPS],
    submittedAt: ago(3 * DAY),
    decidedAt: null,
    decisionNote: 'Thanks, Lakshmi. Please update the items below and resubmit.',
    infoRequests: [
      { step: 'documents', message: 'Your police clearance certificate is older than 6 months. Please upload a recent one.' },
      { step: 'experience', message: 'Please describe your previous patient-care work: families, hospitals or agencies and how long you worked with each.' },
    ],
  });
  addNotification(lakshmiUser, 'More information needed', 'Please update your documents and experience details, then resubmit.', links.application, DAY, false);

  // ── Anjali (customer) ──────────────────────────────────────────────
  db.savedProviders.set(anjali.id, new Set([sini.userId]));

  // matching: nobody covers Munnar yet
  addRequest({
    customer: anjali, service: 'travel-assistance', locality: 'munnar', source: 'quick', date: dayOffset(3), time: '07:30', hours: 8, budget: 2000,
    requirements: 'Help my parents (both over 70) on a day trip around Munnar: luggage, tickets and walks.',
    timeline: [['submitted', now - 20 * MIN], ['matching', now - 20 * MIN]],
  });

  // provider_notified: directed to Ramla, waiting for her answer
  const notified = addRequest({
    customer: anjali, service: 'beauty-grooming', locality: 'kakkanad', source: 'directed', date: dayOffset(5), time: '16:00', hours: 2, target: ramla,
    requirements: 'Mehendi for me and my cousin before a family wedding.',
    timeline: [['submitted', now - 10 * MIN], ['provider_notified', now - 10 * MIN]],
  });
  addInvitation(notified, ramla, 'viewed', now - 10 * MIN);

  // customer_confirmation_pending: two accepted, Suresh still deciding (expires in ~20 min)
  const pendingCreated = now - 100 * MIN;
  const pending = addRequest({
    customer: anjali, service: 'cleaning', locality: 'kakkanad', source: 'quick', date: dayOffset(2), time: '09:00', hours: 4, budget: 1000,
    requirements: '2 BHK flat. Please focus on the bathrooms and balcony.', areaNote: 'Flat 4B, Heather Apartments, near Infopark Phase 1',
    timeline: [['submitted', pendingCreated], ['matching', pendingCreated], ['provider_notified', pendingCreated], ['customer_confirmation_pending', now - 35 * MIN]],
  });
  addInvitation(pending, bindu, 'accepted', pendingCreated, now - 35 * MIN);
  addInvitation(pending, sini, 'accepted', pendingCreated, now - 20 * MIN);
  const sureshPendingInvite = addInvitation(pending, suresh, 'viewed', pendingCreated);

  // upcoming confirmed booking (directed, patient companion)
  const upcoming = addRequest({
    customer: anjali, service: 'patient-companion', locality: 'kakkanad', source: 'directed', date: dayOffset(1), time: '08:00', hours: 8, target: mariamma,
    requirements: 'For my mother (78): a check-up at Amrita Hospital. She needs help walking and her medicines at 1 pm.',
    areaNote: 'Villa 12, Green Meadows, Kakkanad–Seaport Road',
    timeline: [['submitted', now - 2 * DAY], ['provider_notified', now - 2 * DAY], ['customer_confirmation_pending', now - 2 * DAY + 40 * MIN], ['booking_confirmed', now - 2 * DAY + 55 * MIN]],
  });
  addInvitation(upcoming, mariamma, 'accepted', now - 2 * DAY, now - 2 * DAY + 40 * MIN);
  const upcomingBooking = addBooking(upcoming, mariamma, 'confirmed');

  // service_started today with Suresh (already started, so no start-window check applies)
  const activeStart = Math.floor((now - HOUR) / (30 * MIN)) * 30 * MIN;
  const activeSlot = slotAt(activeStart);
  const active = addRequest({
    customer: anjali, service: 'cleaning', locality: 'kakkanad', source: 'quick', date: activeSlot.date, time: activeSlot.time, hours: 4,
    requirements: 'Kitchen and living room after a family get-together.', areaNote: 'Flat 4B, Heather Apartments, near Infopark Phase 1',
    timeline: [['submitted', now - 3 * DAY], ['matching', now - 3 * DAY], ['provider_notified', now - 3 * DAY], ['customer_confirmation_pending', now - 3 * DAY + 30 * MIN], ['booking_confirmed', now - 3 * DAY + HOUR]],
  });
  addInvitation(active, suresh, 'accepted', now - 3 * DAY, now - 3 * DAY + 30 * MIN);
  addInvitation(active, bindu, 'withdrawn', now - 3 * DAY);
  const activeBooking = addBooking(active, suresh, 'service_started', { startedAt: iso(activeStart + 5 * MIN) });

  // completed, awaiting Anjali's review
  const toReview = addRequest({
    customer: anjali, service: 'homemade-food', locality: 'kakkanad', source: 'directed', date: dayOffset(-2), time: '11:00', hours: 3, target: bindu,
    requirements: 'Lunch for 4: rice, sambar, thoran and fish curry.',
    timeline: [['submitted', now - 5 * DAY], ['provider_notified', now - 5 * DAY], ['customer_confirmation_pending', now - 5 * DAY + HOUR], ['booking_confirmed', now - 5 * DAY + 2 * HOUR]],
  });
  addInvitation(toReview, bindu, 'accepted', now - 5 * DAY, now - 5 * DAY + HOUR);
  const toReviewStart = new Date(slotStartIso(toReview.preferredDate, toReview.startTime)).getTime();
  const reviewBooking = addBooking(toReview, bindu, 'service_completed', { startedAt: iso(toReviewStart + 5 * MIN), completedAt: iso(toReviewStart + 3 * HOUR) });

  // completed and reviewed
  const reviewed = addRequest({
    customer: anjali, service: 'taxi-personal-driver', locality: 'kakkanad', source: 'quick', date: dayOffset(-10), time: '08:00', hours: 6,
    requirements: 'Hospital visit to Amrita and back. Automatic sedan.',
    timeline: [['submitted', now - 12 * DAY], ['matching', now - 12 * DAY], ['provider_notified', now - 12 * DAY], ['customer_confirmation_pending', now - 12 * DAY + HOUR], ['booking_confirmed', now - 12 * DAY + 2 * HOUR]],
  });
  addInvitation(reviewed, rajesh, 'accepted', now - 12 * DAY, now - 12 * DAY + HOUR);
  const reviewedStart = new Date(slotStartIso(reviewed.preferredDate, reviewed.startTime)).getTime();
  addBooking(reviewed, rajesh, 'service_completed', {
    startedAt: iso(reviewedStart),
    completedAt: iso(reviewedStart + 6 * HOUR),
    review: { rating: 5, comment: 'Safe driver and knew every shortcut to the hospital.', createdAt: ago(9 * DAY) },
  });

  // cancelled request
  const cancelled = addRequest({
    customer: anjali, service: 'childcare-daycare', locality: 'kakkanad', source: 'quick', date: dayOffset(6), time: '10:00', hours: 5,
    cancelReason: 'My mother is visiting that week, so we will not need help.',
    timeline: [['submitted', now - 4 * DAY], ['matching', now - 4 * DAY], ['provider_notified', now - 4 * DAY], ['cancelled', now - 3 * DAY]],
  });
  addInvitation(cancelled, sini, 'withdrawn', now - 4 * DAY);

  // support ticket with a reply
  const ticketCode = db.nextCode('ticket');
  db.tickets.set(ticketCode, {
    code: ticketCode,
    userId: anjali.id,
    subject: 'Can I change the time of my patient companion booking?',
    status: 'awaiting_user',
    bookingCode: upcomingBooking.code,
    createdAt: ago(26 * HOUR),
    messages: [
      { id: newId(), body: 'Hi, the hospital moved my mother\'s appointment to later in the morning. Can Mariamma come at 10 am instead of 8?', isFromSupport: false, senderName: anjali.fullName, createdAt: ago(26 * HOUR) },
      { id: newId(), body: 'Hi Anjali, rescheduling is not available in the app yet. We have messaged Mariamma, and she can come at 10 am. Does that work for you?', isFromSupport: true, senderName: 'Fix60 Support', createdAt: ago(20 * HOUR) },
    ],
  });

  addNotification(anjali, 'Ramla viewed your request', 'Beauty and Grooming: she will reply soon.', links.customerRequest(notified.code), 5 * MIN, false);
  addNotification(anjali, 'Sini accepted your request', 'Review and confirm a provider for Cleaning.', links.customerRequest(pending.code), 20 * MIN, false);
  addNotification(anjali, 'Bindu accepted your request', 'Review and confirm a provider for Cleaning.', links.customerRequest(pending.code), 35 * MIN, false);
  addNotification(anjali, 'Service started', `Suresh has started ${activeBooking.code}.`, links.customerBooking(activeBooking.code), 55 * MIN, false);
  addNotification(anjali, 'Support replied', 'Can I change the time of my patient companion booking?', links.support(ticketCode), 20 * HOUR, true);
  addNotification(anjali, 'Service completed', `How did it go? Rate Bindu for ${reviewBooking.code}.`, links.customerBooking(reviewBooking.code), 2 * DAY, true);
  addNotification(anjali, 'Booking confirmed', `Patient Companion with Mariamma on ${upcoming.preferredDate} at 08:00.`, links.customerBooking(upcomingBooking.code), 2 * DAY - 55 * MIN, true);

  // ── Suresh (provider) ──────────────────────────────────────────────
  const sureshUser = db.requireUser(suresh.userId);
  addVerifiedDocument(suresh.userId, 'address_proof', null, 118);
  const exceptionDay = dayOffset(5);
  suresh.availability.exceptions.push({
    id: newId(),
    startsAt: slotStartIso(exceptionDay, '00:00'),
    endsAt: slotEndIso(exceptionDay, '00:00', 24),
    reason: 'Family function',
  });

  // directed invitation from Meera (fresh)
  const directed = addRequest({
    customer: meera, service: 'plumber', locality: 'edappally', source: 'directed', date: dayOffset(4), time: '10:00', hours: 2, budget: 700, target: suresh,
    requirements: 'Kitchen sink is leaking and the bathroom tap needs replacing.', areaNote: '2nd floor, Lulu Residency, behind Edappally church',
    timeline: [['submitted', now - 15 * MIN], ['provider_notified', now - 15 * MIN]],
  });
  const directedInvite = addInvitation(directed, suresh, 'invited', now - 15 * MIN);

  // declined by Suresh, accepted by Bindu
  const declined = addRequest({
    customer: joseph, service: 'cleaning', locality: 'fort-kochi', source: 'quick', date: dayOffset(3), time: '14:00', hours: 5,
    requirements: 'Old house, two floors. Windows and grills are very dusty.',
    timeline: [['submitted', now - 5 * HOUR], ['matching', now - 5 * HOUR], ['provider_notified', now - 5 * HOUR], ['customer_confirmation_pending', now - 4 * HOUR]],
  });
  addInvitation(declined, suresh, 'declined', now - 5 * HOUR, now - 4.5 * HOUR, 'Fort Kochi is too far for an afternoon slot.');
  addInvitation(declined, bindu, 'accepted', now - 5 * HOUR, now - 4 * HOUR);

  // upcoming booking with Meera
  const sureshUpcoming = addRequest({
    customer: meera, service: 'cleaning', locality: 'edappally', source: 'quick', date: dayOffset(1), time: '14:00', hours: 4,
    requirements: 'Deep clean before guests arrive: kitchen, two bathrooms and the balcony.', areaNote: '2nd floor, Lulu Residency, behind Edappally church',
    timeline: [['submitted', now - DAY], ['matching', now - DAY], ['provider_notified', now - DAY], ['customer_confirmation_pending', now - DAY + 20 * MIN], ['booking_confirmed', now - DAY + HOUR]],
  });
  addInvitation(sureshUpcoming, suresh, 'accepted', now - DAY, now - DAY + 20 * MIN);
  const sureshUpcomingBooking = addBooking(sureshUpcoming, suresh, 'confirmed');

  // past completed with review from Joseph
  const sureshPast = addRequest({
    customer: joseph, service: 'home-assistance', locality: 'fort-kochi', source: 'directed', date: dayOffset(-6), time: '09:00', hours: 4, target: suresh,
    requirements: 'Help clearing the store room and some laundry.',
    timeline: [['submitted', now - 8 * DAY], ['provider_notified', now - 8 * DAY], ['customer_confirmation_pending', now - 8 * DAY + HOUR], ['booking_confirmed', now - 8 * DAY + 2 * HOUR]],
  });
  addInvitation(sureshPast, suresh, 'accepted', now - 8 * DAY, now - 8 * DAY + HOUR);
  const sureshPastStart = new Date(slotStartIso(sureshPast.preferredDate, sureshPast.startTime)).getTime();
  const sureshPastBooking = addBooking(sureshPast, suresh, 'service_completed', {
    startedAt: iso(sureshPastStart),
    completedAt: iso(sureshPastStart + 4 * HOUR),
    review: { rating: 5, comment: 'Very thorough, he even cleaned the ceiling fans.', createdAt: ago(5 * DAY) },
  });

  // past booking cancelled by the customer
  const sureshCancelled = addRequest({
    customer: fathima, service: 'plumber', locality: 'aluva', source: 'quick', date: dayOffset(-8), time: '10:00', hours: 2,
    timeline: [['submitted', now - 11 * DAY], ['matching', now - 11 * DAY], ['provider_notified', now - 11 * DAY], ['customer_confirmation_pending', now - 11 * DAY + HOUR], ['booking_confirmed', now - 11 * DAY + 2 * HOUR]],
  });
  addInvitation(sureshCancelled, suresh, 'accepted', now - 11 * DAY, now - 11 * DAY + HOUR);
  addBooking(sureshCancelled, suresh, 'cancelled', { cancelledAt: ago(9 * DAY), cancelledBy: 'customer', cancelReason: 'The landlord fixed it before the visit.' });

  addNotification(sureshUser, 'A customer picked you', `Plumber on ${directed.preferredDate} at 10:00. Respond within 2 hours.`, links.providerInvitation(directedInvite.id), 15 * MIN, false);
  addNotification(sureshUser, 'New job invitation', `Cleaning on ${pending.preferredDate} at 09:00. Respond within 2 hours.`, links.providerInvitation(sureshPendingInvite.id), 100 * MIN, true);
  addNotification(sureshUser, 'Booking confirmed', `Meera confirmed you for Cleaning on ${sureshUpcoming.preferredDate} at 14:00.`, links.providerBooking(sureshUpcomingBooking.code), DAY - HOUR, true);
  addNotification(sureshUser, 'New 5★ review', 'Very thorough, he even cleaned the ceiling fans.', links.providerBooking(sureshPastBooking.code), 5 * DAY, true);
  addNotification(sureshUser, 'Application approved', 'You are now visible to customers and will start receiving invitations.', links.application, 113 * DAY, true);
}

let isSeeded = false;

/** Builds every collection once. Dates are relative to the moment it runs. */
export function seedDatabase(): void {
  if (isSeeded) {
    return;
  }
  isSeeded = true;
  now = Date.now();
  seedLocations();
  seedCatalog();
  seedCms();
  seedPeople();
}
