// Builds src/core/world.json for Globle from Natural Earth's 1:50m countries (public domain, via
// world-atlas). Run `npm run world` after changing the names or the target rules below. The output is
// committed, so the app never reads world-atlas at runtime.
import { writeFileSync } from 'node:fs';
import { geoArea } from 'd3-geo';
import { feature, mergeArcs } from 'topojson-client';
import { presimplify, quantile, simplify } from 'topojson-simplify';
import type { GeometryObject, Topology } from 'topojson-specification';
import atlas from 'world-atlas/countries-50m.json';

/** Natural Earth's short labels, spelled out the way players type them. */
const names: Record<string, string> = {
  'Antigua and Barb.': 'Antigua and Barbuda', 'Bosnia and Herz.': 'Bosnia and Herzegovina', 'Br. Indian Ocean Ter.': 'British Indian Ocean Territory',
  'British Virgin Is.': 'British Virgin Islands', 'Cayman Is.': 'Cayman Islands', 'Central African Rep.': 'Central African Republic', 'Cook Is.': 'Cook Islands',
  'Dem. Rep. Congo': 'DR Congo', Congo: 'Republic of the Congo', 'Dominican Rep.': 'Dominican Republic', 'Eq. Guinea': 'Equatorial Guinea',
  'Faeroe Is.': 'Faroe Islands', 'Falkland Is.': 'Falkland Islands', 'Fr. Polynesia': 'French Polynesia', 'Fr. S. Antarctic Lands': 'French Southern Lands',
  'Heard I. and McDonald Is.': 'Heard and McDonald Islands', Macedonia: 'North Macedonia', 'Marshall Is.': 'Marshall Islands',
  'N. Mariana Is.': 'Northern Mariana Islands', 'Pitcairn Is.': 'Pitcairn Islands', 'S. Geo. and the Is.': 'South Georgia', 'S. Sudan': 'South Sudan',
  'Solomon Is.': 'Solomon Islands', 'St-Barthélemy': 'Saint Barthélemy', 'St-Martin': 'Saint Martin', 'St. Kitts and Nevis': 'Saint Kitts and Nevis',
  'St. Pierre and Miquelon': 'Saint Pierre and Miquelon', 'St. Vin. and Gren.': 'Saint Vincent and the Grenadines', 'São Tomé and Principe': 'São Tomé and Príncipe',
  'Turks and Caicos Is.': 'Turks and Caicos Islands', 'U.S. Virgin Is.': 'US Virgin Islands', 'United States of America': 'United States',
  'W. Sahara': 'Western Sahara', 'Wallis and Futuna Is.': 'Wallis and Futuna', eSwatini: 'Eswatini', Åland: 'Åland Islands', Vatican: 'Vatican City',
};
const aliases: Record<string, string[]> = {
  'United States': ['USA', 'US', 'America', 'United States of America'], 'United Kingdom': ['UK', 'Britain', 'Great Britain'],
  'DR Congo': ['Democratic Republic of the Congo', 'DRC', 'Congo-Kinshasa', 'Zaire'], 'Republic of the Congo': ['Congo', 'Congo-Brazzaville'],
  Czechia: ['Czech Republic'], "Côte d'Ivoire": ['Ivory Coast'], 'North Macedonia': ['Macedonia'], Eswatini: ['Swaziland'], 'Timor-Leste': ['East Timor'],
  Myanmar: ['Burma'], 'Cabo Verde': ['Cape Verde'], 'Vatican City': ['Vatican', 'Holy See'], Turkey: ['Türkiye', 'Turkiye'], Russia: ['Russian Federation'],
  'North Korea': ['DPRK'], 'South Korea': ['Korea', 'Republic of Korea'], Laos: ["Lao People's Democratic Republic"], Micronesia: ['Federated States of Micronesia'],
  'United Arab Emirates': ['UAE'], 'Bosnia and Herzegovina': ['Bosnia'], 'Saint Kitts and Nevis': ['St Kitts and Nevis'], 'Saint Lucia': ['St Lucia'],
  'Saint Vincent and the Grenadines': ['St Vincent and the Grenadines'], 'Central African Republic': ['CAR'], 'Palestine': ['State of Palestine'],
};
/** Pieces Natural Earth splits off that players know as part of one country. */
const merges: Record<string, string[]> = { Somalia: ['Somaliland'], Cyprus: ['N. Cyprus'] };
/** Slivers with no country of their own. */
const dropped = new Set(['Ashmore and Cartier Is.', 'Siachen Glacier', 'Indian Ocean Ter.']);
/** Guessable, but never the answer: territories and dependencies rather than countries. */
const territories = new Set([
  'American Samoa', 'Anguilla', 'Antarctica', 'Aruba', 'Bermuda', 'British Indian Ocean Territory', 'British Virgin Islands', 'Cayman Islands', 'Cook Islands',
  'Curaçao', 'Faroe Islands', 'Falkland Islands', 'French Polynesia', 'French Southern Lands', 'Greenland', 'Guam', 'Guernsey', 'Heard and McDonald Islands',
  'Hong Kong', 'Isle of Man', 'Jersey', 'Macao', 'Montserrat', 'New Caledonia', 'Niue', 'Norfolk Island', 'Northern Mariana Islands', 'Pitcairn Islands',
  'Puerto Rico', 'Saint Barthélemy', 'Saint Helena', 'Saint Martin', 'Saint Pierre and Miquelon', 'Sint Maarten', 'South Georgia', 'Turks and Caicos Islands',
  'US Virgin Islands', 'Wallis and Futuna', 'Western Sahara', 'Åland Islands',
]);
/** Answers must be big enough to find on a phone-sized globe: about 2,500 km². */
const smallestTarget = 2500 / (6371 * 6371);

const topology = atlas as unknown as Topology;
const source = (topology.objects.countries as { geometries: (GeometryObject & { properties: { name: string } })[] }).geometries;
const byName = new Map(source.map((geometry) => [geometry.properties.name, geometry]));
const absorbed = new Set(Object.values(merges).flat());

const geometries: GeometryObject[] = [];
const countries: { name: string; aliases: string[]; target: boolean }[] = [];
for (const geometry of source) {
  const raw = geometry.properties.name;
  if (dropped.has(raw) || absorbed.has(raw)) continue;
  const parts = [geometry, ...(merges[raw] ?? []).map((part) => byName.get(part)!)];
  const merged = parts.length > 1 ? mergeArcs(topology, parts as never) : geometry;
  const name = names[raw] ?? raw;
  const area = geoArea(feature(topology, merged) as never);
  geometries.push({ ...merged, properties: undefined } as GeometryObject);
  countries.push({ name, aliases: aliases[name] ?? [], target: !territories.has(name) && area >= smallestTarget });
}

const shaped: Topology = { ...topology, objects: { countries: { type: 'GeometryCollection', geometries } } };
const weighted = presimplify(shaped);
// Keep about a quarter of the points: plenty for a phone-sized globe, and shared borders stay shared.
const simplified = simplify(weighted, quantile(weighted, 0.25));
// Hundredths of a degree are about a kilometre, finer than any distance the game reports.
simplified.arcs = simplified.arcs.map((arc) => arc.map(([lon, lat]) => [Math.round(lon * 100) / 100, Math.round(lat * 100) / 100]));

writeFileSync('src/core/world.json', JSON.stringify({ topology: simplified, countries }));
const points = simplified.arcs.reduce((sum, arc) => sum + arc.length, 0);
console.log(`${countries.length} countries, ${countries.filter((country) => country.target).length} possible answers, ${points} points`);
