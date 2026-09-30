import Svg, { Circle, Path } from "react-native-svg";

export default function PicksIcon({
  size = 14,
  color,
}: {
  size?: number;
  color: string;
}) {
  return (
    <Svg
      width={size}
      height={size}
      viewBox="0 0 16 16"
      fill="none"
      accessible={false}
    >
      <Path
        d="M8 2.4V4.1 M8 11.9V13.6 M2.4 8H4.1 M11.9 8H13.6 M4.3 4.3L5.5 5.5 M10.5 10.5L11.7 11.7 M4.3 11.7L5.5 10.5 M10.5 5.5L11.7 4.3"
        stroke={color}
        strokeWidth={1.4}
        strokeLinecap="round"
      />
      <Circle cx={8} cy={8} r={1.35} fill={color} />
    </Svg>
  );
}
