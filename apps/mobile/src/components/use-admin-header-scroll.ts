import { useFocusEffect } from "expo-router";
import { useCallback, useRef } from "react";
import { Animated, type NativeScrollEvent, type NativeSyntheticEvent } from "react-native";
import { initialHeaderScrollState, nextHeaderScrollState } from "./header-scroll";

export function useAdminHeaderScroll() {
  const headerTranslateY = useRef(new Animated.Value(0)).current;
  const state = useRef(initialHeaderScrollState());

  useFocusEffect(useCallback(() => {
    state.current = initialHeaderScrollState();
    headerTranslateY.stopAnimation();
    headerTranslateY.setValue(0);
    return () => { headerTranslateY.stopAnimation(); };
  }, [headerTranslateY]));

  const handleHeaderScroll = useCallback(({ nativeEvent }: NativeSyntheticEvent<NativeScrollEvent>) => {
    const next = nextHeaderScrollState(state.current, nativeEvent.contentOffset.y);
    if (next.visible !== state.current.visible) {
      headerTranslateY.stopAnimation();
      Animated.timing(headerTranslateY, { toValue: next.visible ? 0 : -120, duration: 200, useNativeDriver: true }).start();
    }
    state.current = next;
  }, [headerTranslateY]);

  return { headerTranslateY, handleHeaderScroll };
}
