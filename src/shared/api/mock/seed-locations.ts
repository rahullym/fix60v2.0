import type { Locality } from '../types';
import { db, newId } from './db';
import { mockError } from './router';

interface LocalitySeed {
  slug: string;
  en: string;
  ml: string;
  localBody: string | null;
  postalCode: string;
  latitude: number;
  longitude: number;
}

interface DistrictSeed {
  slug: string;
  en: string;
  ml: string;
  localities: LocalitySeed[];
}

const DISTRICTS: DistrictSeed[] = [
  {
    slug: 'thiruvananthapuram',
    en: 'Thiruvananthapuram',
    ml: 'തിരുവനന്തപുരം',
    localities: [
      { slug: 'pattom', en: 'Pattom', ml: 'പട്ടം', localBody: 'Thiruvananthapuram Corporation', postalCode: '695004', latitude: 8.5241, longitude: 76.9366 },
      { slug: 'kazhakoottam', en: 'Kazhakoottam', ml: 'കഴക്കൂട്ടം', localBody: 'Thiruvananthapuram Corporation', postalCode: '695582', latitude: 8.5686, longitude: 76.8731 },
      { slug: 'vazhuthacaud', en: 'Vazhuthacaud', ml: 'വഴുതക്കാട്', localBody: 'Thiruvananthapuram Corporation', postalCode: '695014', latitude: 8.4985, longitude: 76.962 },
      { slug: 'kowdiar', en: 'Kowdiar', ml: 'കവടിയാർ', localBody: 'Thiruvananthapuram Corporation', postalCode: '695003', latitude: 8.5222, longitude: 76.9606 },
      { slug: 'sreekaryam', en: 'Sreekaryam', ml: 'ശ്രീകാര്യം', localBody: 'Thiruvananthapuram Corporation', postalCode: '695017', latitude: 8.548, longitude: 76.917 },
      { slug: 'peroorkada', en: 'Peroorkada', ml: 'പേരൂർക്കട', localBody: 'Thiruvananthapuram Corporation', postalCode: '695005', latitude: 8.5379, longitude: 76.9733 },
    ],
  },
  {
    slug: 'kollam',
    en: 'Kollam',
    ml: 'കൊല്ലം',
    localities: [
      { slug: 'chinnakada', en: 'Chinnakada', ml: 'ചിന്നക്കട', localBody: 'Kollam Corporation', postalCode: '691001', latitude: 8.8853, longitude: 76.5949 },
      { slug: 'kadappakada', en: 'Kadappakada', ml: 'കടപ്പാക്കട', localBody: 'Kollam Corporation', postalCode: '691008', latitude: 8.89, longitude: 76.606 },
      { slug: 'kottiyam', en: 'Kottiyam', ml: 'കൊട്ടിയം', localBody: null, postalCode: '691571', latitude: 8.865, longitude: 76.672 },
      { slug: 'karunagappally', en: 'Karunagappally', ml: 'കരുനാഗപ്പള്ളി', localBody: 'Karunagappally Municipality', postalCode: '690518', latitude: 9.0546, longitude: 76.5355 },
      { slug: 'paravur', en: 'Paravur', ml: 'പരവൂർ', localBody: 'Paravur Municipality', postalCode: '691301', latitude: 8.8194, longitude: 76.666 },
    ],
  },
  {
    slug: 'kottayam',
    en: 'Kottayam',
    ml: 'കോട്ടയം',
    localities: [
      { slug: 'nagampadam', en: 'Nagampadam', ml: 'നാഗമ്പടം', localBody: 'Kottayam Municipality', postalCode: '686001', latitude: 9.5916, longitude: 76.532 },
      { slug: 'kanjikuzhy', en: 'Kanjikuzhy', ml: 'കഞ്ഞിക്കുഴി', localBody: 'Kottayam Municipality', postalCode: '686004', latitude: 9.587, longitude: 76.547 },
      { slug: 'ettumanoor', en: 'Ettumanoor', ml: 'ഏറ്റുമാനൂർ', localBody: 'Ettumanoor Municipality', postalCode: '686631', latitude: 9.67, longitude: 76.56 },
      { slug: 'pala', en: 'Pala', ml: 'പാലാ', localBody: 'Pala Municipality', postalCode: '686575', latitude: 9.713, longitude: 76.683 },
      { slug: 'changanassery', en: 'Changanassery', ml: 'ചങ്ങനാശ്ശേരി', localBody: 'Changanassery Municipality', postalCode: '686101', latitude: 9.444, longitude: 76.541 },
    ],
  },
  {
    slug: 'ernakulam',
    en: 'Ernakulam',
    ml: 'എറണാകുളം',
    localities: [
      { slug: 'kakkanad', en: 'Kakkanad', ml: 'കാക്കനാട്', localBody: 'Thrikkakara Municipality', postalCode: '682030', latitude: 10.0159, longitude: 76.3419 },
      { slug: 'edappally', en: 'Edappally', ml: 'ഇടപ്പള്ളി', localBody: 'Kochi Corporation', postalCode: '682024', latitude: 10.0261, longitude: 76.3125 },
      { slug: 'vyttila', en: 'Vyttila', ml: 'വൈറ്റില', localBody: 'Kochi Corporation', postalCode: '682019', latitude: 9.968, longitude: 76.318 },
      { slug: 'kaloor', en: 'Kaloor', ml: 'കലൂർ', localBody: 'Kochi Corporation', postalCode: '682017', latitude: 9.997, longitude: 76.291 },
      { slug: 'fort-kochi', en: 'Fort Kochi', ml: 'ഫോർട്ട് കൊച്ചി', localBody: 'Kochi Corporation', postalCode: '682001', latitude: 9.965, longitude: 76.242 },
      { slug: 'aluva', en: 'Aluva', ml: 'ആലുവ', localBody: 'Aluva Municipality', postalCode: '683101', latitude: 10.108, longitude: 76.352 },
    ],
  },
  {
    slug: 'thrissur',
    en: 'Thrissur',
    ml: 'തൃശ്ശൂർ',
    localities: [
      { slug: 'swaraj-round', en: 'Swaraj Round', ml: 'സ്വരാജ് റൗണ്ട്', localBody: 'Thrissur Corporation', postalCode: '680001', latitude: 10.5276, longitude: 76.2144 },
      { slug: 'ayyanthole', en: 'Ayyanthole', ml: 'അയ്യന്തോൾ', localBody: 'Thrissur Corporation', postalCode: '680003', latitude: 10.528, longitude: 76.198 },
      { slug: 'punkunnam', en: 'Punkunnam', ml: 'പൂങ്കുന്നം', localBody: 'Thrissur Corporation', postalCode: '680002', latitude: 10.537, longitude: 76.202 },
      { slug: 'ollur', en: 'Ollur', ml: 'ഒല്ലൂർ', localBody: 'Thrissur Corporation', postalCode: '680306', latitude: 10.473, longitude: 76.241 },
      { slug: 'kuriachira', en: 'Kuriachira', ml: 'കുരിയച്ചിറ', localBody: 'Thrissur Corporation', postalCode: '680006', latitude: 10.506, longitude: 76.229 },
    ],
  },
  {
    slug: 'kozhikode',
    en: 'Kozhikode',
    ml: 'കോഴിക്കോട്',
    localities: [
      { slug: 'nadakkavu', en: 'Nadakkavu', ml: 'നടക്കാവ്', localBody: 'Kozhikode Corporation', postalCode: '673011', latitude: 11.273, longitude: 75.78 },
      { slug: 'mavoor-road', en: 'Mavoor Road', ml: 'മാവൂർ റോഡ്', localBody: 'Kozhikode Corporation', postalCode: '673004', latitude: 11.258, longitude: 75.79 },
      { slug: 'feroke', en: 'Feroke', ml: 'ഫറോക്ക്', localBody: 'Feroke Municipality', postalCode: '673631', latitude: 11.18, longitude: 75.84 },
      { slug: 'kunnamangalam', en: 'Kunnamangalam', ml: 'കുന്ദമംഗലം', localBody: null, postalCode: '673571', latitude: 11.304, longitude: 75.877 },
      { slug: 'west-hill', en: 'West Hill', ml: 'വെസ്റ്റ് ഹിൽ', localBody: 'Kozhikode Corporation', postalCode: '673005', latitude: 11.287, longitude: 75.768 },
    ],
  },
];

/** Fills `db.districts` and `db.localities`. */
export function seedLocations(): void {
  for (const district of DISTRICTS) {
    const districtId = newId();
    db.districts.push({ id: districtId, slug: district.slug, name: { en: district.en, ml: district.ml } });
    for (const locality of district.localities) {
      db.localities.push({
        id: newId(),
        districtId,
        slug: locality.slug,
        name: { en: locality.en, ml: locality.ml },
        localBody: locality.localBody,
        postalCode: locality.postalCode,
        latitude: locality.latitude,
        longitude: locality.longitude,
      });
    }
  }
}

/** Seed-time lookup by slug; throws when missing. */
export function localityBySlug(slug: string): Locality {
  const locality = db.localities.find((candidate) => candidate.slug === slug);
  if (!locality) {
    throw mockError(500, 'INTERNAL_ERROR', `Unknown seed locality ${slug}`);
  }
  return locality;
}
