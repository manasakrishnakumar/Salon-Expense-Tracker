import React, { useState, useMemo } from 'react';
import {
    View,
    Text,
    FlatList,
    TouchableOpacity,
    StyleSheet,
    Modal,
    TextInput,
    Alert,
    Platform,
    Animated,
    Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useStock } from '../context/StockContext';
import { useTheme } from '../context/ThemeContext';

const { height } = Dimensions.get('window');

const STATUS_COLORS = { ok: '#10B981', low: '#F59E0B', empty: '#EF4444', never: '#6B7280' };
const STATUS_LABELS = { ok: 'In Stock', low: 'Low Stock', empty: 'Out of Stock', never: 'Not Set Up' };
const URGENCY_COLORS = { critical: '#EF4444', high: '#F59E0B', medium: '#6366F1', ok: '#10B981' };
const URGENCY_LABELS = { critical: '🚨 Critical', high: '⚠️ High', medium: '📌 Medium', ok: '✅ OK' };
const REASONS = [
    { value: 'wastage', label: '♻️ Wastage / Spill' },
    { value: 'expiry', label: '⏰ Expired' },
    { value: 'theft', label: '🚨 Theft / Loss' },
    { value: 'other', label: '📋 Other' },
];

function getStatus(p) {
    if (p.neverRestocked) return 'never';
    if (p.remaining === 0) return 'empty';
    if (p.isLowStock) return 'low';
    return 'ok';
}

function StockRow({ product, colors, onRestock, onWriteOff }) {
    const status = getStatus(product);
    const color = STATUS_COLORS[status];
    return (
        <View style={[styles.row, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}>
            <View style={{ flex: 1 }}>
                <Text style={[styles.rowName, { color: colors.text }]}>{product.name}</Text>
                <Text style={[styles.rowMeta, { color: colors.textSecondary }]}>
                    {product.remaining}{product.unit} remaining
                    {!product.neverRestocked ? ` · ${product.usedPercent}% used` : ''}
                    {product.totalAdjusted > 0 ? ` · −${product.totalAdjusted} written off` : ''}
                </Text>
            </View>
            <View style={{ alignItems: 'flex-end', gap: 6 }}>
                <View style={[styles.badge, { backgroundColor: color + '22', borderColor: color + '55' }]}>
                    <Text style={[styles.badgeText, { color }]}>{STATUS_LABELS[status]}</Text>
                </View>
                <TouchableOpacity onPress={() => onRestock(product.name)}>
                    <Text style={[styles.restockLink, { color: colors.primaryLight }]}>+ Restock</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => onWriteOff(product.name)}>
                    <Text style={[styles.restockLink, { color: '#EF4444' }]}>📝 Write Off</Text>
                </TouchableOpacity>
            </View>
        </View>
    );
}

export default function StockScreen() {
    const {
        products, productStockMap, adjustments, reorderSuggestions, loading,
        addRestock, addAdjustment, getTotalInventoryValue,
    } = useStock();
    const { colors } = useTheme();

    const [tab, setTab] = useState('inventory'); // inventory | reorder | writeoffs
    const [filter, setFilter] = useState('all'); // all | low | never
    const [search, setSearch] = useState('');
    const [modalVisible, setModalVisible] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [form, setForm] = useState({ productName: '', quantityAdded: '', purchasePrice: '', supplier: '' });

    const [writeOffVisible, setWriteOffVisible] = useState(false);
    const [writeOffProduct, setWriteOffProduct] = useState('');
    const [writeOffForm, setWriteOffForm] = useState({ quantityRemoved: '', reason: 'wastage', notes: '' });
    const [writeOffSubmitting, setWriteOffSubmitting] = useState(false);

    const modalSlide = React.useRef(new Animated.Value(height)).current;
    React.useEffect(() => {
        Animated.timing(modalSlide, {
            toValue: modalVisible ? 0 : height,
            duration: modalVisible ? 0 : 250,
            useNativeDriver: true,
        }).start();
        if (modalVisible) modalSlide.setValue(0);
    }, [modalVisible]);

    const allProducts = Object.values(productStockMap);
    const lowStockCount = allProducts.filter(p => p.isLowStock).length;
    const totalValue = getTotalInventoryValue();
    const urgentReorderCount = reorderSuggestions.filter(s => s.urgency !== 'ok').length;

    const filteredProducts = useMemo(() => {
        return allProducts.filter(p => {
            const matchSearch = p.name.toLowerCase().includes(search.toLowerCase());
            if (filter === 'low') return matchSearch && (p.isLowStock || p.remaining === 0);
            if (filter === 'never') return matchSearch && p.neverRestocked;
            return matchSearch;
        });
    }, [allProducts, filter, search]);

    const openRestock = (productName) => {
        setForm({ productName: productName || '', quantityAdded: '', purchasePrice: '', supplier: '' });
        setModalVisible(true);
    };

    const handleSubmit = async () => {
        if (!form.productName || !form.quantityAdded) {
            Alert.alert('Missing Info', 'Please select a product and enter a quantity.');
            return;
        }
        setIsSubmitting(true);
        const result = await addRestock(form);
        setIsSubmitting(false);
        if (result.success) {
            setModalVisible(false);
        } else {
            Alert.alert('Error', result.error || 'Failed to save restock.');
        }
    };

    const openWriteOff = (productName) => {
        setWriteOffProduct(productName);
        setWriteOffForm({ quantityRemoved: '', reason: 'wastage', notes: '' });
        setWriteOffVisible(true);
    };

    const handleWriteOffSubmit = async () => {
        if (!writeOffForm.quantityRemoved || Number(writeOffForm.quantityRemoved) <= 0) {
            Alert.alert('Missing Info', 'Enter a valid quantity.');
            return;
        }
        setWriteOffSubmitting(true);
        const result = await addAdjustment({ productName: writeOffProduct, ...writeOffForm });
        setWriteOffSubmitting(false);
        if (result.success) {
            setWriteOffVisible(false);
        } else {
            Alert.alert('Error', result.error || 'Failed to record write-off.');
        }
    };

    const TABS = [
        { key: 'inventory', label: '📦 Inventory' },
        { key: 'reorder', label: `💡 Reorder${urgentReorderCount > 0 ? ` (${urgentReorderCount})` : ''}` },
        { key: 'writeoffs', label: `📝 Write-Offs${adjustments.length > 0 ? ` (${adjustments.length})` : ''}` },
    ];

    return (
        <View style={[styles.container, { backgroundColor: colors.background }]}>
            <LinearGradient colors={[colors.background, colors.gradientStart]} style={StyleSheet.absoluteFill} />

            <View style={styles.header}>
                <View style={styles.headerTop}>
                    <Text style={[styles.headerTitle, { color: colors.text }]}>Inventory</Text>
                    <TouchableOpacity
                        style={[styles.addBtn, { backgroundColor: colors.primary }]}
                        onPress={() => openRestock('')}
                    >
                        <Ionicons name="add" size={20} color="#FFF" />
                        <Text style={styles.addBtnText}>Restock</Text>
                    </TouchableOpacity>
                </View>

                <View style={[styles.statsCard, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}>
                    <View style={styles.statItem}>
                        <Text style={[styles.statValue, { color: colors.warningLight }]}>{lowStockCount}</Text>
                        <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Low Stock</Text>
                    </View>
                    <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
                    <View style={styles.statItem}>
                        <Text style={[styles.statValue, { color: colors.successLight }]}>₹{totalValue.toLocaleString('en-IN')}</Text>
                        <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Inventory Value</Text>
                    </View>
                </View>

                {/* Tabs */}
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

                {tab === 'inventory' && (
                    <>
                        <View style={[styles.searchBar, { backgroundColor: colors.glass, borderColor: colors.border }]}>
                            <Ionicons name="search" size={18} color={colors.textMuted} />
                            <TextInput
                                style={[styles.searchInput, { color: colors.text }]}
                                placeholder="Search products..."
                                placeholderTextColor={colors.textMuted}
                                value={search}
                                onChangeText={setSearch}
                            />
                        </View>

                        <View style={styles.filterRow}>
                            {[
                                { key: 'all', label: 'All' },
                                { key: 'low', label: 'Low/Out' },
                                { key: 'never', label: 'Never Restocked' },
                            ].map(f => (
                                <TouchableOpacity
                                    key={f.key}
                                    style={[
                                        styles.filterChip,
                                        { backgroundColor: colors.glass, borderColor: colors.border },
                                        filter === f.key && { backgroundColor: colors.primary + '25', borderColor: colors.primary },
                                    ]}
                                    onPress={() => setFilter(f.key)}
                                >
                                    <Text style={[styles.filterChipText, { color: filter === f.key ? colors.primaryLight : colors.textSecondary }]}>
                                        {f.label}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                    </>
                )}
            </View>

            {tab === 'inventory' && (
                <FlatList
                    data={filteredProducts}
                    keyExtractor={p => p.name}
                    contentContainerStyle={styles.listContent}
                    renderItem={({ item }) => <StockRow product={item} colors={colors} onRestock={openRestock} onWriteOff={openWriteOff} />}
                    ListEmptyComponent={
                        <View style={styles.emptyState}>
                            <Ionicons name="cube-outline" size={48} color={colors.textMuted} />
                            <Text style={{ color: colors.textSecondary, marginTop: 12 }}>
                                {loading ? 'Loading...' : 'No products match this filter.'}
                            </Text>
                        </View>
                    }
                />
            )}

            {tab === 'reorder' && (
                <FlatList
                    data={reorderSuggestions}
                    keyExtractor={s => s.name}
                    contentContainerStyle={styles.listContent}
                    renderItem={({ item: s }) => (
                        <View style={[styles.row, { backgroundColor: colors.cardBackground, borderColor: colors.border, flexDirection: 'column', alignItems: 'stretch' }]}>
                            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                <View style={{ flex: 1 }}>
                                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                                        <Text style={[styles.rowName, { color: colors.text }]}>{s.name}</Text>
                                        {!!s.trendPercent && (
                                            <Text style={{ fontSize: 11, fontFamily: 'Poppins_700Bold', color: s.trendPercent > 0 ? '#F59E0B' : '#10B981' }}>
                                                {s.trendPercent > 0 ? '↑' : '↓'} {Math.abs(s.trendPercent)}%
                                            </Text>
                                        )}
                                    </View>
                                    <Text style={[styles.rowMeta, { color: colors.textSecondary }]}>
                                        Remaining: {s.remaining.toFixed(0)} {s.unit} · {s.dailyUsage} {s.unit}/day
                                    </Text>
                                    <Text style={[styles.rowMeta, { color: colors.textSecondary }]}>
                                        {s.daysUntilEmpty > 0 ? `Runs out in ~${s.daysUntilEmpty} days` : 'Already out'}
                                    </Text>
                                </View>
                                <View style={{ alignItems: 'flex-end' }}>
                                    <View style={[styles.badge, { backgroundColor: URGENCY_COLORS[s.urgency] + '22', borderColor: URGENCY_COLORS[s.urgency] + '55' }]}>
                                        <Text style={[styles.badgeText, { color: URGENCY_COLORS[s.urgency] }]}>{URGENCY_LABELS[s.urgency]}</Text>
                                    </View>
                                    <Text style={{ color: colors.primaryLight, fontFamily: 'Poppins_700Bold', fontSize: 15, marginTop: 6 }}>
                                        Order {s.suggestedReorderQty} {s.unit}
                                    </Text>
                                </View>
                            </View>
                            <TouchableOpacity
                                style={[styles.smallRestockBtn, { backgroundColor: colors.primary }]}
                                onPress={() => openRestock(s.name)}
                            >
                                <Text style={{ color: '#FFF', fontFamily: 'Poppins_600SemiBold', fontSize: 13 }}>Restock Now</Text>
                            </TouchableOpacity>
                        </View>
                    )}
                    ListEmptyComponent={
                        <View style={styles.emptyState}>
                            <Ionicons name="bulb-outline" size={48} color={colors.textMuted} />
                            <Text style={{ color: colors.textSecondary, marginTop: 12, textAlign: 'center', paddingHorizontal: 30 }}>
                                No suggestions yet. Record some services to generate usage-based reorder suggestions.
                            </Text>
                        </View>
                    }
                />
            )}

            {tab === 'writeoffs' && (
                <FlatList
                    data={[...adjustments].sort((a, b) => (b.date || '').localeCompare(a.date || ''))}
                    keyExtractor={a => a.$id}
                    contentContainerStyle={styles.listContent}
                    renderItem={({ item: a }) => (
                        <View style={[styles.row, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}>
                            <View style={{ flex: 1 }}>
                                <Text style={[styles.rowName, { color: colors.text }]}>{a.productName}</Text>
                                <Text style={[styles.rowMeta, { color: colors.textSecondary }]}>
                                    {a.reason} · {a.date}{a.notes ? ` · ${a.notes}` : ''}
                                </Text>
                            </View>
                            <Text style={{ color: '#EF4444', fontFamily: 'Poppins_700Bold', fontSize: 16 }}>−{a.quantityRemoved}</Text>
                        </View>
                    )}
                    ListEmptyComponent={
                        <View style={styles.emptyState}>
                            <Ionicons name="document-text-outline" size={48} color={colors.textMuted} />
                            <Text style={{ color: colors.textSecondary, marginTop: 12, textAlign: 'center', paddingHorizontal: 30 }}>
                                No write-offs recorded. Use "Write Off" on a product in Inventory to record wastage.
                            </Text>
                        </View>
                    }
                />
            )}

            {/* Restock Modal */}
            <Modal transparent visible={modalVisible} onRequestClose={() => setModalVisible(false)} animationType="none">
                <View style={styles.modalOverlay}>
                    <TouchableOpacity style={StyleSheet.absoluteFill} onPress={() => setModalVisible(false)} />
                    <Animated.View
                        style={[
                            styles.modalSheet,
                            { transform: [{ translateY: modalSlide }], backgroundColor: colors.cardBackground, borderColor: colors.borderGlow },
                        ]}
                    >
                        <View style={[styles.modalHandle, { backgroundColor: colors.border }]} />
                        <Text style={[styles.modalTitle, { color: colors.text }]}>📦 Restock Product</Text>

                        <View style={styles.inputGroup}>
                            <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Product name</Text>
                            <TextInput
                                style={[styles.input, { backgroundColor: colors.glass, borderColor: colors.border, color: colors.text }]}
                                placeholder="e.g. CLEANSER"
                                placeholderTextColor={colors.textMuted}
                                value={form.productName}
                                onChangeText={t => setForm({ ...form, productName: t })}
                                autoCapitalize="characters"
                            />
                            {products.length > 0 && (
                                <View style={styles.suggestRow}>
                                    {products.slice(0, 6).map(p => (
                                        <TouchableOpacity
                                            key={p.name}
                                            style={[styles.suggestChip, { backgroundColor: colors.glass, borderColor: colors.border }]}
                                            onPress={() => setForm({ ...form, productName: p.name })}
                                        >
                                            <Text style={{ fontSize: 11, color: colors.textSecondary }}>{p.name}</Text>
                                        </TouchableOpacity>
                                    ))}
                                </View>
                            )}
                        </View>

                        <View style={styles.inputGroup}>
                            <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Quantity added</Text>
                            <TextInput
                                style={[styles.input, { backgroundColor: colors.glass, borderColor: colors.border, color: colors.text }]}
                                placeholder="e.g. 500"
                                placeholderTextColor={colors.textMuted}
                                keyboardType="decimal-pad"
                                value={form.quantityAdded}
                                onChangeText={t => setForm({ ...form, quantityAdded: t })}
                            />
                        </View>

                        <View style={styles.inputGroup}>
                            <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Purchase price (₹)</Text>
                            <TextInput
                                style={[styles.input, { backgroundColor: colors.glass, borderColor: colors.border, color: colors.text }]}
                                placeholder="0.00"
                                placeholderTextColor={colors.textMuted}
                                keyboardType="decimal-pad"
                                value={form.purchasePrice}
                                onChangeText={t => setForm({ ...form, purchasePrice: t })}
                            />
                        </View>

                        <View style={styles.modalButtons}>
                            <TouchableOpacity style={[styles.cancelBtn, { backgroundColor: colors.glass, borderColor: colors.border }]} onPress={() => setModalVisible(false)}>
                                <Text style={{ color: colors.text, fontFamily: 'Poppins_600SemiBold' }}>Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.submitBtn, isSubmitting && { opacity: 0.6 }]}
                                onPress={handleSubmit}
                                disabled={isSubmitting}
                            >
                                <LinearGradient colors={colors.purplePinkGradient} style={styles.submitGradient}>
                                    <Text style={styles.submitBtnText}>{isSubmitting ? 'Saving...' : 'Save Restock'}</Text>
                                </LinearGradient>
                            </TouchableOpacity>
                        </View>
                    </Animated.View>
                </View>
            </Modal>

            {/* Write-Off Modal */}
            <Modal transparent visible={writeOffVisible} onRequestClose={() => setWriteOffVisible(false)} animationType="fade">
                <View style={styles.modalOverlay}>
                    <TouchableOpacity style={StyleSheet.absoluteFill} onPress={() => setWriteOffVisible(false)} />
                    <View style={[styles.modalSheet, { backgroundColor: colors.cardBackground, borderColor: colors.borderGlow }]}>
                        <View style={[styles.modalHandle, { backgroundColor: colors.border }]} />
                        <Text style={[styles.modalTitle, { color: colors.text }]}>📝 Write Off Stock</Text>
                        <Text style={{ color: colors.textMuted, fontSize: 13, marginBottom: 16, textAlign: 'center' }}>
                            Record stock lost or wasted for {writeOffProduct}
                        </Text>

                        <View style={styles.inputGroup}>
                            <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Reason</Text>
                            <View style={styles.suggestRow}>
                                {REASONS.map(r => (
                                    <TouchableOpacity
                                        key={r.value}
                                        style={[
                                            styles.filterChip,
                                            { backgroundColor: colors.glass, borderColor: colors.border },
                                            writeOffForm.reason === r.value && { backgroundColor: '#EF444425', borderColor: '#EF4444' },
                                        ]}
                                        onPress={() => setWriteOffForm({ ...writeOffForm, reason: r.value })}
                                    >
                                        <Text style={{ fontSize: 12, color: writeOffForm.reason === r.value ? '#EF4444' : colors.textSecondary }}>{r.label}</Text>
                                    </TouchableOpacity>
                                ))}
                            </View>
                        </View>

                        <View style={styles.inputGroup}>
                            <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Quantity removed</Text>
                            <TextInput
                                style={[styles.input, { backgroundColor: colors.glass, borderColor: colors.border, color: colors.text }]}
                                placeholder="e.g. 50 (ml/g/pcs)"
                                placeholderTextColor={colors.textMuted}
                                keyboardType="decimal-pad"
                                value={writeOffForm.quantityRemoved}
                                onChangeText={t => setWriteOffForm({ ...writeOffForm, quantityRemoved: t })}
                            />
                        </View>

                        <View style={styles.inputGroup}>
                            <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Notes (optional)</Text>
                            <TextInput
                                style={[styles.input, { backgroundColor: colors.glass, borderColor: colors.border, color: colors.text }]}
                                placeholder="e.g. Bottle fell and broke..."
                                placeholderTextColor={colors.textMuted}
                                value={writeOffForm.notes}
                                onChangeText={t => setWriteOffForm({ ...writeOffForm, notes: t })}
                            />
                        </View>

                        <View style={styles.modalButtons}>
                            <TouchableOpacity style={[styles.cancelBtn, { backgroundColor: colors.glass, borderColor: colors.border }]} onPress={() => setWriteOffVisible(false)}>
                                <Text style={{ color: colors.text, fontFamily: 'Poppins_600SemiBold' }}>Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.submitBtn, writeOffSubmitting && { opacity: 0.6 }, { backgroundColor: '#EF4444', borderRadius: 14 }]}
                                onPress={handleWriteOffSubmit}
                                disabled={writeOffSubmitting}
                            >
                                <View style={styles.submitGradient}>
                                    <Text style={styles.submitBtnText}>{writeOffSubmitting ? 'Saving...' : 'Record Write-Off'}</Text>
                                </View>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    header: {
        paddingHorizontal: 20,
        paddingTop: Platform.OS === 'ios' ? 60 : 50,
        paddingBottom: 12,
    },
    headerTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
    headerTitle: { fontSize: 30, fontFamily: 'Poppins_700Bold', letterSpacing: -0.5 },
    addBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 14, paddingVertical: 10, borderRadius: 14 },
    addBtnText: { color: '#FFF', fontFamily: 'Poppins_600SemiBold', fontSize: 13 },
    statsCard: { flexDirection: 'row', borderRadius: 16, padding: 16, borderWidth: 1, marginBottom: 14 },
    statItem: { flex: 1, alignItems: 'center' },
    statDivider: { width: 1 },
    statValue: { fontSize: 20, fontFamily: 'Poppins_700Bold' },
    statLabel: { fontSize: 11, fontFamily: 'Poppins_500Medium', marginTop: 2 },
    tabRow: { flexDirection: 'row', gap: 8, marginBottom: 12 },
    tabChip: { paddingHorizontal: 10, paddingVertical: 8, borderRadius: 12, borderWidth: 1 },
    tabChipText: { fontSize: 11, fontFamily: 'Poppins_600SemiBold' },
    searchBar: { flexDirection: 'row', alignItems: 'center', gap: 8, borderRadius: 12, borderWidth: 1, paddingHorizontal: 12, height: 44, marginBottom: 12 },
    searchInput: { flex: 1, fontFamily: 'Poppins_400Regular', fontSize: 14 },
    filterRow: { flexDirection: 'row', gap: 8 },
    filterChip: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 20, borderWidth: 1 },
    filterChipText: { fontSize: 12, fontFamily: 'Poppins_500Medium' },
    listContent: { paddingHorizontal: 20, paddingBottom: 100 },
    row: { flexDirection: 'row', alignItems: 'center', padding: 14, borderRadius: 16, borderWidth: 1, marginBottom: 10 },
    rowName: { fontSize: 15, fontFamily: 'Poppins_600SemiBold' },
    rowMeta: { fontSize: 12, fontFamily: 'Poppins_400Regular', marginTop: 3 },
    badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8, borderWidth: 1 },
    badgeText: { fontSize: 10, fontFamily: 'Poppins_700Bold' },
    restockLink: { fontSize: 12, fontFamily: 'Poppins_600SemiBold' },
    smallRestockBtn: { marginTop: 10, borderRadius: 10, paddingVertical: 8, alignItems: 'center' },
    emptyState: { alignItems: 'center', paddingVertical: 60 },
    modalOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.5)' },
    modalSheet: { borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 24, paddingBottom: 40, borderWidth: 1 },
    modalHandle: { width: 40, height: 4, borderRadius: 2, alignSelf: 'center', marginBottom: 20 },
    modalTitle: { fontSize: 20, fontFamily: 'Poppins_700Bold', marginBottom: 8, textAlign: 'center' },
    inputGroup: { marginBottom: 18 },
    inputLabel: { fontSize: 13, fontFamily: 'Poppins_500Medium', marginBottom: 8 },
    input: { borderWidth: 1, borderRadius: 12, padding: 14, fontSize: 15, fontFamily: 'Poppins_400Regular' },
    suggestRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 8 },
    suggestChip: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 10, borderWidth: 1 },
    modalButtons: { flexDirection: 'row', gap: 12, marginTop: 8 },
    cancelBtn: { flex: 1, padding: 16, borderRadius: 14, alignItems: 'center', borderWidth: 1 },
    submitBtn: { flex: 1.4, borderRadius: 14, overflow: 'hidden' },
    submitGradient: { padding: 16, alignItems: 'center' },
    submitBtnText: { color: '#FFF', fontFamily: 'Poppins_700Bold', fontSize: 14 },
});
