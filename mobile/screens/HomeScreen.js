import React, { useState, useEffect, useRef, useCallback, memo } from 'react';
import {
    View,
    Text,
    FlatList,
    TouchableOpacity,
    StyleSheet,
    Modal,
    TextInput,
    Alert,
    Keyboard,
    TouchableWithoutFeedback,
    Animated,
    Dimensions,
    Platform,
    ScrollView,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { useExpenses } from '../context/ExpenseContext';
import { useServices } from '../context/ServicesContext';
import { useTheme } from '../context/ThemeContext';
import ThemeToggle from '../components/ThemeToggle';
import ChangePasswordModal from '../components/ChangePasswordModal';
import { useNavigation } from '@react-navigation/native';

const { width, height } = Dimensions.get('window');

// --- Decorative Background Blob ---
const DecorativeBlob = ({ color, size, top, left, right, bottom, opacity }) => (
    <View style={{
        position: 'absolute',
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: color,
        top, left, right, bottom,
        opacity: opacity || 0.1,
        transform: [{ scale: 1.5 }],
        zIndex: 0,
    }} />
);

// --- Components ---

const DashboardCard = ({ title, value, subtitle, icon, gradient, delay, onPress }) => {
    const scale = useRef(new Animated.Value(0.9)).current;
    const opacity = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        Animated.parallel([
            Animated.spring(scale, { toValue: 1, friction: 8, tension: 40, delay, useNativeDriver: true }),
            Animated.timing(opacity, { toValue: 1, duration: 600, delay, useNativeDriver: true }),
        ]).start();
    }, []);

    return (
        <Animated.View style={[styles.dashboardCardContainer, { opacity, transform: [{ scale }] }]}>
            <TouchableOpacity activeOpacity={0.9} onPress={onPress}>
                <LinearGradient
                    colors={gradient}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.dashboardCard}
                >
                    <View style={styles.cardIconCtx}>
                        <Ionicons name={icon} size={24} color="#FFF" />
                    </View>
                    <View>
                        <Text style={styles.cardValue}>{value}</Text>
                        <Text style={styles.cardTitle}>{title}</Text>
                        {subtitle && <Text style={styles.cardSubtitle}>{subtitle}</Text>}
                    </View>
                    <Ionicons name="chevron-forward" size={20} color="rgba(255,255,255,0.5)" style={styles.cardArrow} />
                </LinearGradient>
            </TouchableOpacity>
        </Animated.View>
    );
};

const QuickAction = ({ label, icon, color, onPress, colors }) => (
    <TouchableOpacity
        style={[styles.quickAction, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}
        onPress={onPress}
        activeOpacity={0.7}
    >
        <View style={[styles.actionIcon, { backgroundColor: color + '15' }]}>
            <Ionicons name={icon} size={24} color={color} />
        </View>
        <Text style={[styles.actionLabel, { color: colors.textSecondary }]}>{label}</Text>
    </TouchableOpacity>
);

const TransactionItem = memo(({ expense, colors, formatDate, onDelete }) => (
    <View style={[styles.transactionItem, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}>
        <View style={[styles.transIcon, { backgroundColor: colors.categories[expense.category] + '20' }]}>
            <Ionicons name="wallet-outline" size={20} color={colors.categories[expense.category]} />
        </View>
        <View style={styles.transContent}>
            <Text style={[styles.transName, { color: colors.text }]}>{expense.name}</Text>
            <Text style={[styles.transDate, { color: colors.textMuted }]}>{formatDate(expense.date)}</Text>
        </View>
        <View style={styles.transRight}>
            <Text style={[styles.transAmount, { color: colors.text }]}>-₹{parseFloat(expense.amount).toLocaleString('en-IN')}</Text>
            <TouchableOpacity style={styles.deleteBtn} onPress={() => onDelete(expense.$id)}>
                <Ionicons name="trash-outline" size={18} color={colors.danger} />
            </TouchableOpacity>
        </View>
    </View>
));

export default function HomeScreen() {
    const { logout, user } = useAuth();
    const { expenses, addExpense, deleteExpense, getMonthlyTotal, getTotalExpenses } = useExpenses();
    // Revenue = what was actually charged (totalPrice) — NOT product cost.
    // This used to show getTodayTotalCost/getMonthlyServiceCost here, which
    // displayed the salon's internal product-usage cost as if it were
    // revenue. Fixed to match web's price vs cost distinction.
    const { getTodayRevenue, getMonthlyRevenue } = useServices();
    const { colors } = useTheme();
    const [showChangePassword, setShowChangePassword] = useState(false);
    // Use navigation if available via props or hook, or switch tabs via context if needed. 
    // Since TabBar is custom in App.js, we can't easily nav to 'Services' tab from here without a Nav Context or ref.
    // For now, "Add Service" will just be a visual cue or we can try to expose setActiveTab. 
    // Assuming we stick to "Add Expense" as primary action here.

    const [modalVisible, setModalVisible] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [formData, setFormData] = useState({
        name: '',
        category: 'products',
        amount: '',
        date: new Date().toISOString().split('T')[0],
    });

    // Data
    const todayRevenue = getTodayRevenue();
    const monthlyRevenue = getMonthlyRevenue();
    const monthlyExpense = getMonthlyTotal();
    const netProfit = monthlyRevenue - monthlyExpense;

    // Animations
    const headerTranslateY = useRef(new Animated.Value(-50)).current;

    useEffect(() => {
        Animated.spring(headerTranslateY, { toValue: 0, friction: 8, useNativeDriver: true }).start();
    }, []);

    const handleAddExpense = async () => {
        if (!formData.name || !formData.amount) {
            Alert.alert('Missing Info', 'Please enter expense name and amount');
            return;
        }
        setIsSubmitting(true);
        await addExpense(formData);
        setFormData({
            name: '',
            category: 'products',
            amount: '',
            date: new Date().toISOString().split('T')[0],
        });
        setIsSubmitting(false);
        setModalVisible(false);
    };

    const handleDeleteExpense = (id) => {
        Alert.alert(
            "Delete Expense",
            "Are you sure you want to delete this expense?",
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Delete",
                    style: "destructive",
                    onPress: async () => {
                        await deleteExpense(id);
                    }
                }
            ]
        );
    };

    const formatDate = (dateString) => {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    };

    const categories = [
        { value: 'products', label: 'Products', icon: 'bag-handle' },
        { value: 'equipment', label: 'Equipment', icon: 'construct' },
        { value: 'utilities', label: 'Utilities', icon: 'flash' },
        { value: 'rent', label: 'Rent', icon: 'home' },
        { value: 'salaries', label: 'Salaries', icon: 'people' },
        { value: 'marketing', label: 'Marketing', icon: 'megaphone' },
        { value: 'other', label: 'Other', icon: 'ellipsis-horizontal' },
    ];

    return (
        <View style={[styles.container, { backgroundColor: colors.background }]}>
            {/* Background Decorations */}
            <LinearGradient
                colors={[colors.gradientStart, colors.background]}
                style={StyleSheet.absoluteFill}
            />
            <DecorativeBlob color={colors.primary} size={300} top={-100} left={-100} opacity={0.15} />
            <DecorativeBlob color={colors.secondary} size={250} top={100} right={-80} opacity={0.15} />

            {/* Header */}
            <Animated.View style={[styles.header, { transform: [{ translateY: headerTranslateY }] }]}>
                <View>
                    <Text style={[styles.appTitle, { color: colors.text }]}>Salon Pro</Text>
                    <Text style={[styles.greeting, { color: colors.textSecondary }]}>
                        Hi, {user?.name || 'Owner'}
                    </Text>
                </View>
                <View style={styles.headerRight}>
                    <TouchableOpacity
                        style={[styles.logoutBtn, { backgroundColor: colors.glass, borderColor: colors.border }]}
                        onPress={() => setShowChangePassword(true)}
                    >
                        <Ionicons name="key-outline" size={20} color={colors.textSecondary} />
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.logoutBtn, { backgroundColor: colors.danger + '15', borderColor: colors.danger + '30' }]}
                        onPress={logout}
                    >
                        <Ionicons name="log-out-outline" size={20} color={colors.danger} />
                    </TouchableOpacity>
                    <ThemeToggle />
                </View>
            </Animated.View>

            <ChangePasswordModal visible={showChangePassword} onClose={() => setShowChangePassword(false)} />

            <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

                {/* Main Dashboard Cards */}
                <View style={styles.dashboardGrid}>
                    <DashboardCard
                        title="Today's Revenue"
                        value={`₹${todayRevenue.toLocaleString('en-IN')}`}
                        subtitle="From Services"
                        icon="trending-up"
                        gradient={colors.pinkGradient}
                        delay={0}
                        onPress={() => { }} // Could navigat to services
                    />
                    <DashboardCard
                        title="Month Expenses"
                        value={`₹${monthlyExpense.toLocaleString('en-IN')}`}
                        subtitle={`${expenses.length} Transactions`}
                        icon="trending-down"
                        gradient={colors.heroGradient} // Purple
                        delay={100}
                        onPress={() => { }} // Already on expenses
                    />
                </View>

                {/* Net Profit Banner */}
                <LinearGradient
                    colors={[colors.cardBackground, colors.cardBackground + '80']}
                    style={[styles.profitBanner, { borderColor: colors.border }]}
                >
                    <View style={styles.profitInfo}>
                        <Text style={[styles.profitLabel, { color: colors.textSecondary }]}>Net Profit (This Month)</Text>
                        <Text style={[
                            styles.profitValue,
                            { color: netProfit >= 0 ? colors.successLight : colors.dangerLight }
                        ]}>
                            {netProfit >= 0 ? '+' : ''}₹{Math.abs(netProfit).toLocaleString('en-IN')}
                        </Text>
                    </View>
                    <View style={[styles.profitIcon, { backgroundColor: netProfit >= 0 ? colors.success + '20' : colors.danger + '20' }]}>
                        <Ionicons
                            name={netProfit >= 0 ? "arrow-up-circle" : "arrow-down-circle"}
                            size={32}
                            color={netProfit >= 0 ? colors.successLight : colors.dangerLight}
                        />
                    </View>
                </LinearGradient>

                {/* Quick Actions */}
                <Text style={[styles.sectionTitle, { color: colors.text }]}>Quick Actions</Text>
                <View style={styles.actionRow}>
                    <QuickAction
                        label="Add Expense"
                        icon="add-circle"
                        color={colors.primary}
                        onPress={() => setModalVisible(true)}
                        colors={colors}
                    />
                    <QuickAction
                        label="Add Revenue"
                        icon="cash"
                        color={colors.secondary}
                        onPress={() => Alert.alert("Go to Services", "Please switch to the Services tab to record new revenue.")}
                        colors={colors}
                    />
                    <QuickAction
                        label="View Reports"
                        icon="bar-chart"
                        color={colors.tertiary}
                        onPress={() => Alert.alert("Go to Analysis", "Switch to the Analysis tab for detailed reports.")}
                        colors={colors}
                    />
                </View>

                {/* Recent Transaction List */}
                <View style={styles.recentSection}>
                    <View style={styles.recentHeader}>
                        <Text style={[styles.sectionTitle, { color: colors.text }]}>Recent Expenses</Text>
                        <TouchableOpacity>
                            <Text style={[styles.seeAll, { color: colors.primaryLight }]}>See All</Text>
                        </TouchableOpacity>
                    </View>

                    {expenses.length === 0 ? (
                        <View style={styles.emptyContainer}>
                            <Ionicons name="receipt-outline" size={48} color={colors.textMuted} />
                            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>No recent expenses</Text>
                        </View>
                    ) : (
                        expenses.slice(0, 5).map((item, index) => (
                            <TransactionItem
                                key={item.$id || index}
                                expense={item}
                                colors={colors}
                                formatDate={formatDate}
                                onDelete={handleDeleteExpense}
                            />
                        ))
                    )}
                </View>

            </ScrollView>

            {/* Floating Add Button (Secondary) */}
            <TouchableOpacity
                style={[styles.fab, { shadowColor: colors.primary }]}
                onPress={() => setModalVisible(true)}
            >
                <LinearGradient
                    colors={colors.purplePinkGradient}
                    style={styles.fabGradient}
                >
                    <Ionicons name="add" size={32} color="#FFF" />
                </LinearGradient>
            </TouchableOpacity>

            {/* Add Expense Modal */}
            <Modal transparent visible={modalVisible} onRequestClose={() => setModalVisible(false)} animationType="none">
                <View style={styles.modalOverlay}>
                    <TouchableWithoutFeedback onPress={() => setModalVisible(false)}>
                        <View style={styles.modalBackdrop} />
                    </TouchableWithoutFeedback>
                    <Animated.View
                        style={[
                            styles.modalSheet,
                            {
                                backgroundColor: colors.cardBackground,
                                borderColor: colors.borderGlow
                            }
                        ]}
                    >
                        <View style={[styles.modalHandle, { backgroundColor: colors.border }]} />
                        <Text style={[styles.modalTitle, { color: colors.text }]}>Add Expense</Text>

                        <View style={styles.inputGroup}>
                            <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Name</Text>
                            <TextInput
                                style={[styles.input, { backgroundColor: colors.glass, borderColor: colors.border, color: colors.text }]}
                                placeholder="What did you spend on?"
                                placeholderTextColor={colors.textMuted}
                                value={formData.name}
                                onChangeText={(t) => setFormData({ ...formData, name: t })}
                            />
                        </View>

                        <View style={styles.inputGroup}>
                            <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Amount (₹)</Text>
                            <TextInput
                                style={[styles.input, { backgroundColor: colors.glass, borderColor: colors.border, color: colors.text }]}
                                placeholder="0.00"
                                placeholderTextColor={colors.textMuted}
                                keyboardType="decimal-pad"
                                value={formData.amount}
                                onChangeText={(t) => setFormData({ ...formData, amount: t })}
                            />
                        </View>

                        <View style={styles.inputGroup}>
                            <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Category</Text>
                            <View style={styles.categoryGrid}>
                                {categories.map((cat) => {
                                    const isActive = formData.category === cat.value;
                                    const catColor = colors.categories[cat.value];
                                    return (
                                        <TouchableOpacity
                                            key={cat.value}
                                            style={[
                                                styles.categoryBtn,
                                                { backgroundColor: colors.glass, borderColor: colors.border },
                                                isActive && { backgroundColor: catColor + '15', borderColor: catColor },
                                            ]}
                                            onPress={() => setFormData({ ...formData, category: cat.value })}
                                        >
                                            <Ionicons name={cat.icon} size={18} color={isActive ? catColor : colors.textSecondary} />
                                            <Text style={[styles.categoryLabel, { color: colors.textSecondary }, isActive && { color: catColor }]}>
                                                {cat.label}
                                            </Text>
                                        </TouchableOpacity>
                                    );
                                })}
                            </View>
                        </View>

                        <View style={styles.modalButtons}>
                            <TouchableOpacity
                                style={[styles.cancelBtn, { backgroundColor: colors.glass, borderColor: colors.border }]}
                                onPress={() => setModalVisible(false)}
                            >
                                <Text style={[styles.cancelBtnText, { color: colors.text }]}>Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.submitBtn, { shadowColor: colors.primary }, isSubmitting && { opacity: 0.6 }]}
                                onPress={handleAddExpense}
                                disabled={isSubmitting}
                            >
                                <LinearGradient
                                    colors={colors.purplePinkGradient}
                                    style={styles.submitGradient}
                                    start={{ x: 0, y: 0 }}
                                    end={{ x: 1, y: 0 }}
                                >
                                    <Text style={styles.submitBtnText}>
                                        {isSubmitting ? 'Adding...' : 'Add Expense'}
                                    </Text>
                                    <Ionicons name="arrow-up-circle" size={20} color="#FFF" />
                                </LinearGradient>
                            </TouchableOpacity>
                        </View>
                    </Animated.View>
                </View>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        paddingHorizontal: 24,
        paddingTop: Platform.OS === 'ios' ? 60 : 50,
        paddingBottom: 20,
        zIndex: 10,
    },
    headerRight: {
        alignItems: 'center',
        gap: 12, // Stack vertically
    },
    appTitle: {
        fontSize: 28,
        fontFamily: 'Poppins_700Bold',
        letterSpacing: -0.5,
    },
    greeting: {
        fontSize: 14,
        fontFamily: 'Poppins_500Medium',
        marginLeft: 2
    },
    logoutBtn: {
        width: 44,
        height: 44,
        borderRadius: 22,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
    },
    scrollContent: {
        paddingHorizontal: 24,
        paddingBottom: 120,
    },
    dashboardGrid: {
        flexDirection: 'row',
        gap: 16,
        marginBottom: 20,
    },
    dashboardCardContainer: {
        flex: 1,
        borderRadius: 24,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.3,
        shadowRadius: 20,
        elevation: 10,
    },
    dashboardCard: {
        padding: 20,
        borderRadius: 24,
        height: 160,
        justifyContent: 'space-between',
    },
    cardIconCtx: {
        width: 40,
        height: 40,
        borderRadius: 12,
        backgroundColor: 'rgba(255,255,255,0.2)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    cardValue: {
        fontSize: 22,
        color: '#FFF',
        fontFamily: 'Poppins_700Bold',
        marginBottom: 2,
    },
    cardTitle: {
        fontSize: 12,
        color: 'rgba(255,255,255,0.9)',
        fontFamily: 'Poppins_600SemiBold',
    },
    cardSubtitle: {
        fontSize: 10,
        color: 'rgba(255,255,255,0.7)',
        fontFamily: 'Poppins_400Regular',
    },
    cardArrow: {
        position: 'absolute',
        top: 20,
        right: 20,
    },
    profitBanner: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 20,
        borderRadius: 24,
        borderWidth: 1,
        marginBottom: 32,
    },
    profitLabel: {
        fontSize: 14,
        fontFamily: 'Poppins_500Medium',
        marginBottom: 4,
    },
    profitValue: {
        fontSize: 32,
        fontFamily: 'Poppins_700Bold',
    },
    profitIcon: {
        width: 56,
        height: 56,
        borderRadius: 28,
        alignItems: 'center',
        justifyContent: 'center',
    },
    sectionTitle: {
        fontSize: 18,
        fontFamily: 'Poppins_600SemiBold',
        marginBottom: 16,
    },
    actionRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 32,
    },
    quickAction: {
        flex: 1,
        marginHorizontal: 4,
        alignItems: 'center',
        padding: 16,
        borderRadius: 20,
        borderWidth: 1,
    },
    actionIcon: {
        width: 48,
        height: 48,
        borderRadius: 16,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 8,
    },
    actionLabel: {
        fontSize: 12,
        fontFamily: 'Poppins_500Medium',
    },
    recentSection: {
        marginBottom: 20,
    },
    recentHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
    },
    seeAll: {
        fontSize: 14,
        fontFamily: 'Poppins_600SemiBold',
    },
    transactionItem: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        borderRadius: 20,
        marginBottom: 12,
        borderWidth: 1,
    },
    transIcon: {
        width: 48,
        height: 48,
        borderRadius: 16,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 16,
    },
    transContent: {
        flex: 1,
    },
    transRight: {
        alignItems: 'flex-end',
        gap: 4
    },
    transName: {
        fontSize: 16,
        fontFamily: 'Poppins_600SemiBold',
        marginBottom: 2,
    },
    transDate: {
        fontSize: 12,
        fontFamily: 'Poppins_400Regular',
    },
    transAmount: {
        fontSize: 16,
        fontFamily: 'Poppins_700Bold',
    },
    deleteBtn: {
        padding: 4,
    },
    emptyContainer: {
        alignItems: 'center',
        padding: 40,
        opacity: 0.5,
    },
    emptyText: {
        marginTop: 10,
        fontSize: 14,
        fontFamily: 'Poppins_500Medium',
    },
    fab: {
        position: 'absolute',
        right: 24,
        bottom: 32,
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.5,
        shadowRadius: 16,
        elevation: 12,
    },
    fabGradient: {
        width: 64,
        height: 64,
        borderRadius: 32,
        justifyContent: 'center',
        alignItems: 'center',
    },
    // Modal Styles
    modalOverlay: {
        flex: 1,
        justifyContent: 'flex-end',
        backgroundColor: 'rgba(0,0,0,0.6)',
    },
    modalBackdrop: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'transparent',
    },
    modalSheet: {
        borderTopLeftRadius: 32,
        borderTopRightRadius: 32,
        padding: 24,
        paddingBottom: 40,
        borderWidth: 1,
        shadowOffset: { width: 0, height: -5 },
        shadowOpacity: 0.2,
        shadowRadius: 20,
        elevation: 20,
    },
    modalHandle: {
        width: 40,
        height: 4,
        borderRadius: 2,
        alignSelf: 'center',
        marginBottom: 24,
    },
    modalTitle: {
        fontSize: 24,
        fontFamily: 'Poppins_700Bold',
        marginBottom: 24,
        textAlign: 'center',
    },
    inputGroup: {
        marginBottom: 20,
    },
    inputLabel: {
        fontSize: 14,
        fontFamily: 'Poppins_500Medium',
        marginBottom: 8,
        marginLeft: 4,
    },
    input: {
        borderWidth: 1,
        borderRadius: 16,
        padding: 16,
        fontSize: 16,
        fontFamily: 'Poppins_400Regular',
    },
    categoryGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 10,
    },
    categoryBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 14,
        paddingVertical: 10,
        borderRadius: 12,
        borderWidth: 1,
        gap: 6,
    },
    categoryLabel: {
        fontSize: 13,
        fontFamily: 'Poppins_500Medium',
    },
    modalButtons: {
        flexDirection: 'row',
        gap: 16,
        marginTop: 24,
    },
    cancelBtn: {
        flex: 1,
        padding: 18,
        borderRadius: 16,
        alignItems: 'center',
        borderWidth: 1,
    },
    cancelBtnText: {
        fontFamily: 'Poppins_600SemiBold',
        fontSize: 16,
    },
    submitBtn: {
        flex: 1.5,
        borderRadius: 16,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 12,
        elevation: 8,
    },
    submitGradient: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 18,
        borderRadius: 16,
        gap: 8,
    },
    submitBtnText: {
        color: '#FFF',
        fontFamily: 'Poppins_700Bold',
        fontSize: 16,
    },
});
