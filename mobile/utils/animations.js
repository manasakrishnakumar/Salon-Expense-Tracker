import { useRef, useEffect } from 'react';
import { Animated, Easing } from 'react-native';

// Spring configuration for natural feel
export const springConfig = {
    tension: 100,
    friction: 8,
    useNativeDriver: true,
};

// Timing configuration for consistent speed
export const timingConfig = {
    duration: 300,
    easing: Easing.out(Easing.cubic),
    useNativeDriver: true,
};

// Fast timing for micro-interactions
export const fastTiming = {
    duration: 150,
    easing: Easing.out(Easing.cubic),
    useNativeDriver: true,
};

/**
 * Hook for fade-in animation on mount
 */
export const useFadeIn = (delay = 0, duration = 400) => {
    const opacity = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        Animated.timing(opacity, {
            toValue: 1,
            duration,
            delay,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: true,
        }).start();
    }, []);

    return opacity;
};

/**
 * Hook for slide-up animation on mount
 */
export const useSlideUp = (delay = 0, initialOffset = 30) => {
    const translateY = useRef(new Animated.Value(initialOffset)).current;
    const opacity = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        Animated.parallel([
            Animated.timing(translateY, {
                toValue: 0,
                duration: 400,
                delay,
                easing: Easing.out(Easing.cubic),
                useNativeDriver: true,
            }),
            Animated.timing(opacity, {
                toValue: 1,
                duration: 400,
                delay,
                easing: Easing.out(Easing.cubic),
                useNativeDriver: true,
            }),
        ]).start();
    }, []);

    return { translateY, opacity };
};

/**
 * Hook for scale animation on mount
 */
export const useScaleIn = (delay = 0) => {
    const scale = useRef(new Animated.Value(0.8)).current;
    const opacity = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        Animated.parallel([
            Animated.spring(scale, {
                toValue: 1,
                delay,
                ...springConfig,
            }),
            Animated.timing(opacity, {
                toValue: 1,
                duration: 300,
                delay,
                useNativeDriver: true,
            }),
        ]).start();
    }, []);

    return { scale, opacity };
};

/**
 * Hook for press animation (scale down on press)
 */
export const usePressAnimation = () => {
    const scale = useRef(new Animated.Value(1)).current;

    const onPressIn = () => {
        Animated.spring(scale, {
            toValue: 0.95,
            ...springConfig,
        }).start();
    };

    const onPressOut = () => {
        Animated.spring(scale, {
            toValue: 1,
            ...springConfig,
        }).start();
    };

    return { scale, onPressIn, onPressOut };
};

/**
 * Create staggered animation values for a list
 */
export const createStaggeredValues = (count, baseDelay = 50) => {
    return Array.from({ length: count }, (_, index) => ({
        opacity: new Animated.Value(0),
        translateY: new Animated.Value(20),
        delay: index * baseDelay,
    }));
};

/**
 * Animate staggered items
 */
export const animateStaggered = (items) => {
    const animations = items.flatMap((item) => [
        Animated.timing(item.opacity, {
            toValue: 1,
            duration: 300,
            delay: item.delay,
            useNativeDriver: true,
        }),
        Animated.timing(item.translateY, {
            toValue: 0,
            duration: 300,
            delay: item.delay,
            useNativeDriver: true,
        }),
    ]);

    Animated.parallel(animations).start();
};

/**
 * Slide animation for list items
 */
export const useListItemAnimation = (index, isVisible = true) => {
    const translateX = useRef(new Animated.Value(50)).current;
    const opacity = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        if (isVisible) {
            Animated.parallel([
                Animated.timing(translateX, {
                    toValue: 0,
                    duration: 300,
                    delay: index * 50,
                    easing: Easing.out(Easing.cubic),
                    useNativeDriver: true,
                }),
                Animated.timing(opacity, {
                    toValue: 1,
                    duration: 300,
                    delay: index * 50,
                    useNativeDriver: true,
                }),
            ]).start();
        }
    }, [isVisible]);

    return { translateX, opacity };
};
