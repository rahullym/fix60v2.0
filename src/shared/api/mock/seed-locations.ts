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
  /** District headquarters, as in the backend seed. */
  centroid: { lat: number; lng: number };
  localities: LocalitySeed[];
}

/** Kerala's 14 districts (slugs, names and centroids mirror fix60_backend seed-data.ts). Malayalam needs native review. */
const DISTRICTS: DistrictSeed[] = [
  {
    slug: 'thiruvananthapuram',
    en: 'Thiruvananthapuram',
    ml: 'തിരുവനന്തപുരം',
    centroid: { lat: 8.5241, lng: 76.9366 },
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
    centroid: { lat: 8.8932, lng: 76.6141 },
    localities: [
      { slug: 'chinnakada', en: 'Chinnakada', ml: 'ചിന്നക്കട', localBody: 'Kollam Corporation', postalCode: '691001', latitude: 8.8853, longitude: 76.5949 },
      { slug: 'kadappakada', en: 'Kadappakada', ml: 'കടപ്പാക്കട', localBody: 'Kollam Corporation', postalCode: '691008', latitude: 8.89, longitude: 76.606 },
      { slug: 'kottiyam', en: 'Kottiyam', ml: 'കൊട്ടിയം', localBody: null, postalCode: '691571', latitude: 8.865, longitude: 76.672 },
      { slug: 'karunagappally', en: 'Karunagappally', ml: 'കരുനാഗപ്പള്ളി', localBody: 'Karunagappally Municipality', postalCode: '690518', latitude: 9.0546, longitude: 76.5355 },
      { slug: 'paravur', en: 'Paravur', ml: 'പരവൂർ', localBody: 'Paravur Municipality', postalCode: '691301', latitude: 8.8194, longitude: 76.666 },
    ],
  },
  {
    slug: 'pathanamthitta',
    en: 'Pathanamthitta',
    ml: 'പത്തനംതിട്ട',
    centroid: { lat: 9.2648, lng: 76.787 },
    localities: [
      { slug: 'pathanamthitta-town', en: 'Pathanamthitta Town', ml: 'പത്തനംതിട്ട ടൗൺ', localBody: 'Pathanamthitta Municipality', postalCode: '689645', latitude: 9.2648, longitude: 76.787 },
      { slug: 'adoor', en: 'Adoor', ml: 'അടൂർ', localBody: 'Adoor Municipality', postalCode: '691523', latitude: 9.1517, longitude: 76.7317 },
      { slug: 'thiruvalla', en: 'Thiruvalla', ml: 'തിരുവല്ല', localBody: 'Thiruvalla Municipality', postalCode: '689101', latitude: 9.3835, longitude: 76.5741 },
      { slug: 'ranni', en: 'Ranni', ml: 'റാന്നി', localBody: null, postalCode: '689672', latitude: 9.386, longitude: 76.785 },
      { slug: 'konni', en: 'Konni', ml: 'കോന്നി', localBody: null, postalCode: '689691', latitude: 9.2297, longitude: 76.8505 },
    ],
  },
  {
    slug: 'alappuzha',
    en: 'Alappuzha',
    ml: 'ആലപ്പുഴ',
    centroid: { lat: 9.4981, lng: 76.3388 },
    localities: [
      { slug: 'alappuzha-town', en: 'Alappuzha Town', ml: 'ആലപ്പുഴ ടൗൺ', localBody: 'Alappuzha Municipality', postalCode: '688011', latitude: 9.4981, longitude: 76.3388 },
      { slug: 'cherthala', en: 'Cherthala', ml: 'ചേർത്തല', localBody: 'Cherthala Municipality', postalCode: '688524', latitude: 9.6847, longitude: 76.3364 },
      { slug: 'ambalappuzha', en: 'Ambalappuzha', ml: 'അമ്പലപ്പുഴ', localBody: null, postalCode: '688561', latitude: 9.3833, longitude: 76.3667 },
      { slug: 'haripad', en: 'Haripad', ml: 'ഹരിപ്പാട്', localBody: 'Haripad Municipality', postalCode: '690514', latitude: 9.284, longitude: 76.4575 },
      { slug: 'kayamkulam', en: 'Kayamkulam', ml: 'കായംകുളം', localBody: 'Kayamkulam Municipality', postalCode: '690502', latitude: 9.1748, longitude: 76.5013 },
      { slug: 'mavelikkara', en: 'Mavelikkara', ml: 'മാവേലിക്കര', localBody: 'Mavelikkara Municipality', postalCode: '690101', latitude: 9.2504, longitude: 76.549 },
    ],
  },
  {
    slug: 'kottayam',
    en: 'Kottayam',
    ml: 'കോട്ടയം',
    centroid: { lat: 9.5916, lng: 76.5222 },
    localities: [
      { slug: 'nagampadam', en: 'Nagampadam', ml: 'നാഗമ്പടം', localBody: 'Kottayam Municipality', postalCode: '686001', latitude: 9.5916, longitude: 76.532 },
      { slug: 'kanjikuzhy', en: 'Kanjikuzhy', ml: 'കഞ്ഞിക്കുഴി', localBody: 'Kottayam Municipality', postalCode: '686004', latitude: 9.587, longitude: 76.547 },
      { slug: 'ettumanoor', en: 'Ettumanoor', ml: 'ഏറ്റുമാനൂർ', localBody: 'Ettumanoor Municipality', postalCode: '686631', latitude: 9.67, longitude: 76.56 },
      { slug: 'pala', en: 'Pala', ml: 'പാലാ', localBody: 'Pala Municipality', postalCode: '686575', latitude: 9.713, longitude: 76.683 },
      { slug: 'changanassery', en: 'Changanassery', ml: 'ചങ്ങനാശ്ശേരി', localBody: 'Changanassery Municipality', postalCode: '686101', latitude: 9.444, longitude: 76.541 },
    ],
  },
  {
    slug: 'idukki',
    en: 'Idukki',
    ml: 'ഇടുക്കി',
    centroid: { lat: 9.8494, lng: 76.9719 },
    localities: [
      { slug: 'painavu', en: 'Painavu', ml: 'പൈനാവ്', localBody: null, postalCode: '685603', latitude: 9.8494, longitude: 76.9719 },
      { slug: 'thodupuzha', en: 'Thodupuzha', ml: 'തൊടുപുഴ', localBody: 'Thodupuzha Municipality', postalCode: '685584', latitude: 9.8959, longitude: 76.7184 },
      { slug: 'munnar', en: 'Munnar', ml: 'മൂന്നാർ', localBody: null, postalCode: '685612', latitude: 10.0889, longitude: 77.0595 },
      { slug: 'adimali', en: 'Adimali', ml: 'അടിമാലി', localBody: null, postalCode: '685561', latitude: 10.013, longitude: 76.953 },
      { slug: 'kattappana', en: 'Kattappana', ml: 'കട്ടപ്പന', localBody: 'Kattappana Municipality', postalCode: '685508', latitude: 9.7526, longitude: 77.1152 },
      { slug: 'kumily', en: 'Kumily', ml: 'കുമളി', localBody: null, postalCode: '685509', latitude: 9.6047, longitude: 77.1653 },
    ],
  },
  {
    slug: 'ernakulam',
    en: 'Ernakulam',
    ml: 'എറണാകുളം',
    centroid: { lat: 9.9816, lng: 76.2999 },
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
    centroid: { lat: 10.5276, lng: 76.2144 },
    localities: [
      { slug: 'swaraj-round', en: 'Swaraj Round', ml: 'സ്വരാജ് റൗണ്ട്', localBody: 'Thrissur Corporation', postalCode: '680001', latitude: 10.5276, longitude: 76.2144 },
      { slug: 'ayyanthole', en: 'Ayyanthole', ml: 'അയ്യന്തോൾ', localBody: 'Thrissur Corporation', postalCode: '680003', latitude: 10.528, longitude: 76.198 },
      { slug: 'punkunnam', en: 'Punkunnam', ml: 'പൂങ്കുന്നം', localBody: 'Thrissur Corporation', postalCode: '680002', latitude: 10.537, longitude: 76.202 },
      { slug: 'ollur', en: 'Ollur', ml: 'ഒല്ലൂർ', localBody: 'Thrissur Corporation', postalCode: '680306', latitude: 10.473, longitude: 76.241 },
      { slug: 'kuriachira', en: 'Kuriachira', ml: 'കുരിയച്ചിറ', localBody: 'Thrissur Corporation', postalCode: '680006', latitude: 10.506, longitude: 76.229 },
    ],
  },
  {
    slug: 'palakkad',
    en: 'Palakkad',
    ml: 'പാലക്കാട്',
    centroid: { lat: 10.7867, lng: 76.6548 },
    localities: [
      { slug: 'palakkad-town', en: 'Palakkad Town', ml: 'പാലക്കാട് ടൗൺ', localBody: 'Palakkad Municipality', postalCode: '678001', latitude: 10.7867, longitude: 76.6548 },
      { slug: 'olavakkode', en: 'Olavakkode', ml: 'ഒലവക്കോട്', localBody: 'Palakkad Municipality', postalCode: '678002', latitude: 10.8013, longitude: 76.6352 },
      { slug: 'chittur', en: 'Chittur', ml: 'ചിറ്റൂർ', localBody: 'Chittur-Thathamangalam Municipality', postalCode: '678101', latitude: 10.699, longitude: 76.747 },
      { slug: 'ottapalam', en: 'Ottapalam', ml: 'ഒറ്റപ്പാലം', localBody: 'Ottapalam Municipality', postalCode: '679101', latitude: 10.77, longitude: 76.377 },
      { slug: 'shoranur', en: 'Shoranur', ml: 'ഷൊർണൂർ', localBody: 'Shoranur Municipality', postalCode: '679121', latitude: 10.761, longitude: 76.271 },
      { slug: 'mannarkkad', en: 'Mannarkkad', ml: 'മണ്ണാർക്കാട്', localBody: 'Mannarkkad Municipality', postalCode: '678582', latitude: 10.99, longitude: 76.46 },
    ],
  },
  {
    slug: 'malappuram',
    en: 'Malappuram',
    ml: 'മലപ്പുറം',
    centroid: { lat: 11.051, lng: 76.0711 },
    localities: [
      { slug: 'malappuram-town', en: 'Malappuram Town', ml: 'മലപ്പുറം ടൗൺ', localBody: 'Malappuram Municipality', postalCode: '676505', latitude: 11.051, longitude: 76.0711 },
      { slug: 'manjeri', en: 'Manjeri', ml: 'മഞ്ചേരി', localBody: 'Manjeri Municipality', postalCode: '676121', latitude: 11.1203, longitude: 76.1199 },
      { slug: 'kottakkal', en: 'Kottakkal', ml: 'കോട്ടക്കൽ', localBody: 'Kottakkal Municipality', postalCode: '676503', latitude: 11.0, longitude: 76.0 },
      { slug: 'perinthalmanna', en: 'Perinthalmanna', ml: 'പെരിന്തൽമണ്ണ', localBody: 'Perinthalmanna Municipality', postalCode: '679322', latitude: 10.976, longitude: 76.2254 },
      { slug: 'tirur', en: 'Tirur', ml: 'തിരൂർ', localBody: 'Tirur Municipality', postalCode: '676101', latitude: 10.915, longitude: 75.922 },
      { slug: 'nilambur', en: 'Nilambur', ml: 'നിലമ്പൂർ', localBody: 'Nilambur Municipality', postalCode: '679329', latitude: 11.2766, longitude: 76.2257 },
    ],
  },
  {
    slug: 'kozhikode',
    en: 'Kozhikode',
    ml: 'കോഴിക്കോട്',
    centroid: { lat: 11.2588, lng: 75.7804 },
    localities: [
      { slug: 'nadakkavu', en: 'Nadakkavu', ml: 'നടക്കാവ്', localBody: 'Kozhikode Corporation', postalCode: '673011', latitude: 11.273, longitude: 75.78 },
      { slug: 'mavoor-road', en: 'Mavoor Road', ml: 'മാവൂർ റോഡ്', localBody: 'Kozhikode Corporation', postalCode: '673004', latitude: 11.258, longitude: 75.79 },
      { slug: 'feroke', en: 'Feroke', ml: 'ഫറോക്ക്', localBody: 'Feroke Municipality', postalCode: '673631', latitude: 11.18, longitude: 75.84 },
      { slug: 'kunnamangalam', en: 'Kunnamangalam', ml: 'കുന്ദമംഗലം', localBody: null, postalCode: '673571', latitude: 11.304, longitude: 75.877 },
      { slug: 'west-hill', en: 'West Hill', ml: 'വെസ്റ്റ് ഹിൽ', localBody: 'Kozhikode Corporation', postalCode: '673005', latitude: 11.287, longitude: 75.768 },
    ],
  },
  {
    slug: 'wayanad',
    en: 'Wayanad',
    ml: 'വയനാട്',
    centroid: { lat: 11.6854, lng: 76.132 },
    localities: [
      { slug: 'kalpetta', en: 'Kalpetta', ml: 'കൽപ്പറ്റ', localBody: 'Kalpetta Municipality', postalCode: '673121', latitude: 11.6085, longitude: 76.0836 },
      { slug: 'sulthan-bathery', en: 'Sulthan Bathery', ml: 'സുൽത്താൻ ബത്തേരി', localBody: 'Sulthan Bathery Municipality', postalCode: '673592', latitude: 11.6655, longitude: 76.2595 },
      { slug: 'mananthavady', en: 'Mananthavady', ml: 'മാനന്തവാടി', localBody: 'Mananthavady Municipality', postalCode: '670645', latitude: 11.8014, longitude: 76.0044 },
      { slug: 'meenangadi', en: 'Meenangadi', ml: 'മീനങ്ങാടി', localBody: null, postalCode: '673591', latitude: 11.66, longitude: 76.169 },
      { slug: 'vythiri', en: 'Vythiri', ml: 'വൈത്തിരി', localBody: null, postalCode: '673576', latitude: 11.553, longitude: 76.04 },
    ],
  },
  {
    slug: 'kannur',
    en: 'Kannur',
    ml: 'കണ്ണൂർ',
    centroid: { lat: 11.8745, lng: 75.3704 },
    localities: [
      { slug: 'kannur-town', en: 'Kannur Town', ml: 'കണ്ണൂർ ടൗൺ', localBody: 'Kannur Corporation', postalCode: '670001', latitude: 11.8745, longitude: 75.3704 },
      { slug: 'thalassery', en: 'Thalassery', ml: 'തലശ്ശേരി', localBody: 'Thalassery Municipality', postalCode: '670101', latitude: 11.748, longitude: 75.492 },
      { slug: 'taliparamba', en: 'Taliparamba', ml: 'തളിപ്പറമ്പ്', localBody: 'Taliparamba Municipality', postalCode: '670141', latitude: 12.037, longitude: 75.36 },
      { slug: 'payyannur', en: 'Payyannur', ml: 'പയ്യന്നൂർ', localBody: 'Payyannur Municipality', postalCode: '670307', latitude: 12.1, longitude: 75.2 },
      { slug: 'mattannur', en: 'Mattannur', ml: 'മട്ടന്നൂർ', localBody: 'Mattannur Municipality', postalCode: '670702', latitude: 11.93, longitude: 75.57 },
      { slug: 'iritty', en: 'Iritty', ml: 'ഇരിട്ടി', localBody: 'Iritty Municipality', postalCode: '670703', latitude: 11.98, longitude: 75.67 },
    ],
  },
  {
    slug: 'kasaragod',
    en: 'Kasaragod',
    ml: 'കാസർകോട്',
    centroid: { lat: 12.4996, lng: 74.9869 },
    localities: [
      { slug: 'kasaragod-town', en: 'Kasaragod Town', ml: 'കാസർകോട് ടൗൺ', localBody: 'Kasaragod Municipality', postalCode: '671121', latitude: 12.4996, longitude: 74.9869 },
      { slug: 'kanhangad', en: 'Kanhangad', ml: 'കാഞ്ഞങ്ങാട്', localBody: 'Kanhangad Municipality', postalCode: '671315', latitude: 12.308, longitude: 75.09 },
      { slug: 'nileshwar', en: 'Nileshwar', ml: 'നീലേശ്വരം', localBody: 'Nileshwar Municipality', postalCode: '671314', latitude: 12.26, longitude: 75.13 },
      { slug: 'uppala', en: 'Uppala', ml: 'ഉപ്പള', localBody: null, postalCode: '671322', latitude: 12.68, longitude: 74.9 },
      { slug: 'manjeshwar', en: 'Manjeshwar', ml: 'മഞ്ചേശ്വരം', localBody: null, postalCode: '671323', latitude: 12.723, longitude: 74.886 },
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
