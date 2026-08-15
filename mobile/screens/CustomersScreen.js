import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    FlatList,
    TouchableOpacity,
    StyleSheet,
    TextInput,
    Modal,
    Alert,
    Platform,
    ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useCustomers } from '../context/CustomersContext';
import { useTheme } from '../context/ThemeContext';
import { apiGet } from '../lib/api';

function fmtINR(v) {
    return '₹' + Number(v || 0).toLocaleString('en-IN');
}

function loyaltyTier(points) {
    if (points >= 500) return { tier: 'Gold', color: '#F59E0B' };
    if (points >= 200) return { tier: 'Silver', color: '#9CA3AF' };
    return { tier: 'Bronze', color: '#CD7F32' };
}

function CustomerFormModal({ visible, customer, onClose, onSave, colors }) {
    const [form, setForm] = useState({ name: '', phone: '', email: '', notes: '' });
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (visible) {
            setForm(customer
                ? { name: customer.name, phone: customer.phone || '', email: customer.email || '', notes: customer.notes || '' }
                : { name: '', phone: '', email: '', notes: '' });
        }
    }, [visible, customer]);

    const handleSubmit = async () => {
        if (!form.name.trim()) {
            Alert.alert('Missing Info', 'Name is required.');
            return;
        }
        setLoading(true);
        const result = await onSave(form);
        setLoading(false);
        if (result.success) onClose();
        else Alert.alert('Error', result.error || 'Failed to save.');
    };

    return (
        <Modal transparent visible={visible} onRequestClose={onClose} animationType="fade">
            <View style={styles.overlay}>
                <TouchableOpacity style={StyleSheet.absoluteFill} onPress={onClose} />
                <View style={[styles.sheet, { backgroundColor: colors.cardBackground, borderColor: colors.borderGlow }]}>
                    <Text style={[styles.sheetTitle, { color: colors.text }]}>{customer ? '✏️ Edit Customer' : '👤 Add Customer'}</Text>
                    <TextInput
                        style={[styles.input, { backgroundColor: colors.glass, borderColor: colors.border, color: colors.text }]}
                        placeholder="Full name *"
                        placeholderTextColor={colors.textMuted}
                        value={form.name}
                        onChangeText={t => setForm({ ...form, name: t })}
                    />
                    <TextInput
                        style={[styles.input, { backgroundColor: colors.glass, borderColor: colors.border, color: colors.text }]}
                        placeholder="Phone number"
                        placeholderTextColor={colors.textMuted}
                        keyboardType="phone-pad"
                        value={form.phone}
                        onChangeText={t => setForm({ ...form, phone: t })}
                    />
                    <TextInput
                        style={[styles.input, { backgroundColor: colors.glass, borderColor: colors.border, color: colors.text }]}
                        placeholder="Email (optional)"
                        placeholderTextColor={colors.textMuted}
                        keyboardType="email-address"
                        autoCapitalize="none"
                        value={form.email}
                        onChangeText={t => setForm({ ...form, email: t })}
                    />
                    <TextInput
                        style={[styles.input, { backgroundColor: colors.glass, borderColor: colors.border, color: colors.text, height: 70, textAlignVertical: 'top' }]}
                        placeholder="Notes (allergies, preferences...)"
                        placeholderTextColor={colors.textMuted}
                        multiline
                        value={form.notes}
                        onChangeText={t => setForm({ ...form, notes: t })}
                    />
                    <View style={styles.buttonRow}>
                        <TouchableOpacity style={[styles.cancelBtn, { backgroundColor: colors.glass, borderColor: colors.border }]} onPress={onClose}>
                            <Text style={{ color: colors.text, fontFamily: 'Poppins_600SemiBold' }}>Cancel</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={[styles.submitBtn, loading && { opacity: 0.6 }]} onPress={handleSubmit} disabled={loading}>
                            <LinearGradient colors={colors.purplePinkGradient} style={styles.submitGradient}>
                                <Text style={styles.submitText}>{loading ? 'Saving...' : 'Save'}</Text>
                            </LinearGradient>
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </Modal>
    );
}

function CustomerProfileModal({ customerId, onClose, colors }) {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!customerId) return;
        setLoading(true);
        apiGet(`/api/customers/${customerId}`)
            .then(setData)
            .catch(err => console.error(err))
            .finally(() => setLoading(false));
    }, [customerId]);

    const customer = data?.customer;
    const history = data?.serviceHistory || [];
    const { tier, color } = loyaltyTier(customer?.loyaltyPoints || 0);

    return (
        <Modal transparent visible={!!customerId} onRequestClose={onClose} animationType="fade">
            <View style={styles.overlay}>
                <TouchableOpacity style={StyleSheet.absoluteFill} onPress={onClose} />
                <View style={[styles.sheet, { backgroundColor: colors.cardBackground, borderColor: colors.borderGlow, maxHeight: '80%' }]}>
                    {loading ? (
                        <ActivityIndicator color={colors.primary} style={{ marginVertical: 40 }} />
                    ) : !customer ? (
                        <Text style={{ color: colors.textMuted, textAlign: 'center' }}>Not found.</Text>
                    ) : (
                        <>
                            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
                                <View style={{ flex: 1 }}>
                                    <Text style={[styles.sheetTitle, { color: colors.text, marginBottom: 4 }]}>👤 {customer.name}</Text>
                                    {customer.phone ? <Text style={{ color: colors.textMuted, fontSize: 12 }}>📞 {customer.phone}</Text> : null}
                                    {customer.email ? <Text style={{ color: colors.textMuted, fontSize: 12 }}>✉️ {customer.email}</Text> : null}
                                </View>
                                <View style={[styles.tierBadge, { backgroundColor: color + '22', borderColor: color + '55' }]}>
                                    <Text style={{ color, fontSize: 11, fontFamily: 'Poppins_700Bold' }}>{tier} · {customer.loyaltyPoints || 0} pts</Text>
                                </View>
                            </View>

                            <View style={styles.statRow}>
                                <View style={[styles.statBox, { backgroundColor: '#A855F715' }]}>
                                    <Text style={{ fontSize: 18, fontFamily: 'Poppins_700Bold', color: '#A855F7' }}>{customer.visitCount || 0}</Text>
                                    <Text style={{ fontSize: 10, color: colors.textMuted }}>Visits</Text>
                                </View>
                                <View style={[styles.statBox, { backgroundColor: '#10B98115' }]}>
                                    <Text style={{ fontSize: 16, fontFamily: 'Poppins_700Bold', color: '#10B981' }}>{fmtINR(customer.totalSpend)}</Text>
                                    <Text style={{ fontSize: 10, color: colors.textMuted }}>Total Spent</Text>
                                </View>
                                <View style={[styles.statBox, { backgroundColor: '#F59E0B15' }]}>
                                    <Text style={{ fontSize: 18, fontFamily: 'Poppins_700Bold', color: '#F59E0B' }}>{customer.loyaltyPoints || 0}</Text>
                                    <Text style={{ fontSize: 10, color: colors.textMuted }}>Loyalty Pts</Text>
                                </View>
                            </View>

                            {customer.notes ? (
                                <Text style={{ color: colors.textMuted, fontSize: 12, backgroundColor: colors.glass, padding: 10, borderRadius: 8, marginBottom: 12 }}>
                                    📝 {customer.notes}
                                </Text>
                            ) : null}

                            <Text style={{ color: colors.text, fontFamily: 'Poppins_600SemiBold', fontSize: 13, marginBottom: 8 }}>
                                Service History ({history.length})
                            </Text>
                            <FlatList
                                data={history}
                                keyExtractor={r => r.$id}
                                style={{ maxHeight: 220 }}
                                renderItem={({ item: r }) => (
                                    <View style={[styles.historyRow, { borderColor: colors.border }]}>
                                        <View style={{ flex: 1 }}>
                                            <Text style={{ color: colors.text, fontSize: 13, fontFamily: 'Poppins_600SemiBold' }}>{r.serviceName}</Text>
                                            <Text style={{ color: colors.textMuted, fontSize: 11 }}>
                                                {r.WorkerName ? `${r.WorkerName} · ` : ''}{new Date(r.Date).toLocaleDateString('en-IN')}
                                            </Text>
                                        </View>
                                        <Text style={{ color: colors.successLight, fontFamily: 'Poppins_700Bold', fontSize: 13 }}>+{fmtINR(r.totalPrice)}</Text>
                                    </View>
                                )}
                                ListEmptyComponent={<Text style={{ color: colors.textMuted, fontSize: 12, textAlign: 'center', marginVertical: 12 }}>No services yet.</Text>}
                            />
                        </>
                    )}
                    <TouchableOpacity style={[styles.cancelBtn, { backgroundColor: colors.glass, borderColor: colors.border, marginTop: 14 }]} onPress={onClose}>
                        <Text style={{ color: colors.text, fontFamily: 'Poppins_600SemiBold' }}>Close</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </Modal>
    );
}

export default function CustomersScreen() {
    const { customers, loading, addCustomer, updateCustomer, deleteCustomer } = useCustomers();
    const { colors } = useTheme();
    const [search, setSearch] = useState('');
    const [formVisible, setFormVisible] = useState(false);
    const [editing, setEditing] = useState(null);
    const [viewingId, setViewingId] = useState(null);

    const filtered = customers.filter(c =>
        c.name.toLowerCase().includes(search.toLowerCase()) ||
        (c.phone || '').includes(search)
    );

    const handleDelete = (c) => {
        Alert.alert('Delete Customer', `Remove "${c.name}" and their profile data? Service records stay intact.`, [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Delete', style: 'destructive', onPress: () => deleteCustomer(c.$id) },
        ]);
    };

    return (
        <View style={[styles.container, { backgroundColor: colors.background }]}>
            <LinearGradient colors={[colors.background, colors.gradientStart]} style={StyleSheet.absoluteFill} />

            <View style={styles.header}>
                <View style={styles.headerTop}>
                    <Text style={[styles.headerTitle, { color: colors.text }]}>Customers</Text>
                    <TouchableOpacity
                        style={[styles.addBtn, { backgroundColor: colors.primary }]}
                        onPress={() => { setEditing(null); setFormVisible(true); }}
                    >
                        <Ionicons name="add" size={20} color="#FFF" />
                        <Text style={styles.addBtnText}>Add</Text>
                    </TouchableOpacity>
                </View>

                <View style={[styles.searchBar, { backgroundColor: colors.glass, borderColor: colors.border }]}>
                    <Ionicons name="search" size={18} color={colors.textMuted} />
                    <TextInput
                        style={[styles.searchInput, { color: colors.text }]}
                        placeholder="Search by name or phone..."
                        placeholderTextColor={colors.textMuted}
                        value={search}
                        onChangeText={setSearch}
                    />
                </View>
            </View>

            <FlatList
                data={filtered}
                keyExtractor={c => c.$id}
                contentContainerStyle={styles.listContent}
                renderItem={({ item: c }) => {
                    const { tier, color } = loyaltyTier(c.loyaltyPoints || 0);
                    return (
                        <TouchableOpacity
                            style={[styles.row, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}
                            onPress={() => setViewingId(c.$id)}
                            onLongPress={() => handleDelete(c)}
                        >
                            <View style={styles.avatarBig}>
                                <Text style={{ color: '#FFF', fontFamily: 'Poppins_700Bold', fontSize: 16 }}>{c.name[0]?.toUpperCase()}</Text>
                            </View>
                            <View style={{ flex: 1 }}>
                                <Text style={[styles.rowName, { color: colors.text }]}>{c.name}</Text>
                                <Text style={[styles.rowMeta, { color: colors.textSecondary }]}>
                                    {c.phone || c.email || 'No contact'} · {c.visitCount || 0} visits · {fmtINR(c.totalSpend)}
                                </Text>
                            </View>
                            <View style={{ alignItems: 'flex-end', gap: 6 }}>
                                <View style={[styles.badge, { backgroundColor: color + '22', borderColor: color + '55' }]}>
                                    <Text style={{ color, fontSize: 10, fontFamily: 'Poppins_700Bold' }}>{tier}</Text>
                                </View>
                                <TouchableOpacity onPress={() => { setEditing(c); setFormVisible(true); }}>
                                    <Ionicons name="pencil" size={16} color={colors.textMuted} />
                                </TouchableOpacity>
                            </View>
                        </TouchableOpacity>
                    );
                }}
                ListEmptyComponent={
                    <View style={styles.emptyState}>
                        <Ionicons name="people-outline" size={48} color={colors.textMuted} />
                        <Text style={{ color: colors.textSecondary, marginTop: 12 }}>
                            {loading ? 'Loading...' : search ? 'No customers found.' : 'No customers yet — tap "Add" to register one.'}
                        </Text>
                    </View>
                }
            />

            <CustomerFormModal
                visible={formVisible}
                customer={editing}
                colors={colors}
                onClose={() => setFormVisible(false)}
                onSave={data => editing ? updateCustomer(editing.$id, data) : addCustomer(data)}
            />
            {viewingId && <CustomerProfileModal customerId={viewingId} colors={colors} onClose={() => setViewingId(null)} />}
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    header: { paddingHorizontal: 20, paddingTop: Platform.OS === 'ios' ? 60 : 50, paddingBottom: 12 },
    headerTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
    headerTitle: { fontSize: 30, fontFamily: 'Poppins_700Bold', letterSpacing: -0.5 },
    addBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 14, paddingVertical: 10, borderRadius: 14 },
    addBtnText: { color: '#FFF', fontFamily: 'Poppins_600SemiBold', fontSize: 13 },
    searchBar: { flexDirection: 'row', alignItems: 'center', gap: 8, borderRadius: 12, borderWidth: 1, paddingHorizontal: 12, height: 44 },
    searchInput: { flex: 1, fontFamily: 'Poppins_400Regular', fontSize: 14 },
    listContent: { paddingHorizontal: 20, paddingBottom: 100 },
    row: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderRadius: 16, borderWidth: 1, marginBottom: 10 },
    avatarBig: { width: 42, height: 42, borderRadius: 21, backgroundColor: '#A855F7', alignItems: 'center', justifyContent: 'center' },
    rowName: { fontSize: 15, fontFamily: 'Poppins_600SemiBold' },
    rowMeta: { fontSize: 12, fontFamily: 'Poppins_400Regular', marginTop: 3 },
    badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8, borderWidth: 1 },
    emptyState: { alignItems: 'center', paddingVertical: 60 },
    // Modals
    overlay: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.55)', padding: 20 },
    sheet: { width: '100%', maxWidth: 420, borderRadius: 24, padding: 22, borderWidth: 1 },
    sheetTitle: { fontSize: 18, fontFamily: 'Poppins_700Bold', marginBottom: 16, textAlign: 'center' },
    input: { borderWidth: 1, borderRadius: 12, padding: 14, fontSize: 14, fontFamily: 'Poppins_400Regular', marginBottom: 12 },
    buttonRow: { flexDirection: 'row', gap: 10, marginTop: 4 },
    cancelBtn: { flex: 1, padding: 14, borderRadius: 12, alignItems: 'center', borderWidth: 1 },
    submitBtn: { flex: 1, borderRadius: 12, overflow: 'hidden' },
    submitGradient: { padding: 14, alignItems: 'center' },
    submitText: { color: '#FFF', fontFamily: 'Poppins_700Bold', fontSize: 14 },
    tierBadge: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 10, borderWidth: 1 },
    statRow: { flexDirection: 'row', gap: 10, marginBottom: 14 },
    statBox: { flex: 1, borderRadius: 12, padding: 10, alignItems: 'center' },
    historyRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 10, borderBottomWidth: 1 },
});
