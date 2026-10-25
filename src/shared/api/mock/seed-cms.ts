import type { OrganizationSettings, PolicySlug, PublicBranding } from '../types';
import { db, newId, nowIso } from './db';

/** Live branding served by `GET /branding`: the original Fix60 blue palette. */
export const BRANDING: PublicBranding = {
  name: 'Fix60',
  logoUrl: null,
  theme: {
    primary: '#0000FF',
    primaryMid: '#4242FF',
    primaryLight: '#E0F2FE',
    accent: '#FF6B35',
    accentLight: '#FFF1EA',
    railMid: '#1E293B',
    railDeep: '#0F172A',
    tintSecondary: '#F0F7FF',
    tintTertiary: '#F8FAFC',
    surfaceMuted: '#F1F5F9',
    surfaceFog: '#F8FAFB',
  },
};

/** Placeholder organisation settings. Every contact value is a dummy. */
export const SETTINGS: OrganizationSettings = {
  supportPhone: '+910000000000',
  supportWhatsapp: '+910000000000',
  supportEmail: 'support@example.invalid',
  companyAddress: 'PLACEHOLDER ADDRESS, Kochi, Kerala, India',
  grievanceOfficerName: 'PLACEHOLDER — to be appointed',
  grievanceOfficerEmail: 'grievance@example.invalid',
};

const DRAFT_EN = '> **DRAFT placeholder text pending legal review.** This is not the final policy and must not be relied on.';
const DRAFT_ML = '> **കരട് — നിയമ പരിശോധന കാത്തിരിക്കുന്ന താൽക്കാലിക വാചകം.** ഇത് അന്തിമ നയമല്ല; ഇതിനെ ആശ്രയിക്കരുത്.';

interface PageSeed {
  slug: PolicySlug;
  title: [string, string];
  sections: { en: [string, string]; ml: [string, string] }[];
}

const PAGES: PageSeed[] = [
  {
    slug: 'terms',
    title: ['Terms of use (DRAFT)', 'ഉപയോഗ നിബന്ധനകൾ (കരട്)'],
    sections: [
      {
        en: ['About Fix60', 'Fix60 connects households in Kerala with independent, verified service providers. Fix60 is a platform and is not the employer of providers.'],
        ml: ['Fix60-നെക്കുറിച്ച്', 'കേരളത്തിലെ വീടുകളെ പരിശോധിച്ച സ്വതന്ത്ര സേവനദാതാക്കളുമായി Fix60 ബന്ധിപ്പിക്കുന്നു. Fix60 ഒരു പ്ലാറ്റ്‌ഫോം മാത്രമാണ്; സേവനദാതാക്കളുടെ തൊഴിലുടമയല്ല.'],
      },
      {
        en: ['Your account', 'You must give accurate details and keep your phone number secure. You are responsible for activity on your account.'],
        ml: ['നിങ്ങളുടെ അക്കൗണ്ട്', 'ശരിയായ വിവരങ്ങൾ നൽകുകയും ഫോൺ നമ്പർ സുരക്ഷിതമായി സൂക്ഷിക്കുകയും വേണം. അക്കൗണ്ടിലെ പ്രവർത്തനങ്ങൾക്ക് നിങ്ങൾ ഉത്തരവാദിയാണ്.'],
      },
      {
        en: ['Bookings and payments', 'Rates are agreed between you and the provider. Cancel early if your plans change, and treat every provider with respect.'],
        ml: ['ബുക്കിംഗും പണമിടപാടും', 'നിരക്ക് നിങ്ങളും സേവനദാതാവും തമ്മിൽ തീരുമാനിക്കുന്നു. പദ്ധതി മാറിയാൽ നേരത്തെ റദ്ദാക്കുക; എല്ലാ സേവനദാതാക്കളോടും മാന്യമായി പെരുമാറുക.'],
      },
    ],
  },
  {
    slug: 'privacy',
    title: ['Privacy policy (DRAFT)', 'സ്വകാര്യതാ നയം (കരട്)'],
    sections: [
      {
        en: ['What we collect', 'Your name, phone number, location and booking history, and for providers the verification documents they upload.'],
        ml: ['ഞങ്ങൾ ശേഖരിക്കുന്നത്', 'നിങ്ങളുടെ പേര്, ഫോൺ നമ്പർ, സ്ഥലം, ബുക്കിംഗ് വിവരങ്ങൾ; സേവനദാതാക്കളുടെ കാര്യത്തിൽ അവർ അപ്‌ലോഡ് ചെയ്യുന്ന പരിശോധനാ രേഖകളും.'],
      },
      {
        en: ['How we share it', 'Contact details are shared with the other party only after a booking is confirmed. Documents are seen only by our verification team.'],
        ml: ['എങ്ങനെ പങ്കിടുന്നു', 'ബുക്കിംഗ് സ്ഥിരീകരിച്ചതിനു ശേഷം മാത്രമേ ബന്ധപ്പെടാനുള്ള വിവരങ്ങൾ മറ്റേ കക്ഷിയുമായി പങ്കിടൂ. രേഖകൾ പരിശോധനാ ടീം മാത്രമേ കാണൂ.'],
      },
      {
        en: ['Your choices', 'You can change communication preferences in Settings and ask us to delete your account at any time.'],
        ml: ['നിങ്ങളുടെ തിരഞ്ഞെടുപ്പുകൾ', 'ക്രമീകരണങ്ങളിൽ ആശയവിനിമയ മുൻഗണനകൾ മാറ്റാം; എപ്പോൾ വേണമെങ്കിലും അക്കൗണ്ട് ഇല്ലാതാക്കാൻ ആവശ്യപ്പെടാം.'],
      },
    ],
  },
  {
    slug: 'safety-policy',
    title: ['Safety policy (DRAFT)', 'സുരക്ഷാ നയം (കരട്)'],
    sections: [
      {
        en: ['Verification', 'Providers submit ID proof before they can accept work. Drivers add a driving licence, and patient-support and childcare providers a police clearance certificate.'],
        ml: ['പരിശോധന', 'ജോലി സ്വീകരിക്കുന്നതിനു മുൻപ് സേവനദാതാക്കൾ തിരിച്ചറിയൽ രേഖ സമർപ്പിക്കുന്നു. ഡ്രൈവർമാർ ഡ്രൈവിംഗ് ലൈസൻസും, രോഗീ സഹായ-ശിശുപരിചരണ സേവനദാതാക്കൾ പോലീസ് ക്ലിയറൻസ് സർട്ടിഫിക്കറ്റും നൽകുന്നു.'],
      },
      {
        en: ['Report and block', 'If anyone makes you feel unsafe, use Report or Block from their profile or booking. In an emergency call 112.'],
        ml: ['റിപ്പോർട്ടും ബ്ലോക്കും', 'ആരെങ്കിലും നിങ്ങളെ അരക്ഷിതരാക്കിയാൽ, അവരുടെ പ്രൊഫൈലിൽ നിന്നോ ബുക്കിംഗിൽ നിന്നോ റിപ്പോർട്ട് / ബ്ലോക്ക് ഉപയോഗിക്കുക. അടിയന്തരഘട്ടത്തിൽ 112 വിളിക്കുക.'],
      },
    ],
  },
  {
    slug: 'provider-agreement',
    title: ['Provider agreement (DRAFT)', 'സേവനദാതാവിന്റെ കരാർ (കരട്)'],
    sections: [
      {
        en: ['Independent work', 'You work as an independent provider and choose which invitations to accept.'],
        ml: ['സ്വതന്ത്ര ജോലി', 'നിങ്ങൾ സ്വതന്ത്ര സേവനദാതാവായാണ് പ്രവർത്തിക്കുന്നത്; ഏത് ക്ഷണങ്ങൾ സ്വീകരിക്കണമെന്ന് നിങ്ങൾ തീരുമാനിക്കുന്നു.'],
      },
      {
        en: ['Conduct', 'Arrive on time, respect the household and its privacy, and never ask customers for personal favours or advance payments.'],
        ml: ['പെരുമാറ്റം', 'സമയത്ത് എത്തുക, വീട്ടുകാരെയും അവരുടെ സ്വകാര്യതയെയും മാനിക്കുക, ഉപഭോക്താക്കളോട് വ്യക്തിപരമായ സഹായമോ മുൻകൂർ പണമോ ആവശ്യപ്പെടരുത്.'],
      },
    ],
  },
  {
    slug: 'about',
    title: ['About Fix60 (DRAFT)', 'Fix60-നെക്കുറിച്ച് (കരട്)'],
    sections: [
      {
        en: ['Help at home, within the hour', 'Fix60 helps families across Kerala find trusted help for transport, patient support, daily errands, home services, personal care, childcare and homemade food.'],
        ml: ['വീട്ടിൽ സഹായം, വേഗത്തിൽ', 'യാത്ര, രോഗീ സഹായം, ദൈനംദിന ആവശ്യങ്ങൾ, വീട്ടു സേവനങ്ങൾ, വ്യക്തിഗത പരിചരണം, ശിശുപരിചരണം, വീട്ടുഭക്ഷണം എന്നിവയ്ക്ക് വിശ്വസ്ത സഹായം കണ്ടെത്താൻ Fix60 കേരളത്തിലെ കുടുംബങ്ങളെ സഹായിക്കുന്നു.'],
      },
    ],
  },
];

function markdown(title: string, banner: string, sections: [string, string][]): string {
  return [`# ${title}`, banner, ...sections.map(([heading, body]) => `## ${heading}\n\n${body}`)].join('\n\n');
}

/** Fills pages, banners and FAQs. */
export function seedCms(): void {
  const updatedAt = nowIso();
  for (const page of PAGES) {
    db.pages.set(page.slug, {
      slug: page.slug,
      title: { en: page.title[0], ml: page.title[1] },
      body: {
        en: markdown(page.title[0], DRAFT_EN, page.sections.map((section) => section.en)),
        ml: markdown(page.title[1], DRAFT_ML, page.sections.map((section) => section.ml)),
      },
      version: '0.1-draft',
      updatedAt,
    });
  }

  const customerBanners: [string, string, string, string, string][] = [
    ['Festival-ready homes', 'ഉത്സവത്തിനൊരുങ്ങിയ വീട്', 'Book verified home cleaning before Onam, from ₹200 an hour.', 'ഓണത്തിനു മുൻപ് പരിശോധിച്ച വീട് ശുചീകരണം ബുക്ക് ചെയ്യൂ, മണിക്കൂറിന് ₹200 മുതൽ.', '/customer/services/cleaning'],
    ['Care for your parents', 'മാതാപിതാക്കൾക്ക് കരുതൽ', 'Police-verified patient companions near you.', 'സമീപത്തുള്ള പോലീസ് പരിശോധിച്ച രോഗീ സഹായികൾ.', '/customer/categories/patient-support'],
    ['A driver when you need one', 'ആവശ്യമുള്ളപ്പോൾ ഒരു ഡ്രൈവർ', 'Licensed drivers for hospital visits, airport runs and shopping.', 'ആശുപത്രി, വിമാനത്താവളം, ഷോപ്പിംഗ് യാത്രകൾക്ക് ലൈസൻസുള്ള ഡ്രൈവർമാർ.', '/customer/categories/transport'],
  ];
  const providerBanners: [string, string, string, string, string | null][] = [
    ['Complete your profile', 'പ്രൊഫൈൽ പൂർത്തിയാക്കൂ', 'Verified providers with full profiles get more invitations.', 'പൂർണ്ണ പ്രൊഫൈലുള്ള പരിശോധിച്ച സേവനദാതാക്കൾക്ക് കൂടുതൽ ക്ഷണങ്ങൾ ലഭിക്കും.', '/provider/profile'],
    ['Respond fast', 'വേഗം മറുപടി നൽകൂ', 'Invitations expire in 2 hours. Accept early to be picked.', 'ക്ഷണങ്ങൾ 2 മണിക്കൂറിൽ കാലഹരണപ്പെടും. തിരഞ്ഞെടുക്കപ്പെടാൻ നേരത്തെ സ്വീകരിക്കൂ.', null],
  ];
  for (const [en, ml, bodyEn, bodyMl, linkPath] of customerBanners) {
    db.banners.push({ audience: 'customer', banner: { id: newId(), title: { en, ml }, body: { en: bodyEn, ml: bodyMl }, imageUrl: null, linkPath } });
  }
  for (const [en, ml, bodyEn, bodyMl, linkPath] of providerBanners) {
    db.banners.push({ audience: 'provider', banner: { id: newId(), title: { en, ml }, body: { en: bodyEn, ml: bodyMl }, imageUrl: null, linkPath } });
  }

  const customerFaqs: [string, string, string, string][] = [
    ['How are providers verified?', 'സേവനദാതാക്കളെ എങ്ങനെ പരിശോധിക്കുന്നു?', 'Every provider submits ID proof. Drivers also submit a driving licence, and patient-support and childcare providers a police clearance certificate. Our team reviews each application.', 'എല്ലാ സേവനദാതാക്കളും തിരിച്ചറിയൽ രേഖ സമർപ്പിക്കുന്നു. ഡ്രൈവർമാർ ഡ്രൈവിംഗ് ലൈസൻസും, രോഗീ സഹായ-ശിശുപരിചരണ സേവനദാതാക്കൾ പോലീസ് ക്ലിയറൻസ് സർട്ടിഫിക്കറ്റും നൽകുന്നു. ഓരോ അപേക്ഷയും ഞങ്ങളുടെ ടീം പരിശോധിക്കുന്നു.'],
    ['How do I pay?', 'എങ്ങനെ പണം നൽകാം?', 'Pay the provider directly at the agreed rate once the work is done.', 'ജോലി കഴിഞ്ഞശേഷം തീരുമാനിച്ച നിരക്കിൽ സേവനദാതാവിന് നേരിട്ട് പണം നൽകുക.'],
    ['Can I cancel a booking?', 'ബുക്കിംഗ് റദ്ദാക്കാമോ?', 'Yes. Open the booking and tap Cancel before the service starts.', 'ഉവ്വ്. സേവനം തുടങ്ങുന്നതിനു മുൻപ് ബുക്കിംഗ് തുറന്ന് റദ്ദാക്കുക അമർത്തുക.'],
  ];
  const providerFaqs: [string, string, string, string][] = [
    ['How long does approval take?', 'അംഗീകാരത്തിന് എത്ര സമയമെടുക്കും?', 'Usually 1–2 working days after you submit all documents.', 'എല്ലാ രേഖകളും സമർപ്പിച്ച ശേഷം സാധാരണയായി 1–2 പ്രവൃത്തി ദിവസം.'],
    ['Does Fix60 take a commission?', 'Fix60 കമ്മീഷൻ ഈടാക്കുമോ?', 'Not during the pilot. You keep the full amount you agree with the customer.', 'പൈലറ്റ് ഘട്ടത്തിൽ ഇല്ല. ഉപഭോക്താവുമായി തീരുമാനിക്കുന്ന മുഴുവൻ തുകയും നിങ്ങൾക്ക്.'],
    ['What if I cannot make it?', 'എനിക്ക് എത്താൻ കഴിഞ്ഞില്ലെങ്കിൽ?', 'Cancel from the booking as early as possible and give a reason so the customer can find someone else.', 'ഉപഭോക്താവിന് മറ്റൊരാളെ കണ്ടെത്താൻ കഴിയുന്നതിന് കഴിയുന്നത്ര നേരത്തെ കാരണം സഹിതം ബുക്കിംഗ് റദ്ദാക്കുക.'],
  ];
  for (const [qEn, qMl, aEn, aMl] of customerFaqs) {
    db.faqs.push({ audience: 'customer', faq: { id: newId(), question: { en: qEn, ml: qMl }, answer: { en: aEn, ml: aMl } } });
  }
  for (const [qEn, qMl, aEn, aMl] of providerFaqs) {
    db.faqs.push({ audience: 'provider', faq: { id: newId(), question: { en: qEn, ml: qMl }, answer: { en: aEn, ml: aMl } } });
  }
}
