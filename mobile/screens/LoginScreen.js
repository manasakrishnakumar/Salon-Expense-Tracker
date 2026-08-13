import React, { useState, useRef, useEffect } from 'react';
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    StyleSheet,
    KeyboardAvoidingView,
    Platform,
    Alert,
    Animated,
    ActivityIndicator,
    Keyboard,
    TouchableWithoutFeedback,
    Easing,
    Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import Colors from '../constants/Colors';

const { height } = Dimensions.get('window');

export default function LoginScreen() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [name, setName] = useState('');
    const [isRegistering, setIsRegistering] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const { login, register } = useAuth();

    // Animation values
    const shakeAnimation = useRef(new Animated.Value(0)).current;
    const cardScale = useRef(new Animated.Value(0.85)).current;
    const cardOpacity = useRef(new Animated.Value(0)).current;
    const cardTranslateY = useRef(new Animated.Value(60)).current;
    const buttonScale = useRef(new Animated.Value(1)).current;
    const logoScale = useRef(new Animated.Value(0)).current;
    const titleOpacity = useRef(new Animated.Value(0)).current;

    // Entrance animation
    useEffect(() => {
        // Logo bounce in
        Animated.spring(logoScale, {
            toValue: 1,
            tension: 50,
            friction: 5,
            delay: 200,
            useNativeDriver: true,
        }).start();

        // Title fade in
        Animated.timing(titleOpacity, {
            toValue: 1,
            duration: 600,
            delay: 400,
            useNativeDriver: true,
        }).start();

        // Card slide up
        Animated.parallel([
            Animated.spring(cardScale, {
                toValue: 1,
                tension: 50,
                friction: 8,
                delay: 600,
                useNativeDriver: true,
            }),
            Animated.timing(cardOpacity, {
                toValue: 1,
                duration: 500,
                delay: 600,
                useNativeDriver: true,
            }),
            Animated.spring(cardTranslateY, {
                toValue: 0,
                tension: 50,
                friction: 8,
                delay: 600,
                useNativeDriver: true,
            }),
        ]).start();
    }, []);

    const shake = () => {
        Animated.sequence([
            Animated.timing(shakeAnimation, { toValue: 15, duration: 60, useNativeDriver: true }),
            Animated.timing(shakeAnimation, { toValue: -15, duration: 60, useNativeDriver: true }),
            Animated.timing(shakeAnimation, { toValue: 15, duration: 60, useNativeDriver: true }),
            Animated.timing(shakeAnimation, { toValue: -15, duration: 60, useNativeDriver: true }),
            Animated.timing(shakeAnimation, { toValue: 0, duration: 60, useNativeDriver: true }),
        ]).start();
    };

    const onPressIn = () => {
        Animated.spring(buttonScale, {
            toValue: 0.94,
            useNativeDriver: true,
        }).start();
    };

    const onPressOut = () => {
        Animated.spring(buttonScale, {
            toValue: 1,
            friction: 3,
            useNativeDriver: true,
        }).start();
    };

    const validateEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

    const handleSubmit = async () => {
        if (!email || !password) {
            shake();
            Alert.alert('Missing Info', 'Please fill in all fields');
            return;
        }
        if (!validateEmail(email)) {
            shake();
            Alert.alert('Invalid Email', 'Please enter a valid email address');
            return;
        }
        if (password.length < 8) {
            shake();
            Alert.alert('Weak Password', 'Password must be at least 8 characters');
            return;
        }
        if (isRegistering && !name) {
            shake();
            Alert.alert('Missing Name', 'Please enter your name');
            return;
        }

        setIsLoading(true);
        const result = isRegistering
            ? await register(email, password, name)
            : await login(email, password);

        if (!result.success) {
            shake();
            Alert.alert(isRegistering ? 'Registration Failed' : 'Login Failed', result.error);
        }
        setIsLoading(false);
    };

    return (
        <View style={styles.container}>
            {/* Background Gradient */}
            <LinearGradient
                colors={[Colors.gradientStart, Colors.background]}
                style={StyleSheet.absoluteFill}
            />

            <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
                <KeyboardAvoidingView
                    style={styles.content}
                    behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                >
                    {/* Logo Section */}
                    <View style={styles.logoSection}>
                        <Animated.View style={[styles.logoContainer, { transform: [{ scale: logoScale }] }]}>
                            <LinearGradient
                                colors={[Colors.primary, Colors.primaryDark]}
                                style={styles.logoGradient}
                            >
                                <Ionicons name="cut" size={48} color="#000" />
                            </LinearGradient>
                        </Animated.View>
                        <Animated.Text style={[styles.appName, { opacity: titleOpacity }]}>
                            SALON PRO
                        </Animated.Text>
                        <Animated.Text style={[styles.tagline, { opacity: titleOpacity }]}>
                            Expense Tracker
                        </Animated.Text>
                    </View>

                    {/* Login Card */}
                    <Animated.View
                        style={[
                            styles.card,
                            {
                                opacity: cardOpacity,
                                transform: [
                                    { translateX: shakeAnimation },
                                    { translateY: cardTranslateY },
                                    { scale: cardScale },
                                ],
                            },
                        ]}
                    >
                        <Text style={styles.cardTitle}>
                            {isRegistering ? 'Create Account' : 'Welcome Back'}
                        </Text>
                        <Text style={styles.cardSubtitle}>
                            {isRegistering ? 'Sign up to get started' : 'Sign in to continue'}
                        </Text>

                        {isRegistering && (
                            <View style={styles.inputGroup}>
                                <Text style={styles.inputLabel}>Full Name</Text>
                                <TextInput
                                    style={styles.input}
                                    placeholder="John Doe"
                                    placeholderTextColor={Colors.textMuted}
                                    value={name}
                                    onChangeText={setName}
                                    autoCapitalize="words"
                                />
                            </View>
                        )}

                        <View style={styles.inputGroup}>
                            <Text style={styles.inputLabel}>Email</Text>
                            <TextInput
                                style={styles.input}
                                placeholder="you@example.com"
                                placeholderTextColor={Colors.textMuted}
                                value={email}
                                onChangeText={setEmail}
                                autoCapitalize="none"
                                keyboardType="email-address"
                            />
                        </View>

                        <View style={styles.inputGroup}>
                            <Text style={styles.inputLabel}>Password</Text>
                            <TextInput
                                style={styles.input}
                                placeholder="Min 8 characters"
                                placeholderTextColor={Colors.textMuted}
                                value={password}
                                onChangeText={setPassword}
                                secureTextEntry
                                onSubmitEditing={handleSubmit}
                            />
                        </View>

                        <Animated.View style={{ transform: [{ scale: buttonScale }] }}>
                            <TouchableOpacity
                                style={styles.submitBtn}
                                onPress={handleSubmit}
                                onPressIn={onPressIn}
                                onPressOut={onPressOut}
                                disabled={isLoading}
                                activeOpacity={0.9}
                            >
                                <LinearGradient
                                    colors={[Colors.primary, Colors.primaryDark]}
                                    style={styles.submitGradient}
                                    start={{ x: 0, y: 0 }}
                                    end={{ x: 1, y: 0 }}
                                >
                                    {isLoading ? (
                                        <ActivityIndicator color="#000" />
                                    ) : (
                                        <Text style={styles.submitBtnText}>
                                            {isRegistering ? 'Create Account' : 'Sign In'} →
                                        </Text>
                                    )}
                                </LinearGradient>
                            </TouchableOpacity>
                        </Animated.View>

                        <TouchableOpacity
                            style={styles.switchBtn}
                            onPress={() => setIsRegistering(!isRegistering)}
                        >
                            <Text style={styles.switchText}>
                                {isRegistering
                                    ? 'Already have an account? '
                                    : "Don't have an account? "}
                                <Text style={styles.switchTextBold}>
                                    {isRegistering ? 'Sign In' : 'Sign Up'}
                                </Text>
                            </Text>
                        </TouchableOpacity>
                    </Animated.View>
                </KeyboardAvoidingView>
            </TouchableWithoutFeedback>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Colors.background,
    },
    content: {
        flex: 1,
        justifyContent: 'center',
        padding: 24,
    },
    logoSection: {
        alignItems: 'center',
        marginBottom: 40,
    },
    logoContainer: {
        marginBottom: 20,
    },
    logoGradient: {
        width: 100,
        height: 100,
        borderRadius: 28,
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: Colors.primary,
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.4,
        shadowRadius: 16,
        elevation: 12,
    },
    appName: {
        fontSize: 32,
        color: Colors.primary,
        fontFamily: 'Poppins_700Bold',
        letterSpacing: 4,
    },
    tagline: {
        fontSize: 16,
        color: Colors.textSecondary,
        fontFamily: 'Poppins_400Regular',
        marginTop: 4,
    },
    card: {
        backgroundColor: Colors.cardBackground,
        borderRadius: 28,
        padding: 28,
        borderWidth: 1,
        borderColor: Colors.border,
        shadowColor: Colors.primary,
        shadowOffset: { width: 0, height: 16 },
        shadowOpacity: 0.15,
        shadowRadius: 32,
        elevation: 16,
    },
    cardTitle: {
        fontSize: 26,
        color: Colors.text,
        fontFamily: 'Poppins_700Bold',
        marginBottom: 4,
    },
    cardSubtitle: {
        fontSize: 14,
        color: Colors.textSecondary,
        fontFamily: 'Poppins_400Regular',
        marginBottom: 28,
    },
    inputGroup: {
        marginBottom: 20,
    },
    inputLabel: {
        fontSize: 13,
        color: Colors.textSecondary,
        fontFamily: 'Poppins_500Medium',
        marginBottom: 8,
        marginLeft: 4,
    },
    input: {
        backgroundColor: Colors.glass,
        borderWidth: 1,
        borderColor: Colors.border,
        borderRadius: 14,
        padding: 16,
        fontSize: 16,
        color: Colors.text,
        fontFamily: 'Poppins_400Regular',
    },
    submitBtn: {
        marginTop: 8,
        borderRadius: 14,
        overflow: 'hidden',
        shadowColor: Colors.primary,
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.4,
        shadowRadius: 16,
        elevation: 10,
    },
    submitGradient: {
        padding: 18,
        alignItems: 'center',
    },
    submitBtnText: {
        color: '#000',
        fontSize: 17,
        fontFamily: 'Poppins_700Bold',
        letterSpacing: 0.5,
    },
    switchBtn: {
        marginTop: 24,
        alignItems: 'center',
    },
    switchText: {
        color: Colors.textSecondary,
        fontSize: 14,
        fontFamily: 'Poppins_400Regular',
    },
    switchTextBold: {
        color: Colors.primary,
        fontFamily: 'Poppins_600SemiBold',
    },
});
