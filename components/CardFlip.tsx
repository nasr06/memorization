import React from "react";
import { TouchableOpacity } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  interpolate,
} from "react-native-reanimated";
import { View } from "react-native";

interface CardFlipProps {
  front: React.ReactNode;
  back: React.ReactNode;
  isFlipped: boolean;
  onFlip: () => void;
}

export function CardFlip({ front, back, isFlipped, onFlip }: CardFlipProps) {
  const rotation = useSharedValue(isFlipped ? 1 : 0);

  React.useEffect(() => {
    rotation.value = withTiming(isFlipped ? 1 : 0, { duration: 600 });
  }, [isFlipped]);

  const frontAnimatedStyle = useAnimatedStyle(() => {
    const rotateY = interpolate(rotation.value, [0, 1], [0, 180]);
    return {
      transform: [{ perspective: 1000 }, { rotateY: `${rotateY}deg` }],
      backfaceVisibility: "hidden",
      position: "absolute",
      width: "100%",
      height: "100%",
    };
  });

  const backAnimatedStyle = useAnimatedStyle(() => {
    const rotateY = interpolate(rotation.value, [0, 1], [180, 360]);
    return {
      transform: [{ perspective: 1000 }, { rotateY: `${rotateY}deg` }],
      backfaceVisibility: "hidden",
      position: "absolute",
      width: "100%",
      height: "100%",
    };
  });

  return (
    <TouchableOpacity
      onPress={onFlip}
      activeOpacity={0.9}
      className="w-full flex-1"
    >
      <View style={{ flex: 1 }}>
        <Animated.View style={frontAnimatedStyle}>
          {front}
        </Animated.View>
        <Animated.View style={backAnimatedStyle}>
          {back}
        </Animated.View>
      </View>
    </TouchableOpacity>
  );
}
