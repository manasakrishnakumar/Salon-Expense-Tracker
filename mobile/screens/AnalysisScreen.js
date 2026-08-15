import React, { useState, useMemo, useRef, useEffect } from 'react';
import {
    View,
    Text,
    ScrollView,
    StyleSheet,
    Dimensions,
    Animated,
    TouchableOpacity,
    Platform,
    FlatList,
    Share,
    Alert,
    ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { BarChart, PieChart, LineChart } from 'react-native-chart-kit';
import { useExpenses } from '../context/ExpenseContext';
import { useServices } from '../context/ServicesContext';
import { useTheme } from '../context/ThemeContext';
import { apiGet, apiGetText } from '../lib/api';

function fmtINR(v) { return '₹' + Number(v || 0).toLocaleString('en-IN'); }

// This-month bounds, matching the default range web's DateRangeSelector
// lands on — good enough for a mobile P&L glance without building a full
// custom date-range picker.
function thisMonthBounds() {
    const now = new Date();
    const first = new Date(now.getFullYear(), now.getMonth(), 1);
    const iso = d => d.toISOString().split('T')[0];
    return { from: iso(first), to: iso(now) };
}

const { width } = Dimensions.get('window');

// Enhanced Color Palette
const CHART_COLORS = [
    '#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', '#9966FF',
    '#FF9F40', '#2ECC71', '#F1C40F', '#E74C3C', '#3498DB',
    '#9B59B6', '#1ABC9C', '#D35400', '#C0392B', '#7F8C8D'
];

export default function AnalysisScreen() {
    const { expenses, getMonthlyTotal: getMonthlyExpense } = useExpenses();
    // "Revenue" here must be totalPrice (what was charged), not totalCost
    // (what the product usage cost the salon) — this screen used to alias
    // getMonthlyServiceCost (cost) as "getMonthlyRevenue", so every number
    // labeled Revenue on this page was silently showing cost instead. Same
    // class of bug fixed on HomeScreen/ServicesScreen — see getMonthlyRevenue
    // in ServicesContext.js for the real revenue calculation.
    const { getMonthlyRevenue, serviceRecords } = useServices();
    const { colors } = useTheme();

    const [activeTab, setActiveTab] = useState('overview'); // overview, revenue, expenses, pnl
    const [pnl, setPnl] = useState(null);
    const [pnlLoading, setPnlLoading] = useState(false);
    const [pnlError, setPnlError] = useState('');
    const [exporting, setExporting] = useState(false);

    const scrollY = useRef(new Animated.Value(0)).current;

    // Load P&L only once the tab is opened, for this month.
    useEffect(() => {
        if (activeTab !== 'pnl') return;
        const { from, to } = thisMonthBounds();
        setPnlLoading(true);
        setPnlError('');
        apiGet(`/api/reports/profit-loss?from=${from}&to=${to}`)
            .then(setPnl)
            .catch(err => setPnlError(err.message || 'Failed to load P&L'))
            .finally(() => setPnlLoading(false));
    }, [activeTab]);

    const handleExportCsv = async () => {
        const { from, to } = thisMonthBounds();
        setExporting(true);
        try {
            const csv = await apiGetText(`/api/reports/export?from=${from}&to=${to}`);
            // Mobile has no browser-style "click to download" — hand the CSV
            // text to the native Share sheet so the user can save/send it
            // (Files app, email, WhatsApp, etc.) however they prefer.
            await Share.share({
                title: `salon-report-${from}-to-${to}.csv`,
                message: csv,
            });
        } catch (err) {
            Alert.alert('Export Failed', err.message || 'Could not export CSV.');
        } finally {
            setExporting(false);
        }
    };

    // --- Data Processing ---

    // 1. Overview: Financial Health
    const currentMonthRevenue = getMonthlyRevenue();
    const currentMonthExpense = getMonthlyExpense();
    const netProfit = currentMonthRevenue - currentMonthExpense;
    const profitMargin = currentMonthRevenue > 0 ? (netProfit / currentMonthRevenue) * 100 : 0;

    // 2. Revenue by Category (Pie Chart)
    const revenueByCategory = useMemo(() => {
        const data = {};
        serviceRecords.forEach(rec => {
            const cat = rec.category || 'Other';
            data[cat] = (data[cat] || 0) + (rec.totalPrice || 0);
        });

        return Object.entries(data)
            .map(([name, total], index) => ({
                name: name.charAt(0).toUpperCase() + name.slice(1),
                population: total,
                color: CHART_COLORS[index % CHART_COLORS.length],
                legendFontColor: colors.textSecondary,
                legendFontSize: 11
            }))
            .sort((a, b) => b.population - a.population);
    }, [serviceRecords, colors]);

    // 3. Expenses by Category (Bar Chart)
    const expensesByCategory = useMemo(() => {
        const data = {};
        expenses.forEach(exp => {
            const cat = exp.category || 'Other';
            data[cat] = (data[cat] || 0) + parseFloat(exp.amount);
        });

        // Convert to array and assign colors
        return Object.entries(data)
            .map(([label, value], index) => ({
                label: label.charAt(0).toUpperCase() + label.slice(1),
                value,
                color: CHART_COLORS[(index + 5) % CHART_COLORS.length] // Offset colors
            }))
            .sort((a, b) => b.value - a.value);
    }, [expenses]);

    // 4. Last 7 Days Trend (Line Chart - Revenue vs Expenses)
    const weeklyTrend = useMemo(() => {
        const last7Days = [...Array(7)].map((_, i) => {
            const d = new Date();
            d.setDate(d.getDate() - (6 - i));
            return d.toISOString().split('T')[0];
        });

        const revData = last7Days.map(date =>
            serviceRecords
                .filter(r => r.Date && r.Date.startsWith(date))
                .reduce((sum, r) => sum + (r.totalPrice || 0), 0)
        );

        const expData = last7Days.map(date =>
            expenses
                .filter(e => e.date && e.date.startsWith(date))
                .reduce((sum, e) => sum + parseFloat(e.amount || 0), 0)
        );

        return {
            labels: last7Days.map(d => {
                const date = new Date(d);
                return `${date.getDate()}/${date.getMonth() + 1}`;
            }),
            datasets: [
                {
                    data: revData,
                    color: (opacity = 1) => `rgba(16, 185, 129, ${opacity})`, // Green for Revenue
                    strokeWidth: 2
                },
                {
                    data: expData,
                    color: (opacity = 1) => `rgba(239, 68, 68, ${opacity})`, // Red for Expense
                    strokeWidth: 2
                }
            ],
            legend: ["Revenue", "Expense"] // Optional
        };
    }, [serviceRecords, expenses]);


    const chartConfig = {
        backgroundGradientFrom: "#1E2923",
        backgroundGradientFromOpacity: 0,
        backgroundGradientTo: "#08130D",
        backgroundGradientToOpacity: 0,
        color: (opacity = 1) => colors.text, // Default line color
        labelColor: (opacity = 1) => colors.textSecondary,
        strokeWidth: 2,
        barPercentage: 0.7,
        useShadowColorFromDataset: false,
        decimalPlaces: 0,
    };

    // --- Render Components ---

    const renderHeader = () => (
        <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Quick Summary (This Month)</Text>
            <View style={[styles.card, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}>
                <View style={styles.summaryRow}>
                    <View style={styles.summaryItem}>
                        <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>Revenue</Text>
                        <Text style={[styles.summaryValue, { color: colors.successLight }]}>₹{currentMonthRevenue.toLocaleString()}</Text>
                    </View>
                    <View style={[styles.divider, { backgroundColor: colors.border }]} />
                    <View style={styles.summaryItem}>
                        <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>Expenses</Text>
                        <Text style={[styles.summaryValue, { color: colors.dangerLight }]}>₹{currentMonthExpense.toLocaleString()}</Text>
                    </View>
                    <View style={[styles.divider, { backgroundColor: colors.border }]} />
                    <View style={styles.summaryItem}>
                        <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>Net Profit</Text>
                        <Text style={[styles.summaryValue, { color: netProfit >= 0 ? colors.primaryLight : colors.danger }]}>
                            {netProfit >= 0 ? '+' : ''}₹{Math.abs(netProfit).toLocaleString()}
                        </Text>
                    </View>
                </View>
            </View>
        </View>
    );

    const renderRevenueAnalysis = () => (
        <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Revenue Sources</Text>
            {revenueByCategory.length > 0 ? (
                <View style={[styles.card, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}>
                    <PieChart
                        data={revenueByCategory}
                        width={width - 50}
                        height={220}
                        chartConfig={chartConfig}
                        accessor={"population"}
                        backgroundColor={"transparent"}
                        paddingLeft={"15"}
                        center={[10, 0]}
                        absolute
                        hasLegend={false} // Custom Legend below
                    />

                    {/* Custom Legend / Breakdown List */}
                    <View style={styles.breakdownContainer}>
                        {revenueByCategory.map((item, index) => (
                            <View key={index} style={[styles.breakdownRow, { borderBottomColor: colors.border }]}>
                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                                    <View style={{ width: 12, height: 12, borderRadius: 6, backgroundColor: item.color }} />
                                    <Text style={{ color: colors.text, fontSize: 13, fontFamily: 'Poppins_500Medium' }}>{item.name}</Text>
                                </View>
                                <Text style={{ color: colors.textSecondary, fontWeight: '700' }}>₹{item.population.toLocaleString()}</Text>
                            </View>
                        ))}
                    </View>
                </View>
            ) : (
                <Text style={{ color: colors.textMuted, textAlign: 'center', marginVertical: 20 }}>No revenue recorded yet.</Text>
            )}
        </View>
    );

    const renderExpenseAnalysis = () => (
        <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Expense Breakdown</Text>
            {expensesByCategory.length > 0 ? (
                <View style={[styles.card, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                        <BarChart
                            data={{
                                labels: expensesByCategory.map(i => i.label),
                                datasets: [{ data: expensesByCategory.map(i => i.value) }]
                            }}
                            width={Math.max(width - 60, expensesByCategory.length * 80)}
                            height={250}
                            yAxisLabel="₹"
                            chartConfig={{
                                ...chartConfig,
                                color: (opacity = 1) => colors.primary,
                                fillShadowGradient: colors.primary,
                                fillShadowGradientOpacity: 0.6,
                            }}
                            verticalLabelRotation={30}
                            showValuesOnTopOfBars
                            fromZero
                            style={{ borderRadius: 16 }}
                        />
                    </ScrollView>

                    {/* Breakdown List */}
                    <View style={styles.breakdownContainer}>
                        {expensesByCategory.map((item, index) => (
                            <View key={index} style={[styles.breakdownRow, { borderBottomColor: colors.border }]}>
                                <Text style={{ color: colors.text, fontSize: 13, fontFamily: 'Poppins_500Medium' }}>{item.label}</Text>
                                <Text style={{ color: colors.dangerLight, fontWeight: '700' }}>-₹{item.value.toLocaleString()}</Text>
                            </View>
                        ))}
                    </View>
                </View>
            ) : (
                <Text style={{ color: colors.textMuted, textAlign: 'center', marginVertical: 20 }}>No expenses recorded yet.</Text>
            )}
        </View>
    );

    const renderTrendAnalysis = () => (
        <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Last 7 Days Trend</Text>
            <View style={[styles.card, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}>
                <LineChart
                    data={weeklyTrend}
                    width={width - 50}
                    height={220}
                    chartConfig={{
                        ...chartConfig,
                        propsForDots: { r: "4", strokeWidth: "2", stroke: colors.cardBackground },
                    }}
                    bezier
                    style={{ borderRadius: 16 }}
                />
                <View style={styles.legendContainer}>
                    <View style={styles.legendItem}>
                        <View style={[styles.legendDot, { backgroundColor: 'rgba(16, 185, 129, 1)' }]} />
                        <Text style={[styles.legendText, { color: colors.textSecondary }]}>Revenue</Text>
                    </View>
                    <View style={styles.legendItem}>
                        <View style={[styles.legendDot, { backgroundColor: 'rgba(239, 68, 68, 1)' }]} />
                        <Text style={[styles.legendText, { color: colors.textSecondary }]}>Expense</Text>
                    </View>
                </View>
            </View>
        </View>
    );

    const renderPnL = () => (
        <View style={styles.section}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <Text style={[styles.sectionTitle, { color: colors.text, marginBottom: 0, marginLeft: 0 }]}>Profit & Loss (This Month)</Text>
                <TouchableOpacity
                    style={[styles.exportBtn, { backgroundColor: colors.primary }, exporting && { opacity: 0.6 }]}
                    onPress={handleExportCsv}
                    disabled={exporting}
                >
                    <Ionicons name="share-outline" size={14} color="#FFF" />
                    <Text style={styles.exportBtnText}>{exporting ? 'Exporting...' : 'Export CSV'}</Text>
                </TouchableOpacity>
            </View>

            {pnlLoading ? (
                <ActivityIndicator color={colors.primary} style={{ marginVertical: 30 }} />
            ) : pnlError ? (
                <Text style={{ color: colors.dangerLight, textAlign: 'center', marginVertical: 20 }}>{pnlError}</Text>
            ) : pnl ? (
                <>
                    <View style={[styles.card, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}>
                        <View style={styles.plRow}><Text style={[styles.plLabel, { color: colors.textSecondary }]}>Revenue</Text><Text style={[styles.plValue, { color: colors.successLight }]}>{fmtINR(pnl.revenue)}</Text></View>
                        <View style={styles.plRow}><Text style={[styles.plLabel, { color: colors.textSecondary }]}>Stock Cost</Text><Text style={[styles.plValue, { color: colors.dangerLight }]}>-{fmtINR(pnl.stockCost)}</Text></View>
                        <View style={styles.plRow}><Text style={[styles.plLabel, { color: colors.textSecondary }]}>Gross Profit</Text><Text style={[styles.plValue, { color: colors.text }]}>{fmtINR(pnl.grossProfit)}</Text></View>
                        <View style={styles.plRow}><Text style={[styles.plLabel, { color: colors.textSecondary }]}>Other Expenses</Text><Text style={[styles.plValue, { color: colors.dangerLight }]}>-{fmtINR(pnl.otherExpenses)}</Text></View>
                        <View style={styles.plRow}><Text style={[styles.plLabel, { color: colors.textSecondary }]}>Tips</Text><Text style={[styles.plValue, { color: '#EC4899' }]}>+{fmtINR(pnl.tips)}</Text></View>
                        <View style={[styles.plRow, { borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 10, marginTop: 4 }]}>
                            <Text style={[styles.plLabel, { color: colors.text, fontFamily: 'Poppins_700Bold' }]}>Net Profit</Text>
                            <Text style={[styles.plValue, { color: pnl.netProfit >= 0 ? colors.successLight : colors.dangerLight, fontSize: 18 }]}>
                                {pnl.netProfit >= 0 ? '+' : ''}{fmtINR(pnl.netProfit)}
                            </Text>
                        </View>
                    </View>

                    {pnl.workerPerformance?.length > 0 && (
                        <View style={{ marginTop: 20 }}>
                            <Text style={[styles.sectionTitle, { color: colors.text }]}>Worker Performance</Text>
                            <View style={[styles.card, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}>
                                {pnl.workerPerformance.map((w, i) => (
                                    <View key={i} style={[styles.breakdownRow, { borderBottomColor: colors.border }]}>
                                        <Text style={{ color: colors.text, fontSize: 13, fontFamily: 'Poppins_500Medium' }}>{w.name}</Text>
                                        <Text style={{ color: colors.successLight, fontWeight: '700' }}>{fmtINR(w.revenue)} · {w.services} svc</Text>
                                    </View>
                                ))}
                            </View>
                        </View>
                    )}
                </>
            ) : null}
        </View>
    );

    return (
        <View style={[styles.container, { backgroundColor: colors.background }]}>
            <LinearGradient
                colors={[colors.background, colors.gradientStart]}
                style={StyleSheet.absoluteFill}
            />

            {/* Header */}
            <View style={[styles.header, { borderColor: colors.border }]}>
                <Text style={[styles.headerTitle, { color: colors.text }]}>Insights</Text>
            </View>

            <ScrollView
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
            >
                {/* Tabs */}
                <View style={[styles.tabContainer, { backgroundColor: colors.glass, borderColor: colors.border }]}>
                    {['overview', 'revenue', 'expenses', 'pnl'].map((tab) => (
                        <TouchableOpacity
                            key={tab}
                            style={[styles.tab, activeTab === tab && { backgroundColor: colors.primary }]}
                            onPress={() => setActiveTab(tab)}
                        >
                            <Text style={[styles.tabText, { color: colors.textSecondary }, activeTab === tab && styles.activeTabText]}>
                                {tab === 'pnl' ? 'P&L' : tab.charAt(0).toUpperCase() + tab.slice(1)}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </View>

                {activeTab === 'overview' && (
                    <>
                        {renderHeader()}
                        {renderTrendAnalysis()}
                        {renderRevenueAnalysis()}
                        {renderExpenseAnalysis()}
                    </>
                )}

                {activeTab === 'revenue' && (
                    <>
                        {renderRevenueAnalysis()}
                        {renderTrendAnalysis()}
                    </>
                )}

                {activeTab === 'expenses' && (
                    <>
                        {renderExpenseAnalysis()}
                        {renderTrendAnalysis()}
                    </>
                )}

                {activeTab === 'pnl' && renderPnL()}

            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    header: {
        paddingTop: Platform.OS === 'ios' ? 60 : 50,
        paddingBottom: 16,
        paddingHorizontal: 20,
        borderBottomWidth: 1,
        backgroundColor: 'rgba(0,0,0,0.2)', // Slight tint
    },
    headerTitle: {
        fontSize: 28,
        fontFamily: 'Poppins_700Bold',
        letterSpacing: -1,
    },
    scrollContent: {
        padding: 20,
        paddingBottom: 100,
    },
    tabContainer: {
        flexDirection: 'row',
        borderRadius: 16,
        padding: 4,
        marginBottom: 24,
        borderWidth: 1,
    },
    tab: {
        flex: 1,
        paddingVertical: 10,
        alignItems: 'center',
        borderRadius: 12,
    },
    tabText: {
        fontSize: 14,
        fontFamily: 'Poppins_500Medium',
    },
    activeTabText: {
        color: '#FFF',
        fontFamily: 'Poppins_600SemiBold',
    },
    section: {
        marginBottom: 28,
    },
    sectionTitle: {
        fontSize: 18,
        fontFamily: 'Poppins_600SemiBold',
        marginBottom: 12,
        marginLeft: 4,
    },
    card: {
        borderRadius: 24,
        padding: 20,
        borderWidth: 1,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 10,
        elevation: 6,
        backgroundColor: 'rgba(255,255,255,0.05)',
    },
    summaryRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    summaryItem: {
        flex: 1,
        alignItems: 'center',
    },
    divider: {
        width: 1,
        height: 40,
        opacity: 0.5,
    },
    summaryLabel: {
        fontSize: 12,
        fontFamily: 'Poppins_500Medium',
        marginBottom: 4,
    },
    summaryValue: {
        fontSize: 16,
        fontFamily: 'Poppins_700Bold',
    },
    breakdownContainer: {
        marginTop: 20,
        paddingTop: 10,
        borderTopWidth: 1,
        borderTopColor: 'rgba(255,255,255,0.1)',
    },
    breakdownRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingVertical: 12,
        borderBottomWidth: 1,
    },
    legendContainer: {
        flexDirection: 'row',
        justifyContent: 'center',
        marginTop: 16,
        gap: 20,
    },
    legendItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    legendDot: {
        width: 10,
        height: 10,
        borderRadius: 5,
    },
    legendText: {
        fontSize: 12,
        fontFamily: 'Poppins_500Medium',
    },
    exportBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 10,
    },
    exportBtnText: {
        color: '#FFF',
        fontSize: 12,
        fontFamily: 'Poppins_600SemiBold',
    },
    plRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 8,
    },
    plLabel: {
        fontSize: 13,
        fontFamily: 'Poppins_500Medium',
    },
    plValue: {
        fontSize: 15,
        fontFamily: 'Poppins_700Bold',
    },
});
