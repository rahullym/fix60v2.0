import type { DocumentType, LocalizedText, QuestionType, ServiceDetail, ServiceQuestion, ServiceRequiredDocument } from '../types';
import { db, newId } from './db';
import { mockError } from './router';

type Option = [value: string, en: string, ml: string];

interface QuestionSeed {
  key: string;
  type: QuestionType;
  label: [string, string];
  help?: [string, string];
  options?: Option[];
  isRequired?: boolean;
}

interface ServiceSeed {
  slug: string;
  name: [string, string];
  description: [string, string];
  eligibility?: ServiceDetail['eligibility'];
  documents?: { type: DocumentType; isMandatory: boolean; note?: [string, string] }[];
  questions?: QuestionSeed[];
}

interface CategorySeed {
  slug: string;
  name: [string, string];
  description: [string, string];
  services: ServiceSeed[];
}

const text = ([en, ml]: [string, string]): LocalizedText => ({ en, ml });

const POLICE_CLEARANCE = {
  type: 'police_clearance' as const,
  isMandatory: true,
  note: ['Police clearance certificate issued in the last 6 months.', 'കഴിഞ്ഞ 6 മാസത്തിനുള്ളിൽ ലഭിച്ച പോലീസ് ക്ലിയറൻസ് സർട്ടിഫിക്കറ്റ്.'] as [string, string],
};

const CATALOG: CategorySeed[] = [
  {
    slug: 'cleaning',
    name: ['Cleaning', 'ശുചീകരണം'],
    description: ['Regular, deep and kitchen cleaning by verified helpers.', 'പരിശോധിച്ച സഹായികളുടെ പതിവ്, ആഴത്തിലുള്ള, അടുക്കള ശുചീകരണം.'],
    services: [
      {
        slug: 'house-cleaning',
        name: ['House cleaning', 'വീട് വൃത്തിയാക്കൽ'],
        description: ['Sweeping, mopping, dusting and bathrooms.', 'അടിച്ചുവാരൽ, തുടയ്ക്കൽ, പൊടി തട്ടൽ, ബാത്ത്റൂം വൃത്തിയാക്കൽ.'],
        questions: [
          {
            key: 'home_size',
            type: 'single_select',
            label: ['Home size', 'വീടിന്റെ വലിപ്പം'],
            options: [
              ['1bhk', '1 BHK', '1 ബിഎച്ച്കെ'],
              ['2bhk', '2 BHK', '2 ബിഎച്ച്കെ'],
              ['3bhk', '3 BHK', '3 ബിഎച്ച്കെ'],
              ['4bhk_plus', '4 BHK or larger', '4 ബിഎച്ച്കെ അല്ലെങ്കിൽ അതിൽ കൂടുതൽ'],
            ],
            isRequired: true,
          },
          { key: 'has_pets', type: 'boolean', label: ['Are there pets at home?', 'വീട്ടിൽ വളർത്തുമൃഗങ്ങളുണ്ടോ?'] },
        ],
      },
      {
        slug: 'deep-cleaning',
        name: ['Deep cleaning', 'ഡീപ് ക്ലീനിംഗ്'],
        description: ['Top-to-bottom cleaning for move-ins, festivals and after renovation.', 'താമസം മാറുമ്പോഴും ഉത്സവങ്ങൾക്കും പണിക്കുശേഷവും സമ്പൂർണ ശുചീകരണം.'],
        questions: [
          {
            key: 'areas',
            type: 'multi_select',
            label: ['Areas to cover', 'വൃത്തിയാക്കേണ്ട ഭാഗങ്ങൾ'],
            options: [
              ['kitchen', 'Kitchen', 'അടുക്കള'],
              ['bathrooms', 'Bathrooms', 'ബാത്ത്റൂമുകൾ'],
              ['windows', 'Windows and grills', 'ജനലുകളും ഗ്രില്ലുകളും'],
              ['sofa', 'Sofa and upholstery', 'സോഫയും കുഷ്യനുകളും'],
            ],
            isRequired: true,
          },
          {
            key: 'bring_supplies',
            type: 'boolean',
            label: ['Should the helper bring cleaning supplies?', 'സഹായി ശുചീകരണ സാധനങ്ങൾ കൊണ്ടുവരണോ?'],
            help: ['Supplies may be charged separately.', 'സാധനങ്ങൾക്ക് പ്രത്യേക തുക ഈടാക്കിയേക്കാം.'],
          },
        ],
      },
      {
        slug: 'kitchen-cleaning',
        name: ['Kitchen cleaning', 'അടുക്കള വൃത്തിയാക്കൽ'],
        description: ['Degreasing counters, cabinets, stove and chimney.', 'കൗണ്ടർ, കബോർഡ്, സ്റ്റൗ, ചിമ്മിനി എന്നിവയിലെ എണ്ണമെഴുക്ക് നീക്കൽ.'],
        questions: [{ key: 'has_chimney', type: 'boolean', label: ['Is there a chimney to clean?', 'വൃത്തിയാക്കേണ്ട ചിമ്മിനി ഉണ്ടോ?'] }],
      },
    ],
  },
  {
    slug: 'cooking',
    name: ['Cooking', 'പാചകം'],
    description: ['Home cooks for daily meals and special occasions.', 'ദിവസേനയുള്ള ഭക്ഷണത്തിനും വിശേഷാവസരങ്ങൾക്കും പാചകക്കാർ.'],
    services: [
      {
        slug: 'daily-cook',
        name: ['Daily cook', 'ദിവസേന പാചകം'],
        description: ['Breakfast, lunch or dinner cooked in your kitchen.', 'നിങ്ങളുടെ അടുക്കളയിൽ പ്രാതൽ, ഉച്ചഭക്ഷണം അല്ലെങ്കിൽ അത്താഴം.'],
        questions: [
          {
            key: 'cuisines',
            type: 'multi_select',
            label: ['Cuisines', 'ഭക്ഷണരീതികൾ'],
            options: [
              ['kerala', 'Kerala', 'കേരളം'],
              ['north_indian', 'North Indian', 'നോർത്ത് ഇന്ത്യൻ'],
              ['chinese', 'Indo-Chinese', 'ഇൻഡോ-ചൈനീസ്'],
            ],
          },
          { key: 'people', type: 'number', label: ['Number of people', 'ആളുകളുടെ എണ്ണം'], isRequired: true },
          {
            key: 'diet',
            type: 'single_select',
            label: ['Diet', 'ഭക്ഷണക്രമം'],
            options: [
              ['veg', 'Vegetarian only', 'സസ്യാഹാരം മാത്രം'],
              ['non_veg', 'Vegetarian and non-vegetarian', 'സസ്യാഹാരവും മാംസാഹാരവും'],
            ],
          },
        ],
      },
      {
        slug: 'party-cook',
        name: ['Party / event cook', 'പാർട്ടി / ചടങ്ങ് പാചകം'],
        description: ['Cooking for birthdays, house-warmings and family functions.', 'ജന്മദിനം, ഗൃഹപ്രവേശം, കുടുംബ ചടങ്ങുകൾ എന്നിവയ്ക്ക് പാചകം.'],
        questions: [
          { key: 'guests', type: 'number', label: ['Number of guests', 'അതിഥികളുടെ എണ്ണം'], isRequired: true },
          { key: 'menu', type: 'textarea', label: ['Menu ideas', 'മെനു നിർദ്ദേശങ്ങൾ'], help: ['For example: sadya, biryani, snacks.', 'ഉദാഹരണം: സദ്യ, ബിരിയാണി, പലഹാരങ്ങൾ.'] },
          { key: 'event_date', type: 'date', label: ['Event date', 'ചടങ്ങിന്റെ തീയതി'] },
        ],
      },
    ],
  },
  {
    slug: 'care',
    name: ['Care at home', 'വീട്ടിലെ പരിചരണം'],
    description: ['Caring help for elders, patients and little ones.', 'മുതിർന്നവർക്കും രോഗികൾക്കും കുഞ്ഞുങ്ങൾക്കും പരിചരണം.'],
    services: [
      {
        slug: 'elder-care',
        name: ['Elder care', 'വയോജന പരിചരണം'],
        description: ['Companionship, meals, medicines and mobility support.', 'കൂട്ട്, ഭക്ഷണം, മരുന്നുകൾ, നടക്കാനുള്ള സഹായം.'],
        documents: [POLICE_CLEARANCE],
        questions: [
          {
            key: 'mobility',
            type: 'single_select',
            label: ['Mobility', 'ചലനശേഷി'],
            options: [
              ['independent', 'Walks independently', 'സ്വയം നടക്കും'],
              ['needs_support', 'Needs support to walk', 'നടക്കാൻ സഹായം വേണം'],
              ['bedridden', 'Bedridden', 'കിടപ്പിലാണ്'],
            ],
            isRequired: true,
          },
          { key: 'conditions', type: 'textarea', label: ['Health conditions to know about', 'അറിയേണ്ട ആരോഗ്യ പ്രശ്നങ്ങൾ'] },
        ],
      },
      {
        slug: 'patient-care',
        name: ['Patient care (home nurse aide)', 'രോഗീ പരിചരണം (ഹോം നഴ്സ് സഹായി)'],
        description: ['Post-hospital care, hygiene and medicine reminders. Not a medical service.', 'ആശുപത്രിക്കു ശേഷമുള്ള പരിചരണം, ശുചിത്വം, മരുന്ന് ഓർമ്മപ്പെടുത്തൽ. ഇത് ചികിത്സാ സേവനമല്ല.'],
        eligibility: { requiresGender: false },
        documents: [
          POLICE_CLEARANCE,
          { type: 'training_certificate', isMandatory: false, note: ['Nursing assistant or GDA training, if any.', 'നഴ്സിംഗ് അസിസ്റ്റന്റ് / ജിഡിഎ പരിശീലനം ഉണ്ടെങ്കിൽ.'] },
        ],
        questions: [
          { key: 'condition', type: 'textarea', label: ['Patient condition', 'രോഗിയുടെ അവസ്ഥ'], isRequired: true },
          { key: 'overnight', type: 'boolean', label: ['Overnight stay needed?', 'രാത്രി താമസം ആവശ്യമുണ്ടോ?'] },
        ],
      },
      {
        slug: 'baby-care',
        name: ['Baby care / nanny', 'കുഞ്ഞു പരിചരണം / നാനി'],
        description: ['Feeding, bathing, play and naps for babies and toddlers.', 'കുഞ്ഞുങ്ങൾക്ക് ഭക്ഷണം, കുളി, കളി, ഉറക്കം.'],
        eligibility: { requiresGender: false },
        documents: [POLICE_CLEARANCE],
        questions: [
          {
            key: 'child_age',
            type: 'single_select',
            label: ['Age of the youngest child', 'ഏറ്റവും ഇളയ കുട്ടിയുടെ പ്രായം'],
            options: [
              ['0_1', 'Under 1 year', '1 വയസ്സിൽ താഴെ'],
              ['1_3', '1–3 years', '1–3 വയസ്സ്'],
              ['3_6', '3–6 years', '3–6 വയസ്സ്'],
            ],
            isRequired: true,
          },
          { key: 'children', type: 'number', label: ['Number of children', 'കുട്ടികളുടെ എണ്ണം'] },
        ],
      },
    ],
  },
  {
    slug: 'driving',
    name: ['Driver', 'ഡ്രൈവർ'],
    description: ['Experienced drivers for your own car.', 'നിങ്ങളുടെ കാറിന് പരിചയസമ്പന്നരായ ഡ്രൈവർമാർ.'],
    services: [
      {
        slug: 'personal-driver',
        name: ['Personal driver', 'സ്വകാര്യ ഡ്രൈവർ'],
        description: ['Drives your car for office runs, hospital visits and trips.', 'ഓഫീസ്, ആശുപത്രി, യാത്രകൾക്ക് നിങ്ങളുടെ കാർ ഓടിക്കും.'],
        eligibility: { minYearsExperience: 2 },
        documents: [{ type: 'driving_licence', isMandatory: true, note: ['A valid LMV licence.', 'സാധുവായ എൽഎംവി ലൈസൻസ്.'] }],
        questions: [
          {
            key: 'vehicle_type',
            type: 'single_select',
            label: ['Vehicle type', 'വാഹന തരം'],
            options: [
              ['hatchback', 'Hatchback', 'ഹാച്ച്ബാക്ക്'],
              ['sedan', 'Sedan', 'സെഡാൻ'],
              ['suv', 'SUV', 'എസ്‌യുവി'],
            ],
            isRequired: true,
          },
          {
            key: 'transmission',
            type: 'single_select',
            label: ['Transmission', 'ഗിയർ സംവിധാനം'],
            options: [
              ['manual', 'Manual', 'മാനുവൽ'],
              ['automatic', 'Automatic', 'ഓട്ടോമാറ്റിക്'],
            ],
          },
        ],
      },
    ],
  },
  {
    slug: 'home-help',
    name: ['Laundry & home help', 'അലക്കും വീട്ടുസഹായവും'],
    description: ['Washing, ironing and folding at home.', 'വീട്ടിൽ തന്നെ അലക്കൽ, ഇസ്തിരിയിടൽ, മടക്കൽ.'],
    services: [
      {
        slug: 'laundry-ironing',
        name: ['Laundry & ironing', 'അലക്കലും ഇസ്തിരിയിടലും'],
        description: ['Machine or hand wash, drying and ironing.', 'മെഷീനിലോ കൈകൊണ്ടോ അലക്കൽ, ഉണക്കൽ, ഇസ്തിരിയിടൽ.'],
      },
    ],
  },
  {
    slug: 'outdoor',
    name: ['Garden & outdoor', 'തോട്ടവും പുറംപണിയും'],
    description: ['Garden upkeep, weeding and plant care.', 'തോട്ട പരിപാലനം, കള പറിക്കൽ, ചെടി പരിചരണം.'],
    services: [
      {
        slug: 'gardening',
        name: ['Gardening', 'തോട്ടപ്പണി'],
        description: ['Weeding, pruning, watering and potting.', 'കള പറിക്കൽ, കൊമ്പുകോതൽ, നനയ്ക്കൽ, ചട്ടിയിൽ നടൽ.'],
        questions: [
          {
            key: 'garden_size',
            type: 'single_select',
            label: ['Garden size', 'തോട്ടത്തിന്റെ വലിപ്പം'],
            options: [
              ['balcony', 'Balcony / terrace', 'ബാൽക്കണി / ടെറസ്'],
              ['small', 'Small yard', 'ചെറിയ മുറ്റം'],
              ['large', 'Large compound', 'വലിയ പുരയിടം'],
            ],
          },
          { key: 'plants', type: 'text', label: ['Main plants or trees', 'പ്രധാന ചെടികൾ / മരങ്ങൾ'] },
        ],
      },
    ],
  },
];

/** Fills `db.categories` and `db.services`. */
export function seedCatalog(): void {
  CATALOG.forEach((category, categoryIndex) => {
    const categoryId = newId();
    db.categories.push({
      id: categoryId,
      slug: category.slug,
      name: text(category.name),
      description: text(category.description),
      imageUrl: null,
      sortOrder: categoryIndex,
    });
    for (const service of category.services) {
      const requiredDocuments: ServiceRequiredDocument[] = [
        { documentType: 'id_proof', isMandatory: true, note: { en: 'Aadhaar, voter ID or passport.', ml: 'ആധാർ, വോട്ടർ ഐഡി അല്ലെങ്കിൽ പാസ്‌പോർട്ട്.' } },
        ...(service.documents ?? []).map((doc) => ({
          documentType: doc.type,
          isMandatory: doc.isMandatory,
          note: doc.note ? text(doc.note) : null,
        })),
      ];
      const questions: ServiceQuestion[] = (service.questions ?? []).map((question) => ({
        id: newId(),
        key: question.key,
        type: question.type,
        label: text(question.label),
        helpText: question.help ? text(question.help) : null,
        options: question.options ? question.options.map(([value, en, ml]) => ({ value, label: { en, ml } })) : null,
        isRequired: question.isRequired ?? false,
      }));
      const id = newId();
      db.services.set(id, {
        id,
        slug: service.slug,
        categoryId,
        name: text(service.name),
        description: text(service.description),
        imageUrl: null,
        eligibility: service.eligibility ?? {},
        requiredDocuments,
        questions,
      });
    }
  });
}

/** Seed-time lookup by slug; throws when missing. */
export function serviceBySlug(slug: string): ServiceDetail {
  const service = [...db.services.values()].find((candidate) => candidate.slug === slug);
  if (!service) {
    throw mockError(500, 'INTERNAL_ERROR', `Unknown seed service ${slug}`);
  }
  return service;
}
