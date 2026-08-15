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
    const [mode, setMode] = useState('login'); // 'login' | 'register' | 'forgot'
    const [loginRole, setLoginRole] = useState('admin'); // 'admin' | 'worker'
    const [isLoading, setIsLoading] = useState(false);
    const [successMsg, setSuccessMsg] = useState('');
    const { login, register, logout, sendRecovery } = useAuth();

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
        Animated.spring(logoScale, {
            toValue: 1,
            tension: 50,
            friction: 5,
            delay: 200,
            useNativeDriver: true,
        }).start();

        Animated.timing(titleOpacity, {
            toValue: 1,
            duration: 600,
            delay: 400,
            useNativeDriver: true,
        }).start();

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
        Animated.spring(buttonScale, { toValue: 0.94, useNativeDriver: true }).start();
    };

    const onPressOut = () => {
        Animated.spring(buttonScale, { toValue: 1, friction: 3, useNativeDriver: true }).start();
    };

    const validateEmail = (e) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);

    const switchMode = (next) => {
        setMode(next);
        setSuccessMsg('');
    };

    const handleForgotPassword = async () => {
        if (!email || !validateEmail(email)) {
            shake();
            Alert.alert('Invalid Email', 'Enter the email address for your account first.');
            return;
        }
        setIsLoading(true);
        const result = await sendRecovery(email);
        setIsLoading(false);
        if (result.success) {
            setSuccessMsg('Recovery email sent! Check your inbox for a link to reset your password.');
        } else {
            shake();
            Alert.alert('Failed to Send', result.error || 'Could not send recovery email.');
        }
    };

    const handleSubmit = async () => {
        if (mode === 'forgot') {
            return handleForgotPassword();
        }

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
        if (mode === 'register' && !name) {
            shake();
            Alert.alert('Missing Name', 'Please enter your name');
            return;
        }

        setIsLoading(true);
        const result = mode === 'register'
            ? await register(email, password, name)
            : await login(email, password);

        if (result.success && mode === 'login') {
            // Role-guard: an Admin who logs in on the Worker tab (or vice
            // versa) gets bounced back out — same check web's LoginPage does,
            // since a worker's own tab hides owner-only screens.
            const userRole = result.user?.role;
            if (loginRole === 'admin' && userRole === 'worker') {
                await logout();
                shake();
                Alert.alert('Wrong Tab', 'This account is a Worker. Please use the Worker Login tab.');
                setIsLoading(false);
                return;
            }
            if (loginRole === 'worker' && userRole !== 'worker') {
                await logout();
                shake();
                Alert.alert('Wrong Tab', 'This account is an Admin. Please use the Admin Login tab.');
                setIsLoading(false);
                return;
            }
        }

        if (!result.success) {
            shake();
            Alert.alert(mode === 'register' ? 'Registration Failed' : 'Login Failed', result.error);
        }
        setIsLoading(false);
    };

    const tagline = mode === 'forgot'
        ? 'Reset your password'
        : mode === 'register'
            ? 'Create your account'
            : loginRole === 'admin' ? 'Admin Sign In' : 'Worker Sign In';

    return (
        <View style={styles.container}>
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
                            {tagline}
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
                        {mode === 'login' && (
                            <View style={styles.roleTabs}>
                                <TouchableOpacity
                                    style={[styles.roleTab, loginRole === 'admin' && styles.roleTabActive]}
                                    onPress={() => setLoginRole('admin')}
                                >
                                    <Text style={[styles.roleTabText, loginRole === 'admin' && styles.roleTabTextActive]}>💼 Admin</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={[styles.roleTab, loginRole === 'worker' && styles.roleTabActive]}
                                    onPress={() => setLoginRole('worker')}
                                >
                                    <Text style={[styles.roleTabText, loginRole === 'worker' && styles.roleTabTextActive]}>💇 Worker</Text>
                                </TouchableOpacity>
                            </View>
                        )}

                        <Text style={styles.cardTitle}>
                            {mode === 'register' ? 'Create Account' : mode === 'forgot' ? 'Forgot Password' : 'Welcome Back'}
                        </Text>
                        <Text style={styles.cardSubtitle}>
                            {mode === 'register' ? 'Sign up to get started'
                                : mode === 'forgot' ? "We'll email you a reset link"
                                    : 'Sign in to continue'}
                        </Text>

                        {successMsg ? (
                            <View style={styles.successBox}>
                                <Text style={styles.successText}>✅ {successMsg}</Text>
                            </View>
                        ) : null}

                        {mode === 'register' && (
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

                        {mode !== 'forgot' && (
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
                        )}

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
                                            {mode === 'register' ? 'Create Account' : mode === 'forgot' ? 'Send Recovery Email' : 'Sign In'} →
                                        </Text>
                                    )}
                                </LinearGradient>
                            </TouchableOpacity>
                        </Animated.View>

                        {mode === 'login' && (
                            <>
                                {loginRole === 'admin' ? (
                                    <TouchableOpacity style={styles.switchBtn} onPress={() => switchMode('register')}>
                                        <Text style={styles.switchText}>
                                            Don't have an account? <Text style={styles.switchTextBold}>Sign Up</Text>
                                        </Text>
                                    </TouchableOpacity>
                                ) : (
                                    <Text style={[styles.switchText, { textAlign: 'center', marginTop: 24 }]}>
                                        Workers are invited by the salon admin.
                                    </Text>
                                )}
                                <TouchableOpacity style={{ alignItems: 'center', marginTop: 12 }} onPress={() => switchMode('forgot')}>
                                    <Text style={styles.forgotText}>Forgot password?</Text>
                                </TouchableOpacity>
                            </>
                        )}

                        {mode === 'forgot' && (
                            <TouchableOpacity style={styles.switchBtn} onPress={() => switchMode('login')}>
                                <Text style={styles.switchText}>← <Text style={styles.switchTextBold}>Back to Sign In</Text></Text>
                            </TouchableOpacity>
                        )}

                        {mode === 'register' && (
                            <TouchableOpacity style={styles.switchBtn} onPress={() => switchMode('login')}>
                                <Text style={styles.switchText}>
                                    Already have an account? <Text style={styles.switchTextBold}>Sign In</Text>
                                </Text>
                            </TouchableOpacity>
                        )}
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
    roleTabs: {
        flexDirection: 'row',
        backgroundColor: 'rgba(255,255,255,0.05)',
        padding: 4,
        borderRadius: 12,
        marginBottom: 20,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.08)',
    },
    roleTab: {
        flex: 1,
        paddingVertical: 10,
        borderRadius: 9,
        alignItems: 'center',
    },
    roleTabActive: {
        backgroundColor: Colors.primary,
    },
    roleTabText: {
        fontSize: 13,
        fontFamily: 'Poppins_600SemiBold',
        color: Colors.textMuted,
    },
    roleTabTextActive: {
        color: '#000',
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
        marginBottom: 20,
    },
    successBox: {
        backgroundColor: 'rgba(16,185,129,0.12)',
        borderWidth: 1,
        borderColor: '#10B981',
        borderRadius: 12,
        padding: 12,
        marginBottom: 16,
    },
    successText: {
        color: '#10B981',
        fontSize: 13,
        fontFamily: 'Poppins_500Medium',
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
    forgotText: {
        color: Colors.textMuted,
        fontSize: 13,
        fontFamily: 'Poppins_500Medium',
        textDecorationLine: 'underline',
    },
});
