import React, { useState, useMemo } from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    StyleSheet,
    TextInput,
    Alert,
    Platform,
    ScrollView,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useWorkers } from '../context/WorkersContext';
import { useServices } from '../context/ServicesContext';
import { useTheme } from '../context/ThemeContext';

function WorkerCard({ worker, rank, colors }) {
    return (
        <View style={[styles.workerCard, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}>
            <View style={styles.workerTop}>
                <View style={[styles.avatar, { backgroundColor: colors.primary + '25' }]}>
                    <Text style={{ color: colors.primaryLight, fontFamily: 'Poppins_700Bold' }}>
                        {worker.name[0]?.toUpperCase()}
                    </Text>
                </View>
                {rank === 0 && worker.totalServices > 0 && (
                    <View style={[styles.topBadge, { backgroundColor: colors.warning + '20' }]}>
                        <Text style={{ fontSize: 10, color: colors.warningLight, fontFamily: 'Poppins_700Bold' }}>🏆 Top</Text>
                    </View>
                )}
            </View>
            <Text style={[styles.workerName, { color: colors.text }]}>{worker.name}</Text>
            <View style={styles.workerStatsRow}>
                <View style={styles.workerStat}>
                    <Text style={[styles.workerStatValue, { color: colors.successLight }]}>₹{worker.totalRevenue.toLocaleString('en-IN')}</Text>
                    <Text style={[styles.workerStatLabel, { color: colors.textMuted }]}>Revenue</Text>
                </View>
                <View style={styles.workerStat}>
                    <Text style={[styles.workerStatValue, { color: colors.primaryLight }]}>{worker.totalServices}</Text>
                    <Text style={[styles.workerStatLabel, { color: colors.textMuted }]}>Services</Text>
                </View>
            </View>
        </View>
    );
}

export default function WorkersScreen() {
    const { workers, addWorker, deleteWorker, inviteWorker, loading } = useWorkers();
    const { serviceRecords } = useServices();
    const { colors } = useTheme();

    const [newName, setNewName] = useState('');
    const [adding, setAdding] = useState(false);

    const [invite, setInvite] = useState({ name: '', email: '' });
    const [inviting, setInviting] = useState(false);
    const [inviteResult, setInviteResult] = useState(null);

    const workerStats = useMemo(() => {
        return workers.map(w => {
            // Revenue = totalPrice (what was charged), not totalCost (what
            // it cost the salon) — same fix as web's WorkersPage.
            const records = serviceRecords.filter(r => r.WorkerName === w.name);
            const totalRevenue = records.reduce((sum, r) => sum + (r.totalPrice || 0), 0);
            return { ...w, totalRevenue, totalServices: records.length };
        }).sort((a, b) => b.totalRevenue - a.totalRevenue);
    }, [workers, serviceRecords]);

    const handleAdd = async () => {
        if (!newName.trim()) return;
        setAdding(true);
        const result = await addWorker(newName.trim());
        setAdding(false);
        if (result.success) setNewName('');
        else Alert.alert('Error', result.error || 'Failed to add worker.');
    };

    const handleDelete = (id, name) => {
        Alert.alert('Remove Worker', `Remove "${name}" from the list?`, [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Remove', style: 'destructive', onPress: () => deleteWorker(id) },
        ]);
    };

    const handleInvite = async () => {
        if (!invite.name.trim() || !invite.email.trim()) {
            Alert.alert('Missing Info', 'Name and email are required.');
            return;
        }
        setInviting(true);
        // No password field — the backend generates a temp password and
        // returns it for the admin to share manually (no email service
        // required).
        const result = await inviteWorker({ name: invite.name.trim(), email: invite.email.trim() });
        setInviting(false);
        if (result.success) {
            setInviteResult(result);
            setInvite({ name: '', email: '' });
        } else {
            Alert.alert('Error', result.error || 'Failed to invite worker.');
        }
    };

    return (
        <View style={[styles.container, { backgroundColor: colors.background }]}>
            <LinearGradient colors={[colors.background, colors.gradientStart]} style={StyleSheet.absoluteFill} />

            <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                <Text style={[styles.headerTitle, { color: colors.text }]}>Workers</Text>

                {/* Add plain name */}
                <View style={[styles.card, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}>
                    <Text style={[styles.cardTitle, { color: colors.text }]}>➕ Add Worker</Text>
                    <Text style={[styles.cardSubtitle, { color: colors.textMuted }]}>
                        Just a name for attribution — no login, no access to this app.
                    </Text>
                    <View style={styles.row}>
                        <TextInput
                            style={[styles.input, { flex: 1, backgroundColor: colors.glass, borderColor: colors.border, color: colors.text }]}
                            placeholder="Worker name"
                            placeholderTextColor={colors.textMuted}
                            value={newName}
                            onChangeText={setNewName}
                        />
                        <TouchableOpacity
                            style={[styles.smallBtn, { backgroundColor: colors.primary }, (!newName.trim() || adding) && { opacity: 0.5 }]}
                            onPress={handleAdd}
                            disabled={!newName.trim() || adding}
                        >
                            <Text style={styles.smallBtnText}>{adding ? '...' : 'Add'}</Text>
                        </TouchableOpacity>
                    </View>
                </View>

                {/* Invite real login */}
                <View style={[styles.card, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}>
                    <Text style={[styles.cardTitle, { color: colors.text }]}>🔑 Invite Worker</Text>
                    <Text style={[styles.cardSubtitle, { color: colors.textMuted }]}>
                        Creates a real login, scoped to your salon. A temporary password is generated
                        automatically — share it with them directly (no email service needed). They can
                        record services and see their own dashboard — nothing else.
                    </Text>

                    {inviteResult && (
                        <View style={[styles.resultBox, { backgroundColor: colors.success + '15', borderColor: colors.success + '40' }]}>
                            <Text style={{ color: colors.successLight, fontFamily: 'Poppins_700Bold', marginBottom: 4 }}>
                                ✅ {inviteResult.worker.name} can now log in
                            </Text>
                            <Text style={{ color: colors.text, fontSize: 12 }}>Email: {inviteResult.worker.email}</Text>
                            <Text style={{ color: colors.text, fontSize: 12 }}>Temp password: {inviteResult.tempPassword}</Text>
                            <TouchableOpacity onPress={() => setInviteResult(null)} style={{ marginTop: 8 }}>
                                <Text style={{ color: colors.primaryLight, fontSize: 12, fontFamily: 'Poppins_600SemiBold' }}>+ Invite another</Text>
                            </TouchableOpacity>
                        </View>
                    )}

                    {!inviteResult && (
                        <>
                            <TextInput
                                style={[styles.input, { backgroundColor: colors.glass, borderColor: colors.border, color: colors.text, marginBottom: 10 }]}
                                placeholder="Full name"
                                placeholderTextColor={colors.textMuted}
                                value={invite.name}
                                onChangeText={t => setInvite({ ...invite, name: t })}
                            />
                            <TextInput
                                style={[styles.input, { backgroundColor: colors.glass, borderColor: colors.border, color: colors.text, marginBottom: 12 }]}
                                placeholder="Email address (used to log in)"
                                placeholderTextColor={colors.textMuted}
                                keyboardType="email-address"
                                autoCapitalize="none"
                                value={invite.email}
                                onChangeText={t => setInvite({ ...invite, email: t })}
                            />
                            <TouchableOpacity
                                style={[styles.fullBtn, inviting && { opacity: 0.6 }]}
                                onPress={handleInvite}
                                disabled={inviting}
                            >
                                <LinearGradient colors={colors.purplePinkGradient} style={styles.fullBtnGradient}>
                                    <Text style={styles.fullBtnText}>{inviting ? 'Inviting...' : '🔑 Create Login'}</Text>
                                </LinearGradient>
                            </TouchableOpacity>
                        </>
                    )}
                </View>

                {/* Team list */}
                <Text style={[styles.sectionTitle, { color: colors.text }]}>Team ({workers.length})</Text>
                {workers.length === 0 ? (
                    <Text style={{ color: colors.textMuted, textAlign: 'center', marginVertical: 20 }}>
                        {loading ? 'Loading...' : 'No workers yet — add your first team member above.'}
                    </Text>
                ) : (
                    <View style={styles.workerGrid}>
                        {workerStats.map((w, i) => (
                            <TouchableOpacity key={w.$id} onLongPress={() => handleDelete(w.$id, w.name)} activeOpacity={0.85} style={{ width: '48%' }}>
                                <WorkerCard worker={w} rank={i} colors={colors} />
                            </TouchableOpacity>
                        ))}
                    </View>
                )}
                {workers.length > 0 && (
                    <Text style={{ color: colors.textMuted, fontSize: 11, textAlign: 'center', marginTop: 8 }}>
                        Long-press a card to remove
                    </Text>
                )}
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    scrollContent: { padding: 20, paddingTop: Platform.OS === 'ios' ? 60 : 50, paddingBottom: 120 },
    headerTitle: { fontSize: 30, fontFamily: 'Poppins_700Bold', marginBottom: 20 },
    card: { borderRadius: 20, padding: 18, borderWidth: 1, marginBottom: 18 },
    cardTitle: { fontSize: 16, fontFamily: 'Poppins_600SemiBold', marginBottom: 4 },
    cardSubtitle: { fontSize: 12, fontFamily: 'Poppins_400Regular', marginBottom: 14 },
    row: { flexDirection: 'row', gap: 10 },
    input: { borderWidth: 1, borderRadius: 12, padding: 14, fontSize: 14, fontFamily: 'Poppins_400Regular' },
    smallBtn: { paddingHorizontal: 18, borderRadius: 12, justifyContent: 'center' },
    smallBtnText: { color: '#FFF', fontFamily: 'Poppins_600SemiBold' },
    resultBox: { borderRadius: 12, borderWidth: 1, padding: 12, marginBottom: 14 },
    fullBtn: { borderRadius: 14, overflow: 'hidden' },
    fullBtnGradient: { padding: 15, alignItems: 'center' },
    fullBtnText: { color: '#FFF', fontFamily: 'Poppins_700Bold', fontSize: 14 },
    sectionTitle: { fontSize: 18, fontFamily: 'Poppins_600SemiBold', marginBottom: 14 },
    workerGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', gap: 12 },
    workerCard: { borderRadius: 18, padding: 14, borderWidth: 1, marginBottom: 12 },
    workerTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
    avatar: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
    topBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 8 },
    workerName: { fontSize: 14, fontFamily: 'Poppins_600SemiBold', marginBottom: 10 },
    workerStatsRow: { flexDirection: 'row', gap: 12 },
    workerStat: { flex: 1 },
    workerStatValue: { fontSize: 14, fontFamily: 'Poppins_700Bold' },
    workerStatLabel: { fontSize: 10, fontFamily: 'Poppins_500Medium', marginTop: 2 },
});
