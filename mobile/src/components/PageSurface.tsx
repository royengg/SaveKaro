import { useId, type PropsWithChildren } from "react";
import { StyleSheet, View } from "react-native";
import Svg, {
  Defs,
  LinearGradient,
  RadialGradient,
  Rect,
  Stop,
} from "react-native-svg";

/** The mobile website's white page with pink/amber light at the top corners. */
export default function PageSurface({ children }: PropsWithChildren) {
  const id = useId().replace(/:/g, "");
  return (
    <View style={styles.page}>
      <Svg
        width="100%"
        height="100%"
        pointerEvents="none"
        style={StyleSheet.absoluteFill}
      >
        <Defs>
          <LinearGradient id={`${id}base`} x1="0%" y1="0%" x2="0%" y2="100%">
            <Stop offset="0" stopColor="#fff" />
            <Stop offset="0.38" stopColor="#fcfcfd" />
            <Stop offset="1" stopColor="#f8fafc" />
          </LinearGradient>
          <RadialGradient id={`${id}pink`} cx="0%" cy="0%" rx="90%" ry="22%">
            <Stop offset="0" stopColor="#f472b6" stopOpacity={0.12} />
            <Stop offset="1" stopColor="#f472b6" stopOpacity={0} />
          </RadialGradient>
          <RadialGradient id={`${id}amber`} cx="100%" cy="0%" rx="90%" ry="22%">
            <Stop offset="0" stopColor="#fbbf24" stopOpacity={0.1} />
            <Stop offset="1" stopColor="#fbbf24" stopOpacity={0} />
          </RadialGradient>
        </Defs>
        <Rect width="100%" height="100%" fill={`url(#${id}base)`} />
        <Rect width="100%" height="100%" fill={`url(#${id}pink)`} />
        <Rect width="100%" height="100%" fill={`url(#${id}amber)`} />
      </Svg>
      {children}
    </View>
  );
}
const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: "white" },
});
