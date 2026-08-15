import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Modal, Alert } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';

// Reusable "Change Password" sheet — available to any logged-in user
// (owner or worker), mirroring web's Sidebar modal. Mounted once from
// HomeScreen and opened via the gear icon in its header.
export default function ChangePasswordModal({ visible, onClose }) {
    const { changePassword } = useAuth();
    const { colors } = useTheme();
    const [oldPassword, setOldPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);

    const reset = () => {
        setOldPassword('');
        setNewPassword('');
        setConfirmPassword('');
        setSuccess(false);
    };

    const handleClose = () => {
        reset();
        onClose();
    };

    const handleSubmit = async () => {
        if (!oldPassword || !newPassword || !confirmPassword) {
            Alert.alert('Missing Info', 'All fields are required.');
            return;
        }
        if (newPassword !== confirmPassword) {
            Alert.alert('Mismatch', 'New passwords do not match.');
            return;
        }
        if (newPassword.length < 8) {
            Alert.alert('Too Short', 'Password must be at least 8 characters.');
            return;
        }
        setLoading(true);
        const result = await changePassword(newPassword, oldPassword);
        setLoading(false);
        if (result.success) {
            setSuccess(true);
            setTimeout(handleClose, 1400);
        } else {
            Alert.alert('Error', result.error || 'Failed to update password.');
        }
    };

    return (
        <Modal transparent visible={visible} onRequestClose={handleClose} animationType="fade">
            <View style={styles.overlay}>
                <TouchableOpacity style={StyleSheet.absoluteFill} onPress={handleClose} />
                <View style={[styles.sheet, { backgroundColor: colors.cardBackground, borderColor: colors.borderGlow }]}>
                    {success ? (
                        <View style={{ alignItems: 'center', paddingVertical: 24 }}>
                            <Text style={{ fontSize: 48 }}>✅</Text>
                            <Text style={{ color: colors.successLight, fontFamily: 'Poppins_700Bold', fontSize: 16, marginTop: 8 }}>
                                Password Changed!
                            </Text>
                        </View>
                    ) : (
                        <>
                            <Text style={[styles.title, { color: colors.text }]}>🔑 Change Password</Text>

                            <TextInput
                                style={[styles.input, { backgroundColor: colors.glass, borderColor: colors.border, color: colors.text }]}
                                placeholder="Current password"
                                placeholderTextColor={colors.textMuted}
                                secureTextEntry
                                value={oldPassword}
                                onChangeText={setOldPassword}
                            />
                            <TextInput
                                style={[styles.input, { backgroundColor: colors.glass, borderColor: colors.border, color: colors.text }]}
                                placeholder="New password (min 8 chars)"
                                placeholderTextColor={colors.textMuted}
                                secureTextEntry
                                value={newPassword}
                                onChangeText={setNewPassword}
                            />
                            <TextInput
                                style={[styles.input, { backgroundColor: colors.glass, borderColor: colors.border, color: colors.text }]}
                                placeholder="Confirm new password"
                                placeholderTextColor={colors.textMuted}
                                secureTextEntry
                                value={confirmPassword}
                                onChangeText={setConfirmPassword}
                            />

                            <View style={styles.buttonRow}>
                                <TouchableOpacity style={[styles.cancelBtn, { backgroundColor: colors.glass, borderColor: colors.border }]} onPress={handleClose}>
                                    <Text style={{ color: colors.text, fontFamily: 'Poppins_600SemiBold' }}>Cancel</Text>
                                </TouchableOpacity>
                                <TouchableOpacity style={[styles.submitBtn, loading && { opacity: 0.6 }]} onPress={handleSubmit} disabled={loading}>
                                    <LinearGradient colors={colors.purplePinkGradient} style={styles.submitGradient}>
                                        <Text style={styles.submitText}>{loading ? 'Updating...' : 'Update'}</Text>
                                    </LinearGradient>
                                </TouchableOpacity>
                            </View>
                        </>
                    )}
                </View>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    overlay: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.55)', padding: 24 },
    sheet: { width: '100%', maxWidth: 360, borderRadius: 24, padding: 24, borderWidth: 1 },
    title: { fontSize: 18, fontFamily: 'Poppins_700Bold', marginBottom: 18, textAlign: 'center' },
    input: { borderWidth: 1, borderRadius: 12, padding: 14, fontSize: 14, fontFamily: 'Poppins_400Regular', marginBottom: 12 },
    buttonRow: { flexDirection: 'row', gap: 10, marginTop: 8 },
    cancelBtn: { flex: 1, padding: 14, borderRadius: 12, alignItems: 'center', borderWidth: 1 },
    submitBtn: { flex: 1, borderRadius: 12, overflow: 'hidden' },
    submitGradient: { padding: 14, alignItems: 'center' },
    submitText: { color: '#FFF', fontFamily: 'Poppins_700Bold', fontSize: 14 },
});
