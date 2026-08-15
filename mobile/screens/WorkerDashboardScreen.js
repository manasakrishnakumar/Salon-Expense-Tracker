import React, { useState, useEffect, useMemo } from 'react';
import {
    View,
    Text,
    ScrollView,
    FlatList,
    TouchableOpacity,
    StyleSheet,
    Platform,
    ActivityIndicator,
    Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { useServices } from '../context/ServicesContext';
import { useTheme } from '../context/ThemeContext';
import { apiGet, apiPost, apiPut } from '../lib/api';

function fmtINR(v) { return '₹' + Number(v || 0).toLocaleString('en-IN'); }
function fmtDuration(mins) {
    if (!mins) return '—';
    const h = Math.floor(mins / 60), m = mins % 60;
    return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

function StatCard({ label, value, sub, colors: gradientColors, icon, textColor }) {
    return (
        <LinearGradient colors={gradientColors} style={statStyles.card}>
            <View style={statStyles.top}>
                <View style={{ flex: 1 }}>
                    <Text style={statStyles.label}>{label}</Text>
                    <Text style={statStyles.sub}>{sub}</Text>
                </View>
                <Text style={{ fontSize: 20 }}>{icon}</Text>
            </View>
            <Text style={statStyles.value}>{value}</Text>
        </LinearGradient>
    );
}

const statStyles = StyleSheet.create({
    card: { width: '48%', borderRadius: 16, padding: 16, marginBottom: 12 },
    top: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 },
    label: { fontSize: 11, fontFamily: 'Poppins_600SemiBold', color: 'rgba(255,255,255,0.8)', textTransform: 'uppercase' },
    sub: { fontSize: 10, color: 'rgba(255,255,255,0.55)', marginTop: 2 },
    value: { fontSize: 20, fontFamily: 'Poppins_700Bold', color: '#FFF' },
});

export default function WorkerDashboardScreen() {
    const { user } = useAuth();
    const { serviceRecords } = useServices();
    const { colors } = useTheme();
    const [attendance, setAttendance] = useState([]);
    const [loadingAtt, setLoadingAtt] = useState(true);
    const [tab, setTab] = useState('overview'); // overview | attendance | history
    const [checking, setChecking] = useState(false);

    const today = new Date().toISOString().split('T')[0];
    const thisMonth = new Date().toISOString().slice(0, 7);

    const myRecords = useMemo(() => serviceRecords.filter(r => r.WorkerName === user?.name), [serviceRecords, user]);
    const todayRecords = myRecords.filter(r => r.Date?.startsWith(today));
    const monthRecords = myRecords.filter(r => r.Date?.startsWith(thisMonth));

    const totalRevenue = myRecords.reduce((s, r) => s + (r.totalPrice || 0), 0);
    const totalTips = myRecords.reduce((s, r) => s + (r.tip || 0), 0);
    const monthRevenue = monthRecords.reduce((s, r) => s + (r.totalPrice || 0), 0);
    const monthTips = monthRecords.reduce((s, r) => s + (r.tip || 0), 0);

    const loadAttendance = () => {
        setLoadingAtt(true);
        apiGet('/api/attendance')
            .then(res => setAttendance(res.records || []))
            .catch(err => console.error(err))
            .finally(() => setLoadingAtt(false));
    };

    useEffect(() => { loadAttendance(); }, []);

    // Prefer the stable workerId match (what the backend itself scopes by
    // for a worker's own /api/attendance call) over a name-string
    // comparison — a worker whose display name changed, or whose
    // attendance record was created with slightly different
    // capitalization/whitespace, would otherwise silently see their own
    // check-ins vanish from this screen. Keep the name fallback for older
    // records that predate workerId being reliably stored.
    const myAttendance = attendance.filter(a => (a.workerId && a.workerId === user?.$id) || a.workerName === user?.name);
    const todayAtt = myAttendance.find(a => a.date === today);
    const monthAtt = myAttendance.filter(a => a.date?.startsWith(thisMonth));
    const monthHours = monthAtt.reduce((s, a) => s + (a.durationMinutes || 0), 0);

    const handleCheckIn = async () => {
        setChecking(true);
        try {
            const res = await apiPost('/api/attendance/checkin', { workerName: user.name, workerId: user.$id });
            setAttendance(prev => [res.record, ...prev]);
        } catch (err) {
            Alert.alert('Error', err.message);
        } finally {
            setChecking(false);
        }
    };

    const handleCheckOut = async () => {
        if (!todayAtt) return;
        setChecking(true);
        try {
            const res = await apiPut(`/api/attendance/${todayAtt.$id}/checkout`, {});
            setAttendance(prev => prev.map(a => a.$id === todayAtt.$id ? res.record : a));
        } catch (err) {
            Alert.alert('Error', err.message);
        } finally {
            setChecking(false);
        }
    };

    const TABS = [
        { key: 'overview', label: '📊 My Stats' },
        { key: 'attendance', label: '🗓️ Attendance' },
        { key: 'history', label: '✂️ History' },
    ];

    return (
        <View style={[styles.container, { backgroundColor: colors.background }]}>
            <LinearGradient colors={[colors.background, colors.gradientStart]} style={StyleSheet.absoluteFill} />

            <View style={styles.header}>
                <Text style={[styles.headerTitle, { color: colors.text }]}>👋 Hi, {user?.name?.split(' ')[0]}</Text>

                {loadingAtt ? (
                    <ActivityIndicator color={colors.primary} style={{ marginTop: 10 }} />
                ) : !todayAtt ? (
                    <TouchableOpacity style={[styles.checkBtn, { backgroundColor: colors.primary }, checking && { opacity: 0.6 }]} onPress={handleCheckIn} disabled={checking}>
                        <Text style={styles.checkBtnText}>{checking ? 'Checking in...' : '🟢 Check In'}</Text>
                    </TouchableOpacity>
                ) : !todayAtt.checkOut ? (
                    <View style={{ alignItems: 'flex-start', marginTop: 10 }}>
                        <Text style={{ color: '#10B981', fontFamily: 'Poppins_600SemiBold', fontSize: 12, marginBottom: 8 }}>
                            🟢 Checked in at {todayAtt.checkIn?.slice(11, 16)}
                        </Text>
                        <TouchableOpacity style={[styles.checkBtn, { backgroundColor: colors.danger }, checking && { opacity: 0.6 }]} onPress={handleCheckOut} disabled={checking}>
                            <Text style={styles.checkBtnText}>{checking ? 'Checking out...' : '🔴 Check Out'}</Text>
                        </TouchableOpacity>
                    </View>
                ) : (
                    <Text style={{ color: colors.textMuted, fontSize: 13, marginTop: 8 }}>
                        ✅ Done today · {fmtDuration(todayAtt.durationMinutes)}
                    </Text>
                )}
            </View>

            {/* Today strip */}
            <View style={[styles.todayStrip, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}>
                <View style={styles.todayItem}>
                    <Text style={[styles.todayLabel, { color: colors.textMuted }]}>Today's Services</Text>
                    <Text style={[styles.todayValue, { color: colors.primaryLight }]}>{todayRecords.length}</Text>
                </View>
                <View style={styles.todayItem}>
                    <Text style={[styles.todayLabel, { color: colors.textMuted }]}>Revenue</Text>
                    <Text style={[styles.todayValue, { color: '#10B981' }]}>{fmtINR(todayRecords.reduce((s, r) => s + (r.totalPrice || 0), 0))}</Text>
                </View>
                <View style={styles.todayItem}>
                    <Text style={[styles.todayLabel, { color: colors.textMuted }]}>Tips</Text>
                    <Text style={[styles.todayValue, { color: '#EC4899' }]}>{fmtINR(todayRecords.reduce((s, r) => s + (r.tip || 0), 0))}</Text>
                </View>
            </View>

            <View style={styles.tabRow}>
                {TABS.map(t => (
                    <TouchableOpacity
                        key={t.key}
                        style={[styles.tabChip, { borderColor: colors.border }, tab === t.key && { borderColor: colors.primary, backgroundColor: colors.primary + '18' }]}
                        onPress={() => setTab(t.key)}
                    >
                        <Text style={[styles.tabChipText, { color: tab === t.key ? colors.primaryLight : colors.textSecondary }]}>{t.label}</Text>
                    </TouchableOpacity>
                ))}
            </View>

            {tab === 'overview' && (
                <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                    <View style={styles.statGrid}>
                        <StatCard label="Total Services" value={myRecords.length} sub="All time" colors={['#A855F7', '#7C3AED']} icon="✂️" />
                        <StatCard label="Total Revenue" value={fmtINR(totalRevenue)} sub="You charged" colors={['#10B981', '#059669']} icon="💰" />
                        <StatCard label="Total Tips" value={fmtINR(totalTips)} sub="All time" colors={['#EC4899', '#DB2777']} icon="🎁" />
                        <StatCard label="This Month" value={`${monthRecords.length} svc`} sub={`${fmtINR(monthRevenue)} · ${fmtINR(monthTips)} tips`} colors={['#F59E0B', '#D97706']} icon="📅" />
                        <StatCard label="Days Present" value={monthAtt.length} sub="This month" colors={['#6366F1', '#4F46E5']} icon="🗓️" />
                        <StatCard label="Hours Worked" value={fmtDuration(monthHours)} sub="This month" colors={['#14B8A6', '#0D9488']} icon="⏱️" />
                    </View>
                </ScrollView>
            )}

            {tab === 'attendance' && (
                <FlatList
                    data={[...myAttendance].sort((a, b) => (b.date || '').localeCompare(a.date || ''))}
                    keyExtractor={a => a.$id}
                    contentContainerStyle={styles.listContent}
                    renderItem={({ item: a }) => (
                        <View style={[styles.row, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}>
                            <Text style={{ fontSize: 20 }}>{a.checkOut ? '✅' : '🟢'}</Text>
                            <View style={{ flex: 1, marginLeft: 12 }}>
                                <Text style={[styles.rowName, { color: colors.text }]}>{a.date}</Text>
                                <Text style={[styles.rowMeta, { color: colors.textSecondary }]}>
                                    In: {a.checkIn?.slice(11, 16) || '—'} · Out: {a.checkOut?.slice(11, 16) || 'Not yet'}
                                </Text>
                            </View>
                            <Text style={{ color: '#10B981', fontFamily: 'Poppins_700Bold', fontSize: 14 }}>
                                {a.durationMinutes ? fmtDuration(a.durationMinutes) : '—'}
                            </Text>
                        </View>
                    )}
                    ListEmptyComponent={
                        <View style={styles.emptyState}>
                            <Ionicons name="calendar-outline" size={48} color={colors.textMuted} />
                            <Text style={{ color: colors.textSecondary, marginTop: 12 }}>
                                {loadingAtt ? 'Loading...' : 'No attendance yet — use Check In above.'}
                            </Text>
                        </View>
                    }
                />
            )}

            {tab === 'history' && (
                <FlatList
                    data={[...myRecords].sort((a, b) => (b.Date || '').localeCompare(a.Date || ''))}
                    keyExtractor={r => r.$id}
                    contentContainerStyle={styles.listContent}
                    renderItem={({ item: r }) => (
                        <View style={[styles.row, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}>
                            <Text style={{ fontSize: 20 }}>✂️</Text>
                            <View style={{ flex: 1, marginLeft: 12 }}>
                                <Text style={[styles.rowName, { color: colors.text }]}>{r.serviceName}</Text>
                                <Text style={[styles.rowMeta, { color: colors.textSecondary }]}>
                                    {r.Date?.split('T')[0]} · Qty: {r.quantity}
                                    {r.tip > 0 ? ` · Tip: ${fmtINR(r.tip)}` : ''}
                                </Text>
                            </View>
                            <Text style={{ color: '#10B981', fontFamily: 'Poppins_700Bold', fontSize: 14 }}>{fmtINR(r.totalPrice)}</Text>
                        </View>
                    )}
                    ListEmptyComponent={
                        <View style={styles.emptyState}>
                            <Ionicons name="cut-outline" size={48} color={colors.textMuted} />
                            <Text style={{ color: colors.textSecondary, marginTop: 12 }}>No services recorded yet.</Text>
                        </View>
                    }
                />
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    header: { paddingHorizontal: 20, paddingTop: Platform.OS === 'ios' ? 60 : 50, paddingBottom: 12 },
    headerTitle: { fontSize: 26, fontFamily: 'Poppins_700Bold' },
    checkBtn: { marginTop: 10, alignSelf: 'flex-start', paddingHorizontal: 20, paddingVertical: 12, borderRadius: 14 },
    checkBtnText: { color: '#FFF', fontFamily: 'Poppins_700Bold', fontSize: 14 },
    todayStrip: { flexDirection: 'row', marginHorizontal: 20, borderRadius: 14, borderWidth: 1, padding: 14, marginBottom: 12 },
    todayItem: { flex: 1 },
    todayLabel: { fontSize: 10, fontFamily: 'Poppins_500Medium', textTransform: 'uppercase' },
    todayValue: { fontSize: 16, fontFamily: 'Poppins_700Bold', marginTop: 2 },
    tabRow: { flexDirection: 'row', gap: 8, paddingHorizontal: 20, marginBottom: 12 },
    tabChip: { paddingHorizontal: 10, paddingVertical: 8, borderRadius: 12, borderWidth: 1 },
    tabChipText: { fontSize: 11, fontFamily: 'Poppins_600SemiBold' },
    scrollContent: { paddingHorizontal: 20, paddingBottom: 110 },
    statGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
    listContent: { paddingHorizontal: 20, paddingBottom: 110 },
    row: { flexDirection: 'row', alignItems: 'center', padding: 14, borderRadius: 16, borderWidth: 1, marginBottom: 10 },
    rowName: { fontSize: 14, fontFamily: 'Poppins_600SemiBold' },
    rowMeta: { fontSize: 12, fontFamily: 'Poppins_400Regular', marginTop: 3 },
    emptyState: { alignItems: 'center', paddingVertical: 60 },
});
