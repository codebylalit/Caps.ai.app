import React, { useRef, useEffect } from "react";
import { Animated, View } from "react-native";

const DotsLoader = ({ color = "#503D3F", size = 8, style }) => {
  const dot1 = useRef(new Animated.Value(0)).current;
  const dot2 = useRef(new Animated.Value(0)).current;
  const dot3 = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const createAnimation = (animatedValue, delay) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(animatedValue, {
            toValue: -8,
            duration: 300,
            useNativeDriver: true,
          }),
          Animated.timing(animatedValue, {
            toValue: 0,
            duration: 300,
            useNativeDriver: true,
          }),
        ])
      ).start();

    createAnimation(dot1, 0);
    createAnimation(dot2, 150);
    createAnimation(dot3, 300);
  }, [dot1, dot2, dot3]);

  return (
    <View style={[{ flexDirection: "row", alignItems: "center" }, style]}>
      <Animated.View
        style={{
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: color,
          marginHorizontal: size / 2,
          transform: [{ translateY: dot1 }],
        }}
      />
      <Animated.View
        style={{
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: color,
          marginHorizontal: size / 2,
          transform: [{ translateY: dot2 }],
        }}
      />
      <Animated.View
        style={{
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: color,
          marginHorizontal: size / 2,
          transform: [{ translateY: dot3 }],
        }}
      />
    </View>
  );
};

export default DotsLoader;