// Globle: guess the mystery country, and every guess is shaded by how close its border comes. The map
// is Natural Earth's 1:50m countries, simplified by scripts/build-world.ts. Countries that share a border
// share points in the topology, so neighbours come out at exactly zero kilometres.
import { geoArea, geoCentroid } from 'd3-geo';
import type { Feature, Geometry } from 'geojson';
import { feature } from 'topojson-client';
import type { GeometryCollection, Topology } from 'topojson-specification';
import world from './world.json';

export type Country = { name: string; aliases: string[]; target: boolean };
export const countries = world.countries as Country[];
const topology = world.topology as unknown as Topology<{ countries: GeometryCollection }>;

let shapes: Feature<Geometry>[] | null = null;
/** One GeoJSON feature per country, in the same order as `countries`. Built on first use. */
export function countryShapes() {
  shapes ??= topology.objects.countries.geometries.map((geometry) => feature(topology, geometry) as Feature<Geometry>);
  return shapes;
}

const normalize = (text: string) => text.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase().replace(/^the /, '').replace(/[^\p{L}\p{N}]/gu, '');
const lookup = new Map<string, number>();
countries.forEach((country, index) => {
  for (const name of [country.name, ...country.aliases]) if (!lookup.has(normalize(name))) lookup.set(normalize(name), index);
});
/** The country a typed name refers to, by its name or a common alternative, ignoring case and accents. */
export function findCountry(text: string) {
  const index = lookup.get(normalize(text));
  return index === undefined ? null : index;
}
export const countryIndex = (name: string) => countries.findIndex((country) => country.name === name);
/** Up to `limit` countries whose name starts with what has been typed, then those that contain it. */
export function suggestCountries(text: string, limit = 3) {
  const typed = normalize(text);
  if (typed.length < 2) return [];
  const starts = countries.filter((country) => normalize(country.name).startsWith(typed));
  const contains = countries.filter((country) => !starts.includes(country) && normalize(country.name).includes(typed));
  return [...starts, ...contains].slice(0, limit).map((country) => country.name);
}

// Answers walk through a fresh shuffle every cycle, so no country repeats until all of them have had a turn.
const targets = countries.map((country, index) => ({ country, index })).filter(({ country }) => country.target).map(({ index }) => index);
function mulberry(seed: number) {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let value = Math.imul(state ^ (state >>> 15), 1 | state);
    value ^= value + Math.imul(value ^ (value >>> 7), 61 | value);
    return ((value ^ (value >>> 14)) >>> 0) / 4_294_967_296;
  };
}
const cycles = new Map<number, number[]>();
export function globleAnswer(day: number) {
  const cycle = Math.floor(day / targets.length);
  let order = cycles.get(cycle);
  if (!order) {
    const random = mulberry(cycle * 7919 + 307);
    order = [...targets];
    for (let current = order.length - 1; current > 0; current -= 1) {
      const other = Math.floor(random() * (current + 1));
      [order[current], order[other]] = [order[other], order[current]];
    }
    cycles.set(cycle, order);
  }
  return order[((day % targets.length) + targets.length) % targets.length];
}

type Points = { lat: Float64Array; lon: Float64Array; cos: Float64Array };
const pointCache = new Map<number, Points>();
function pointsOf(index: number): Points {
  const cached = pointCache.get(index);
  if (cached) return cached;
  const flat: number[][] = [];
  const walk = (value: unknown) => {
    if (Array.isArray(value) && typeof value[0] === 'number') flat.push(value as number[]);
    else if (Array.isArray(value)) value.forEach(walk);
  };
  walk((countryShapes()[index].geometry as { coordinates: unknown }).coordinates);
  const radians = Math.PI / 180;
  const points = { lat: new Float64Array(flat.map((point) => point[1] * radians)), lon: new Float64Array(flat.map((point) => point[0] * radians)), cos: new Float64Array(flat.map((point) => Math.cos(point[1] * radians))) };
  pointCache.set(index, points);
  return points;
}
const earth = 6371;
const distanceCache = new Map<string, number>();
/** The shortest distance between two countries' borders, in kilometres. Neighbours are 0. */
export function borderDistance(a: number, b: number) {
  if (a === b) return 0;
  const key = a < b ? `${a}:${b}` : `${b}:${a}`;
  const cached = distanceCache.get(key);
  if (cached !== undefined) return cached;
  const one = pointsOf(a), two = pointsOf(b);
  let best = Infinity;
  for (let i = 0; i < one.lat.length && best > 0; i += 1) {
    for (let j = 0; j < two.lat.length; j += 1) {
      // Latitude alone gives a floor on the distance, which skips most of the work.
      if (Math.abs(one.lat[i] - two.lat[j]) * earth >= best) continue;
      const dLat = two.lat[j] - one.lat[i], dLon = two.lon[j] - one.lon[i];
      const h = Math.sin(dLat / 2) ** 2 + one.cos[i] * two.cos[j] * Math.sin(dLon / 2) ** 2;
      const distance = 2 * earth * Math.asin(Math.min(1, Math.sqrt(h)));
      if (distance < best) { best = distance; if (best === 0) break; }
    }
  }
  const rounded = Math.round(best);
  distanceCache.set(key, rounded);
  return rounded;
}

const centroids = new Map<number, [number, number]>();
/** The middle of a country's largest piece, so France turns to France rather than out into the Atlantic towards French Guiana. */
export function centroidOf(index: number) {
  const cached = centroids.get(index);
  if (cached) return cached;
  const shape = countryShapes()[index];
  let target: Feature<Geometry> = shape;
  if (shape.geometry.type === 'MultiPolygon') {
    const pieces = shape.geometry.coordinates.map((coordinates) => ({ type: 'Feature', properties: {}, geometry: { type: 'Polygon', coordinates } }) as Feature<Geometry>);
    target = pieces.reduce((best, piece) => (geoArea(piece) > geoArea(best) ? piece : best));
  }
  const centre = geoCentroid(target) as [number, number];
  centroids.set(index, centre);
  return centre;
}

// ColorBrewer's OrRd, as the original uses: pale for far away, deep red for a neighbour.
const heat = ['#fff7ec', '#fee8c8', '#fdd49e', '#fdbb84', '#fc8d59', '#ef6548', '#d7301f', '#b30000', '#7f0000'];
const farthest = 15_000;
export function heatColor(kilometres: number) {
  const closeness = 1 - Math.sqrt(Math.min(1, kilometres / farthest));
  const position = closeness * (heat.length - 1);
  const low = Math.floor(position), high = Math.min(heat.length - 1, low + 1), mix = position - low;
  const channel = (hex: string, offset: number) => parseInt(hex.slice(offset, offset + 2), 16);
  const blend = (offset: number) => Math.round(channel(heat[low], offset) * (1 - mix) + channel(heat[high], offset) * mix);
  return `rgb(${blend(1)},${blend(3)},${blend(5)})`;
}
export const answerColor = '#4BB34B';
export function heatEmoji(kilometres: number) {
  if (kilometres === 0) return '🟥';
  if (kilometres < 750) return '🟧';
  if (kilometres < 2000) return '🟨';
  return '⬜';
}
