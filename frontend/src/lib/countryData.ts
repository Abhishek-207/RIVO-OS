/**
 * Complete country data for phone code selectors and nationality dropdowns.
 *
 * Uses `countries-list` for country names and phone codes.
 * Demonyms are from a static map (sourced from world-countries dataset).
 * Flags are rendered via CountryFlag component (SVG images, works on Windows).
 */

import { countries } from 'countries-list'

// ---------------------------------------------------------------------------
// Demonym map – static extract from world-countries (249 entries, ~4 KB)
// ---------------------------------------------------------------------------
const DEMONYMS: Record<string, string> = {
  AD: 'Andorran', AE: 'Emirati', AF: 'Afghan', AG: 'Antiguan', AI: 'Anguillian',
  AL: 'Albanian', AM: 'Armenian', AO: 'Angolan', AR: 'Argentine', AT: 'Austrian',
  AU: 'Australian', AW: 'Aruban', AZ: 'Azerbaijani', BA: 'Bosnian', BB: 'Barbadian',
  BD: 'Bangladeshi', BE: 'Belgian', BF: 'Burkinabe', BG: 'Bulgarian', BH: 'Bahraini',
  BI: 'Burundian', BJ: 'Beninese', BM: 'Bermudian', BN: 'Bruneian', BO: 'Bolivian',
  BR: 'Brazilian', BS: 'Bahamian', BT: 'Bhutanese', BW: 'Motswana', BY: 'Belarusian',
  BZ: 'Belizean', CA: 'Canadian', CD: 'Congolese', CF: 'Central African', CG: 'Congolese',
  CH: 'Swiss', CI: 'Ivorian', CL: 'Chilean', CM: 'Cameroonian', CN: 'Chinese',
  CO: 'Colombian', CR: 'Costa Rican', CU: 'Cuban', CV: 'Cape Verdean', CY: 'Cypriot',
  CZ: 'Czech', DE: 'German', DJ: 'Djiboutian', DK: 'Danish', DM: 'Dominican',
  DO: 'Dominican', DZ: 'Algerian', EC: 'Ecuadorean', EE: 'Estonian', EG: 'Egyptian',
  ER: 'Eritrean', ES: 'Spanish', ET: 'Ethiopian', FI: 'Finnish', FJ: 'Fijian',
  FR: 'French', GA: 'Gabonese', GB: 'British', GD: 'Grenadian', GE: 'Georgian',
  GH: 'Ghanaian', GM: 'Gambian', GN: 'Guinean', GQ: 'Equatorial Guinean', GR: 'Greek',
  GT: 'Guatemalan', GW: 'Guinea-Bissauan', GY: 'Guyanese', HK: 'Hong Konger',
  HN: 'Honduran', HR: 'Croatian', HT: 'Haitian', HU: 'Hungarian', ID: 'Indonesian',
  IE: 'Irish', IL: 'Israeli', IN: 'Indian', IQ: 'Iraqi', IR: 'Iranian',
  IS: 'Icelander', IT: 'Italian', JM: 'Jamaican', JO: 'Jordanian', JP: 'Japanese',
  KE: 'Kenyan', KG: 'Kyrgyz', KH: 'Cambodian', KI: 'I-Kiribati', KM: 'Comorian',
  KN: 'Kittitian', KP: 'North Korean', KR: 'South Korean', KW: 'Kuwaiti',
  KY: 'Caymanian', KZ: 'Kazakhstani', LA: 'Laotian', LB: 'Lebanese', LC: 'Saint Lucian',
  LI: 'Liechtensteiner', LK: 'Sri Lankan', LR: 'Liberian', LS: 'Mosotho',
  LT: 'Lithuanian', LU: 'Luxembourger', LV: 'Latvian', LY: 'Libyan', MA: 'Moroccan',
  MC: 'Monegasque', MD: 'Moldovan', ME: 'Montenegrin', MG: 'Malagasy', MH: 'Marshallese',
  MK: 'Macedonian', ML: 'Malian', MM: 'Burmese', MN: 'Mongolian', MR: 'Mauritanian',
  MT: 'Maltese', MU: 'Mauritian', MV: 'Maldivian', MW: 'Malawian', MX: 'Mexican',
  MY: 'Malaysian', MZ: 'Mozambican', NA: 'Namibian', NE: 'Nigerien', NG: 'Nigerian',
  NI: 'Nicaraguan', NL: 'Dutch', NO: 'Norwegian', NP: 'Nepalese', NR: 'Nauruan',
  NZ: 'New Zealander', OM: 'Omani', PA: 'Panamanian', PE: 'Peruvian', PG: 'Papua New Guinean',
  PH: 'Filipino', PK: 'Pakistani', PL: 'Polish', PR: 'Puerto Rican', PS: 'Palestinian',
  PT: 'Portuguese', PW: 'Palauan', PY: 'Paraguayan', QA: 'Qatari', RO: 'Romanian',
  RS: 'Serbian', RU: 'Russian', RW: 'Rwandan', SA: 'Saudi', SB: 'Solomon Islander',
  SC: 'Seychellois', SD: 'Sudanese', SE: 'Swedish', SG: 'Singaporean', SI: 'Slovenian',
  SK: 'Slovak', SL: 'Sierra Leonean', SM: 'Sammarinese', SN: 'Senegalese', SO: 'Somali',
  SR: 'Surinamese', SS: 'South Sudanese', ST: 'Sao Tomean', SV: 'Salvadoran',
  SY: 'Syrian', SZ: 'Swazi', TD: 'Chadian', TG: 'Togolese', TH: 'Thai',
  TJ: 'Tajik', TL: 'East Timorese', TM: 'Turkmen', TN: 'Tunisian', TO: 'Tongan',
  TR: 'Turkish', TT: 'Trinidadian', TV: 'Tuvaluan', TW: 'Taiwanese', TZ: 'Tanzanian',
  UA: 'Ukrainian', UG: 'Ugandan', US: 'American', UY: 'Uruguayan', UZ: 'Uzbek',
  VA: 'Vatican', VC: 'Saint Vincentian', VE: 'Venezuelan', VN: 'Vietnamese',
  VU: 'Ni-Vanuatu', WS: 'Samoan', XK: 'Kosovar', YE: 'Yemeni', ZA: 'South African',
  ZM: 'Zambian', ZW: 'Zimbabwean',
}

// ---------------------------------------------------------------------------
// Phone code entries (complete list from countries-list)
// ---------------------------------------------------------------------------
export interface PhoneCodeEntry {
  /** ISO alpha-2 code */
  iso: string
  /** Country name */
  country: string
  /** Calling code including + (e.g. "+971") */
  code: string
  /** Label for display: "UAE (+971)" */
  label: string
}

/** Priority countries shown at the top of phone code selectors */
const PRIORITY_ISOS = ['AE', 'IN', 'GB', 'US', 'PK', 'PH', 'EG', 'SA', 'KW', 'QA', 'BH', 'OM', 'JO', 'LB']

const SHORT_NAMES: Record<string, string> = {
  AE: 'UAE', GB: 'UK', US: 'USA', SA: 'Saudi Arabia', KR: 'South Korea',
  KP: 'North Korea', BA: 'Bosnia', CD: 'DR Congo', CZ: 'Czech Republic',
  TW: 'Taiwan', PS: 'Palestine', VN: 'Vietnam', LA: 'Laos',
}

function buildPhoneCodeEntries(): PhoneCodeEntry[] {
  const entries: PhoneCodeEntry[] = []
  const seen = new Set<string>()

  for (const [iso, data] of Object.entries(countries)) {
    if (!data.phone?.length) continue
    const code = `+${data.phone[0]}`
    const shortName = SHORT_NAMES[iso] || data.name
    const entry: PhoneCodeEntry = {
      iso,
      country: shortName,
      code,
      label: `${shortName} (${code})`,
    }
    const key = `${iso}-${code}`
    if (!seen.has(key)) {
      seen.add(key)
      entries.push(entry)
    }
  }

  // Sort: priority countries first, then alphabetical
  const prioritySet = new Set(PRIORITY_ISOS)
  entries.sort((a, b) => {
    const aPri = prioritySet.has(a.iso)
    const bPri = prioritySet.has(b.iso)
    if (aPri && !bPri) return -1
    if (!aPri && bPri) return 1
    if (aPri && bPri) return PRIORITY_ISOS.indexOf(a.iso) - PRIORITY_ISOS.indexOf(b.iso)
    return a.country.localeCompare(b.country)
  })

  return entries
}

export const PHONE_CODES: PhoneCodeEntry[] = buildPhoneCodeEntries()

/** Find a phone code entry by its code string (e.g. "+971") */
export function findPhoneCodeByCode(code: string): PhoneCodeEntry | undefined {
  return PHONE_CODES.find(e => e.code === code)
}

/** Find a phone code entry by ISO code (e.g. "AE") */
export function findPhoneCodeByISO(iso: string): PhoneCodeEntry | undefined {
  return PHONE_CODES.find(e => e.iso === iso)
}

// ---------------------------------------------------------------------------
// Nationality entries (with ISO codes for flag rendering)
// ---------------------------------------------------------------------------
export interface NationalityEntry {
  /** Nationality demonym (e.g. "Emirati") */
  value: string
  /** Display label (e.g. "Emirati") */
  label: string
  /** ISO code for flag rendering */
  iso: string
}

function buildNationalityEntries(): NationalityEntry[] {
  const entries: NationalityEntry[] = []

  for (const [iso, demonym] of Object.entries(DEMONYMS)) {
    entries.push({
      value: demonym,
      label: demonym,
      iso,
    })
  }

  // Sort alphabetically by demonym, with Emirati first (UAE mortgage product)
  entries.sort((a, b) => {
    if (a.iso === 'AE') return -1
    if (b.iso === 'AE') return 1
    return a.value.localeCompare(b.value)
  })

  return entries
}

export const NATIONALITIES: NationalityEntry[] = buildNationalityEntries()
