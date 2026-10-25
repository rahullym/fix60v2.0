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

interface DocumentSeed {
  type: DocumentType;
  isMandatory: boolean;
  note?: [string, string];
}

interface ServiceSeed {
  slug: string;
  name: [string, string];
  description: [string, string];
  eligibility?: ServiceDetail['eligibility'];
  /** Extra documents; ID proof is always required. */
  documents?: DocumentSeed[];
  questions: QuestionSeed[];
}

interface CategorySeed {
  slug: string;
  name: [string, string];
  description: [string, string];
  services: ServiceSeed[];
}

const text = ([en, ml]: [string, string]): LocalizedText => ({ en, ml });

const ID_PROOF: ServiceRequiredDocument = {
  documentType: 'id_proof',
  isMandatory: true,
  note: { en: 'Aadhaar, voter ID or passport.', ml: 'ആധാർ, വോട്ടർ ഐഡി അല്ലെങ്കിൽ പാസ്‌പോർട്ട്.' },
};

const DRIVING_LICENCE: DocumentSeed = {
  type: 'driving_licence',
  isMandatory: true,
  note: ['A valid licence for the vehicles you drive.', 'നിങ്ങൾ ഓടിക്കുന്ന വാഹനങ്ങൾക്കുള്ള സാധുവായ ലൈസൻസ്.'],
};

const POLICE_CLEARANCE: DocumentSeed = {
  type: 'police_clearance',
  isMandatory: true,
  note: ['Police clearance certificate issued in the last 6 months.', 'കഴിഞ്ഞ 6 മാസത്തിനുള്ളിൽ ലഭിച്ച പോലീസ് ക്ലിയറൻസ് സർട്ടിഫിക്കറ്റ്.'],
};

/* Provider-facing questions. Transport, patient, trade, mechanic and childcare sets mirror fix60_backend seed-data.ts. */

const DRIVER_QUESTIONS: QuestionSeed[] = [
  { key: 'driving_experience_years', type: 'number', label: ['Years of driving experience', 'ഡ്രൈവിംഗ് പരിചയം (വർഷം)'], isRequired: true },
  {
    key: 'licence_categories',
    type: 'multi_select',
    label: ['Driving licence categories held', 'കൈവശമുള്ള ഡ്രൈവിംഗ് ലൈസൻസ് വിഭാഗങ്ങൾ'],
    options: [
      ['mcwg', 'Motorcycle with gear (MCWG)', 'ഗിയറുള്ള മോട്ടോർസൈക്കിൾ (MCWG)'],
      ['lmv', 'Light motor vehicle (LMV)', 'ലഘു മോട്ടോർ വാഹനം (LMV)'],
      ['lmv_tr', 'Light motor vehicle, transport (LMV-TR)', 'ലഘു മോട്ടോർ വാഹനം, ട്രാൻസ്പോർട്ട് (LMV-TR)'],
      ['hmv', 'Heavy motor vehicle (HMV)', 'ഹെവി മോട്ടോർ വാഹനം (HMV)'],
    ],
    isRequired: true,
  },
  {
    key: 'vehicle_types',
    type: 'multi_select',
    label: ['Vehicle types you can drive', 'നിങ്ങൾക്ക് ഓടിക്കാവുന്ന വാഹനങ്ങൾ'],
    options: [
      ['two_wheeler', 'Two-wheeler', 'ഇരുചക്ര വാഹനം'],
      ['car_manual', 'Car (manual)', 'കാർ (മാനുവൽ)'],
      ['car_automatic', 'Car (automatic)', 'കാർ (ഓട്ടോമാറ്റിക്)'],
      ['suv_van', 'SUV / van', 'എസ്‌യുവി / വാൻ'],
    ],
    isRequired: true,
  },
  { key: 'owns_vehicle', type: 'boolean', label: ['Do you have your own vehicle?', 'നിങ്ങൾക്ക് സ്വന്തം വാഹനമുണ്ടോ?'], isRequired: true },
  {
    key: 'has_commercial_licence',
    type: 'boolean',
    label: ['Do you hold a commercial (transport) licence?', 'നിങ്ങൾക്ക് കൊമേഴ്‌സ്യൽ (ട്രാൻസ്പോർട്ട്) ലൈസൻസ് ഉണ്ടോ?'],
    isRequired: true,
  },
];

const PATIENT_QUESTIONS: QuestionSeed[] = [
  { key: 'relevant_experience', type: 'textarea', label: ['Relevant patient-care experience', 'രോഗീ പരിചരണത്തിലെ പരിചയം'], isRequired: true },
  { key: 'training', type: 'textarea', label: ['Training completed', 'പൂർത്തിയാക്കിയ പരിശീലനം'] },
  { key: 'qualifications', type: 'text', label: ['Qualifications (e.g. GNM, ANM, caregiver course)', 'യോഗ്യതകൾ (ഉദാ. GNM, ANM, കെയർഗിവർ കോഴ്സ്)'] },
  { key: 'previous_work', type: 'textarea', label: ['Previous work (hospitals, homes, agencies)', 'മുൻ ജോലി (ആശുപത്രികൾ, വീടുകൾ, ഏജൻസികൾ)'] },
];

const TRADE_QUESTIONS: QuestionSeed[] = [
  { key: 'experience_years', type: 'number', label: ['Years of experience', 'പരിചയം (വർഷം)'], isRequired: true },
  { key: 'qualification_or_training', type: 'text', label: ['Qualification or training (e.g. ITI)', 'യോഗ്യത അല്ലെങ്കിൽ പരിശീലനം (ഉദാ. ഐടിഐ)'] },
  { key: 'tools_available', type: 'boolean', label: ['Do you bring your own tools?', 'സ്വന്തം ഉപകരണങ്ങൾ കൊണ്ടുവരുമോ?'], isRequired: true },
];

const MECHANIC_QUESTIONS: QuestionSeed[] = [
  { key: 'experience_years', type: 'number', label: ['Years of experience', 'പരിചയം (വർഷം)'], isRequired: true },
  {
    key: 'specialisation',
    type: 'multi_select',
    label: ['Equipment or vehicle specialisation', 'പ്രത്യേക വൈദഗ്ധ്യമുള്ള വാഹനങ്ങൾ / ഉപകരണങ്ങൾ'],
    options: [
      ['two_wheeler', 'Two-wheelers', 'ഇരുചക്ര വാഹനങ്ങൾ'],
      ['car', 'Cars', 'കാറുകൾ'],
      ['heavy_vehicle', 'Heavy vehicles', 'ഹെവി വാഹനങ്ങൾ'],
      ['home_appliances', 'Home appliances', 'വീട്ടുപകരണങ്ങൾ'],
    ],
    isRequired: true,
  },
  { key: 'tools_available', type: 'boolean', label: ['Do you bring your own tools?', 'സ്വന്തം ഉപകരണങ്ങൾ കൊണ്ടുവരുമോ?'], isRequired: true },
];

const CHILDCARE_QUESTIONS: QuestionSeed[] = [
  { key: 'relevant_experience', type: 'textarea', label: ['Relevant childcare experience', 'ശിശുപരിചരണത്തിലെ പരിചയം'], isRequired: true },
  { key: 'training_qualifications', type: 'textarea', label: ['Training and qualifications', 'പരിശീലനവും യോഗ്യതകളും'] },
  { key: 'references', type: 'textarea', label: ['References (name and contact)', 'റഫറൻസുകൾ (പേരും ഫോൺ നമ്പറും)'] },
  {
    key: 'safeguarding_info',
    type: 'textarea',
    label: ['Safeguarding: anything we should know, and any child-safety training', 'കുട്ടികളുടെ സുരക്ഷ: ഞങ്ങൾ അറിയേണ്ട കാര്യങ്ങളും ശിശു സുരക്ഷാ പരിശീലനവും'],
    isRequired: true,
  },
];

/** Categories and services mirror fix60_backend seed-data.ts (`initialCatalog`); the empty "other" category is skipped. */
const CATALOG: CategorySeed[] = [
  {
    slug: 'transport',
    name: ['Transport Services', 'യാത്രാ സേവനങ്ങൾ'],
    description: ['Licensed drivers for your car or theirs.', 'നിങ്ങളുടെയോ അവരുടെയോ വാഹനത്തിന് ലൈസൻസുള്ള ഡ്രൈവർമാർ.'],
    services: [
      {
        slug: 'taxi-personal-driver',
        name: ['Taxi / Personal Driver', 'ടാക്സി / സ്വകാര്യ ഡ്രൈവർ'],
        description: ['A licensed driver for your car or theirs, by the hour or day.', 'മണിക്കൂറിനോ ദിവസത്തിനോ, നിങ്ങളുടെയോ അവരുടെയോ കാറിന് ലൈസൻസുള്ള ഡ്രൈവർ.'],
        documents: [DRIVING_LICENCE],
        questions: DRIVER_QUESTIONS,
      },
      {
        slug: 'driver-shopping-assistance',
        name: ['Driver with Shopping Assistance', 'ഷോപ്പിംഗ് സഹായത്തോടെ ഡ്രൈവർ'],
        description: ['A driver who also helps with shopping and carrying purchases.', 'ഷോപ്പിംഗിനും സാധനങ്ങൾ ചുമക്കാനും സഹായിക്കുന്ന ഡ്രൈവർ.'],
        documents: [DRIVING_LICENCE],
        questions: DRIVER_QUESTIONS,
      },
    ],
  },
  {
    slug: 'patient-support',
    name: ['Patient Support', 'രോഗീ സഹായം'],
    description: ['Non-medical care and company for patients.', 'രോഗികൾക്ക് ചികിത്സേതര പരിചരണവും കൂട്ടും.'],
    services: [
      {
        slug: 'patient-care-assistance',
        name: ['Patient Care Assistance', 'രോഗീ പരിചരണ സഹായം'],
        description: ['Non-medical daily care for patients at home or in hospital.', 'വീട്ടിലോ ആശുപത്രിയിലോ രോഗികൾക്ക് ചികിത്സേതര ദൈനംദിന പരിചരണം.'],
        documents: [POLICE_CLEARANCE],
        questions: PATIENT_QUESTIONS,
      },
      {
        slug: 'patient-companion',
        name: ['Patient Companion', 'രോഗിക്ക് കൂട്ട്'],
        description: ['Company and support for hospital visits, stays and recovery at home.', 'ആശുപത്രി സന്ദർശനം, താമസം, വീട്ടിലെ സുഖംപ്രാപിക്കൽ എന്നിവയ്ക്ക് കൂട്ടും സഹായവും.'],
        documents: [POLICE_CLEARANCE],
        questions: PATIENT_QUESTIONS,
      },
    ],
  },
  {
    slug: 'personal-daily-assistance',
    name: ['Personal and Daily Assistance', 'വ്യക്തിപരവും ദൈനംദിനവുമായ സഹായം'],
    description: ['A helping hand for errands, travel and time at home.', 'ആവശ്യങ്ങൾക്കും യാത്രയ്ക്കും വീട്ടിലും ഒരു കൈസഹായം.'],
    services: [
      {
        slug: 'shopping-assistance',
        name: ['Shopping Assistance', 'ഷോപ്പിംഗ് സഹായം'],
        description: ['Help with grocery and household shopping.', 'പലചരക്കും വീട്ടുസാധനങ്ങളും വാങ്ങാൻ സഹായം.'],
        questions: [
          { key: 'own_transport', type: 'boolean', label: ['Do you have your own two-wheeler or car?', 'സ്വന്തമായി ഇരുചക്രവാഹനമോ കാറോ ഉണ്ടോ?'], isRequired: true },
          { key: 'areas_known', type: 'text', label: ['Markets and shops you know well', 'നന്നായി അറിയാവുന്ന മാർക്കറ്റുകളും കടകളും'] },
        ],
      },
      {
        slug: 'travel-assistance',
        name: ['Travel Assistance', 'യാത്രാ സഹായം'],
        description: ['A companion to help with travel, tickets and luggage.', 'യാത്ര, ടിക്കറ്റ്, ലഗേജ് എന്നിവയ്ക്ക് സഹായിക്കുന്ന കൂട്ടാളി.'],
        questions: [
          {
            key: 'travel_modes',
            type: 'multi_select',
            label: ['Travel you can help with', 'സഹായിക്കാവുന്ന യാത്രകൾ'],
            options: [
              ['bus', 'Bus', 'ബസ്'],
              ['train', 'Train', 'ട്രെയിൻ'],
              ['flight', 'Flight', 'വിമാനം'],
              ['car', 'Car', 'കാർ'],
            ],
            isRequired: true,
          },
          { key: 'overnight_travel', type: 'boolean', label: ['Can you travel overnight?', 'രാത്രി യാത്ര ചെയ്യാൻ കഴിയുമോ?'] },
        ],
      },
      {
        slug: 'home-stay-assistance',
        name: ['Home Stay Assistance', 'വീട്ടിൽ താമസിച്ചുള്ള സഹായം'],
        description: ['Someone to stay at home to help an elderly or unwell family member.', 'പ്രായമായതോ അസുഖമുള്ളതോ ആയ കുടുംബാംഗത്തെ സഹായിക്കാൻ വീട്ടിൽ താമസിക്കുന്ന ഒരാൾ.'],
        questions: [
          { key: 'overnight_stay', type: 'boolean', label: ['Can you stay overnight?', 'രാത്രി താമസിക്കാൻ കഴിയുമോ?'], isRequired: true },
          { key: 'max_stay_days', type: 'number', label: ['Longest continuous stay you can do (days)', 'തുടർച്ചയായി താമസിക്കാവുന്ന പരമാവധി ദിവസങ്ങൾ'] },
        ],
      },
    ],
  },
  {
    slug: 'home-services',
    name: ['Home Services', 'വീട്ടു സേവനങ്ങൾ'],
    description: ['Cleaning, repairs and everyday help around the house.', 'ശുചീകരണം, അറ്റകുറ്റപ്പണി, വീട്ടിലെ ദൈനംദിന സഹായം.'],
    services: [
      {
        slug: 'home-assistance',
        name: ['Home Assistance', 'വീട്ടു സഹായം'],
        description: ['Everyday help around the house.', 'വീട്ടിലെ ദൈനംദിന സഹായം.'],
        questions: [
          {
            key: 'tasks',
            type: 'multi_select',
            label: ['Tasks you can do', 'ചെയ്യാവുന്ന ജോലികൾ'],
            options: [
              ['cleaning', 'Cleaning', 'ശുചീകരണം'],
              ['cooking', 'Cooking', 'പാചകം'],
              ['laundry', 'Laundry and ironing', 'അലക്കും ഇസ്തിരിയും'],
              ['errands', 'Errands', 'പുറം ആവശ്യങ്ങൾ'],
            ],
            isRequired: true,
          },
          { key: 'experience_years', type: 'number', label: ['Years of experience', 'പരിചയം (വർഷം)'] },
        ],
      },
      {
        slug: 'cleaning',
        name: ['Cleaning', 'ശുചീകരണം'],
        description: ['Home and deep cleaning.', 'വീട് വൃത്തിയാക്കലും ഡീപ് ക്ലീനിംഗും.'],
        questions: [
          {
            key: 'cleaning_types',
            type: 'multi_select',
            label: ['Cleaning you offer', 'നിങ്ങൾ ചെയ്യുന്ന ശുചീകരണം'],
            options: [
              ['regular', 'Regular home cleaning', 'പതിവ് വീട് വൃത്തിയാക്കൽ'],
              ['deep', 'Deep cleaning', 'ഡീപ് ക്ലീനിംഗ്'],
              ['kitchen', 'Kitchen and chimney', 'അടുക്കളയും ചിമ്മിനിയും'],
              ['bathroom', 'Bathrooms', 'ബാത്ത്റൂമുകൾ'],
            ],
            isRequired: true,
          },
          {
            key: 'team_size',
            type: 'single_select',
            label: ['Do you work alone or with a team?', 'ഒറ്റയ്ക്കാണോ ടീമായാണോ ജോലി ചെയ്യുന്നത്?'],
            options: [
              ['alone', 'Alone', 'ഒറ്റയ്ക്ക്'],
              ['with_helper', 'With one helper', 'ഒരു സഹായിയോടൊപ്പം'],
              ['team', 'Team of 3 or more', '3-ഓ അതിലധികമോ പേരുള്ള ടീം'],
            ],
            isRequired: true,
          },
          { key: 'bring_supplies', type: 'boolean', label: ['Can you bring cleaning supplies?', 'ശുചീകരണ സാധനങ്ങൾ കൊണ്ടുവരാൻ കഴിയുമോ?'] },
        ],
      },
      {
        slug: 'electrician',
        name: ['Electrician', 'ഇലക്ട്രീഷ്യൻ'],
        description: ['Wiring, fittings, fans, lights and fault finding.', 'വയറിംഗ്, ഫിറ്റിംഗ്, ഫാൻ, ലൈറ്റ്, തകരാർ കണ്ടെത്തൽ.'],
        questions: TRADE_QUESTIONS,
      },
      {
        slug: 'plumber',
        name: ['Plumber', 'പ്ലംബർ'],
        description: ['Leaks, taps, pipes, tanks and bathroom fittings.', 'ചോർച്ച, ടാപ്പ്, പൈപ്പ്, ടാങ്ക്, ബാത്ത്റൂം ഫിറ്റിംഗുകൾ.'],
        questions: TRADE_QUESTIONS,
      },
      {
        slug: 'mechanic',
        name: ['Mechanic', 'മെക്കാനിക്ക്'],
        description: ['Vehicle and equipment repairs at your location.', 'നിങ്ങളുടെ സ്ഥലത്ത് വാഹനങ്ങളുടെയും ഉപകരണങ്ങളുടെയും അറ്റകുറ്റപ്പണി.'],
        questions: MECHANIC_QUESTIONS,
      },
    ],
  },
  {
    slug: 'personal-care',
    name: ['Personal Care', 'വ്യക്തിഗത പരിചരണം'],
    description: ['Beauty and grooming at home.', 'വീട്ടിൽ സൗന്ദര്യ പരിചരണം.'],
    services: [
      {
        slug: 'beauty-grooming',
        name: ['Beauty and Grooming', 'സൗന്ദര്യവും ഗ്രൂമിംഗും'],
        description: ['Hair, skin and grooming services at home.', 'വീട്ടിൽ മുടി, ചർമ്മം, ഗ്രൂമിംഗ് സേവനങ്ങൾ.'],
        questions: [
          {
            key: 'services_offered',
            type: 'multi_select',
            label: ['Services you offer', 'നിങ്ങൾ നൽകുന്ന സേവനങ്ങൾ'],
            options: [
              ['haircut', 'Haircut and styling', 'ഹെയർകട്ടും സ്റ്റൈലിംഗും'],
              ['facial', 'Facial and skin care', 'ഫേഷ്യലും ചർമ്മ പരിചരണവും'],
              ['threading_waxing', 'Threading and waxing', 'ത്രെഡിംഗും വാക്സിംഗും'],
              ['bridal', 'Bridal makeup', 'വധുവിന്റെ മേക്കപ്പ്'],
              ['mehendi', 'Mehendi', 'മൈലാഞ്ചി'],
            ],
            isRequired: true,
          },
          {
            key: 'training_level',
            type: 'single_select',
            label: ['Beauty training', 'സൗന്ദര്യ പരിശീലനം'],
            options: [
              ['self_taught', 'Self-taught', 'സ്വയം പഠിച്ചത്'],
              ['short_course', 'Short course', 'ഹ്രസ്വ കോഴ്സ്'],
              ['diploma', 'Diploma or certificate', 'ഡിപ്ലോമ അല്ലെങ്കിൽ സർട്ടിഫിക്കറ്റ്'],
            ],
            isRequired: true,
          },
          { key: 'bring_kit', type: 'boolean', label: ['Do you bring your own kit and products?', 'സ്വന്തം കിറ്റും ഉൽപ്പന്നങ്ങളും കൊണ്ടുവരുമോ?'] },
        ],
      },
    ],
  },
  {
    slug: 'childcare',
    name: ['Childcare', 'ശിശുപരിചരണം'],
    description: ['Safe, caring supervision for children.', 'കുട്ടികൾക്ക് സുരക്ഷിതവും സ്നേഹപൂർണവുമായ പരിചരണം.'],
    services: [
      {
        slug: 'childcare-daycare',
        name: ['Childcare / Daycare', 'ശിശുപരിചരണം / ഡേകെയർ'],
        description: ['Care and supervision for children at home.', 'വീട്ടിൽ കുട്ടികൾക്ക് പരിചരണവും മേൽനോട്ടവും.'],
        documents: [POLICE_CLEARANCE],
        questions: CHILDCARE_QUESTIONS,
      },
    ],
  },
  {
    slug: 'food',
    name: ['Food', 'ഭക്ഷണം'],
    description: ['Home-cooked meals from local cooks.', 'നാട്ടിലെ പാചകക്കാരുടെ വീട്ടുഭക്ഷണം.'],
    services: [
      {
        slug: 'homemade-food',
        name: ['Homemade Food', 'വീട്ടിലുണ്ടാക്കിയ ഭക്ഷണം'],
        description: ['Home-cooked meals prepared by local cooks.', 'നാട്ടിലെ പാചകക്കാർ തയ്യാറാക്കുന്ന വീട്ടുഭക്ഷണം.'],
        questions: [
          {
            key: 'cuisines',
            type: 'multi_select',
            label: ['Cuisines you cook', 'നിങ്ങൾ പാചകം ചെയ്യുന്ന ഭക്ഷണരീതികൾ'],
            options: [
              ['kerala', 'Kerala', 'കേരളം'],
              ['malabar', 'Malabar', 'മലബാർ'],
              ['north_indian', 'North Indian', 'നോർത്ത് ഇന്ത്യൻ'],
              ['indo_chinese', 'Indo-Chinese', 'ഇൻഡോ-ചൈനീസ്'],
            ],
            isRequired: true,
          },
          {
            key: 'diet',
            type: 'single_select',
            label: ['What do you cook?', 'എന്താണ് പാചകം ചെയ്യുന്നത്?'],
            options: [
              ['veg', 'Vegetarian only', 'സസ്യാഹാരം മാത്രം'],
              ['veg_non_veg', 'Vegetarian and non-vegetarian', 'സസ്യാഹാരവും മാംസാഹാരവും'],
            ],
            isRequired: true,
          },
          { key: 'fssai_registered', type: 'boolean', label: ['Do you have FSSAI registration?', 'FSSAI രജിസ്ട്രേഷൻ ഉണ്ടോ?'] },
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
        { ...ID_PROOF },
        ...(service.documents ?? []).map((doc) => ({
          documentType: doc.type,
          isMandatory: doc.isMandatory,
          note: doc.note ? text(doc.note) : null,
        })),
      ];
      const questions: ServiceQuestion[] = service.questions.map((question) => ({
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
