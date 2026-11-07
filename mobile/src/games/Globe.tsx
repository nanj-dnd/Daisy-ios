import { geoGraticule10, geoOrthographic, geoPath } from 'd3-geo';
import { memo, useMemo } from 'react';
import Svg, { Circle, Defs, Path, RadialGradient, Stop } from 'react-native-svg';
import { countryShapes } from '../core/globle';

const ocean = ['#4D86BC', '#2A5C8F', '#1B3F66'];
const land = '#7A9A5A';
const graticule = geoGraticule10();

type Props = {
  size: number;
  /** The longitude and latitude at the centre of the view. */
  centre: [number, number];
  zoom?: number;
  /** Countries painted over the land, by index into `countries`. */
  fills: ReadonlyMap<number, string>;
};

/** An orthographic globe: land in one muted colour, with guessed countries painted on top. */
export const Globe = memo(function Globe({ size, centre, zoom = 1, fills }: Props) {
  const radius = (size / 2 - 10) * zoom;
  const paths = useMemo(() => {
    const projection = geoOrthographic().scale(radius).translate([size / 2, size / 2]).rotate([-centre[0], -centre[1]]).clipAngle(90).precision(0.5);
    const draw = geoPath(projection);
    const shapes = countryShapes();
    return {
      land: draw({ type: 'FeatureCollection', features: shapes }) ?? '',
      lines: draw(graticule) ?? '',
      painted: [...fills].map(([index, color]) => ({ index, color, d: draw(shapes[index]) ?? '' })).filter((shape) => shape.d !== ''),
    };
  }, [size, radius, centre, fills]);

  return (
    <Svg width={size} height={size}>
      <Defs>
        <RadialGradient id="ocean" cx="38%" cy="32%" r="75%">
          <Stop offset="0" stopColor={ocean[0]} />
          <Stop offset="0.6" stopColor={ocean[1]} />
          <Stop offset="1" stopColor={ocean[2]} />
        </RadialGradient>
      </Defs>
      <Circle cx={size / 2} cy={size / 2} r={radius + 9} fill="#FFFFFF" opacity={0.35} />
      <Circle cx={size / 2} cy={size / 2} r={radius} fill="url(#ocean)" />
      <Path d={paths.lines} stroke="#FFFFFF" strokeOpacity={0.12} strokeWidth={0.6} fill="none" />
      <Path d={paths.land} fill={land} stroke="#4E6B3A" strokeOpacity={0.55} strokeWidth={0.4} />
      {paths.painted.map((shape) => <Path key={shape.index} d={shape.d} fill={shape.color} stroke="#1A1A1A" strokeOpacity={0.6} strokeWidth={0.6} />)}
    </Svg>
  );
});
