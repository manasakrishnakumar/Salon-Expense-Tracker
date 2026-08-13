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
import { useServices } from '../context/ServicesContext';
import { SERVICE_CATEGORIES, CATEGORY_LABELS } from '../data/services';
import { useTheme } from '../context/ThemeContext';

const { width, height } = Dimensions.get('window');

// Service Card Component
const ServiceCard = memo(({ service, index, onPress, colors }) => {
    const translateX = useRef(new Animated.Value(50)).current;
    const opacity = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        Animated.parallel([
            Animated.spring(translateX, {
                toValue: 0,
                tension: 50,
                friction: 8,
                delay: index * 50,
                useNativeDriver: true,
            }),
            Animated.timing(opacity, {
                toValue: 1,
                duration: 400,
                delay: index * 50,
                useNativeDriver: true,
            }),
        ]).start();
    }, []);

    const categoryColor = colors.serviceCategories[service.category] || colors.primary;
    const hasCost = service.cost !== null;

    return (
        <Animated.View style={[styles.serviceCard, {
            opacity,
            transform: [{ translateX }],
            backgroundColor: colors.cardBackground,
            borderColor: colors.border
        }]}>
            <TouchableOpacity
                style={styles.serviceCardTouchable}
                onPress={() => onPress(service)}
                activeOpacity={0.7}
            >
                <LinearGradient
                    colors={[colors.cardBackground, colors.cardBackgroundLight]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={StyleSheet.absoluteFill}
                />
                <View style={[styles.categoryIndicator, { backgroundColor: categoryColor, shadowColor: categoryColor }]} />
                <View style={styles.serviceContent}>
                    <Text style={[styles.serviceName, { color: colors.text }]} numberOfLines={2}>{service.name}</Text>
                    <View style={styles.serviceFooter}>
                        {hasCost ? (
                            <Text style={[styles.serviceCost, { color: categoryColor, textShadowColor: categoryColor, textShadowRadius: 10 }]}>
                                ₹{service.cost.toFixed(2)}
                            </Text>
                        ) : (
                            <View style={[styles.tbdBadge, { backgroundColor: colors.warning + '20' }]}>
                                <Text style={[styles.tbdText, { color: colors.warning }]}>Cost TBD</Text>
                            </View>
                        )}
                        {service.products && service.products.length > 0 && (
                            <View style={[styles.productBadge, { backgroundColor: colors.glass }]}>
                                <Ionicons name="cube-outline" size={12} color={colors.textMuted} />
                                <Text style={[styles.productCount, { color: colors.textMuted }]}>{service.products.length}</Text>
                            </View>
                        )}
                    </View>
                </View>
                <View style={styles.actionIcon}>
                    <Ionicons name="add-circle" size={28} color={categoryColor} />
                </View>
            </TouchableOpacity>
        </Animated.View>
    );
});

// Category Tab Component
const CategoryTab = memo(({ category, label, isActive, onPress, count, colors }) => {
    const color = colors.serviceCategories[category] || colors.primary;
    return (
        <TouchableOpacity
            style={[
                styles.categoryTab,
                { backgroundColor: colors.glass, borderColor: colors.border },
                isActive && { borderColor: color, backgroundColor: color + '15' },
            ]}
            onPress={() => onPress(category)}
            activeOpacity={0.7}
        >
            <Text style={[styles.categoryTabText, { color: colors.textSecondary }, isActive && { color: color, fontWeight: '700' }]}>
                {label}
            </Text>
            {count > 0 && (
                <View style={[styles.countBadge, { backgroundColor: colors.glassLight }, isActive && { backgroundColor: color }]}>
                    <Text style={[styles.countText, { color: colors.textSecondary }, isActive && { color: '#FFF' }]}>{count}</Text>
                </View>
            )}
        </TouchableOpacity>
    );
});

// History Item Component
const HistoryItem = memo(({ item, onDelete, colors }) => {
    return (
        <View style={[styles.historyItem, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}>
            <View style={styles.historyContent}>
                <Text style={[styles.historyName, { color: colors.text }]}>{item.serviceName}</Text>
                <Text style={[styles.historyDetails, { color: colors.textSecondary }]}>
                    {new Date(item.Date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} • {item.WorkerName || 'No Worker'}
                </Text>
            </View>
            <View style={styles.historyRight}>
                <Text style={[styles.historyCost, { color: colors.successLight }]}>₹{item.totalCost}</Text>
                <TouchableOpacity onPress={() => onDelete(item.$id)} style={styles.deleteBtn}>
                    <Ionicons name="trash-outline" size={20} color={colors.danger} />
                </TouchableOpacity>
            </View>
        </View>
    );
});

export default function ServicesScreen() {
    const {
        services,
        serviceRecords,
        recordService,
        deleteServiceRecord,
        getServicesByCategory,
        getTodayServiceCount,
        getTodayTotalCost,
    } = useServices();
    const { colors } = useTheme();

    const [activeCategory, setActiveCategory] = useState('ALL');
    const [modalVisible, setModalVisible] = useState(false);
    const [historyVisible, setHistoryVisible] = useState(false);
    const [selectedService, setSelectedService] = useState(null);
    const [workerName, setWorkerName] = useState('');
    const [quantity, setQuantity] = useState(1);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');

    // Animations
    const headerOpacity = useRef(new Animated.Value(0)).current;
    const headerTranslateY = useRef(new Animated.Value(-30)).current;
    const modalSlide = useRef(new Animated.Value(height)).current;
    const historySlide = useRef(new Animated.Value(height)).current;

    useEffect(() => {
        Animated.parallel([
            Animated.timing(headerOpacity, {
                toValue: 1,
                duration: 500,
                useNativeDriver: true,
            }),
            Animated.spring(headerTranslateY, {
                toValue: 0,
                tension: 50,
                friction: 8,
                useNativeDriver: true,
            }),
        ]).start();
    }, []);

    useEffect(() => {
        const toggleModal = (visible, slideAnim) => {
            if (visible) {
                Animated.spring(slideAnim, {
                    toValue: 0,
                    tension: 65,
                    friction: 11,
                    useNativeDriver: true,
                }).start();
            } else {
                Animated.timing(slideAnim, {
                    toValue: height,
                    duration: 300,
                    useNativeDriver: true,
                }).start();
            }
        };

        toggleModal(modalVisible, modalSlide);
        toggleModal(historyVisible, historySlide);
    }, [modalVisible, historyVisible]);

    // Filtering Logic
    const getFilteredServices = () => {
        let result = [];
        if (searchQuery.trim().length > 0) {
            const query = searchQuery.toLowerCase();
            result = services.filter(s =>
                s.name.toLowerCase().includes(query) ||
                (s.category && s.category.includes(query))
            );
        } else {
            if (activeCategory === 'ALL') {
                result = services;
            } else {
                result = getServicesByCategory(activeCategory);
            }
        }
        return result;
    };

    const filteredServices = getFilteredServices();

    const handleServicePress = (service) => {
        setSelectedService(service);
        setQuantity(1);
        setWorkerName('');
        setModalVisible(true);
    };

    const handleRecordService = async () => {
        if (!selectedService) return;

        setIsSubmitting(true);
        const result = await recordService(selectedService.id, workerName, quantity);
        setIsSubmitting(false);

        if (result.success) {
            setModalVisible(false);
            Alert.alert('Success', `${selectedService.name} recorded successfully!`);
        } else {
            Alert.alert('Error', result.error || 'Failed to record service');
        }
    };

    const handleDeleteRecord = (id) => {
        Alert.alert(
            "Delete Record",
            "Are you sure you want to delete this service record?",
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Delete",
                    style: "destructive",
                    onPress: async () => {
                        await deleteServiceRecord(id);
                    }
                }
            ]
        );
    };

    const getCategoryServiceCount = useCallback((category) => {
        return getServicesByCategory(category).length;
    }, []);

    const categories = ['ALL', ...Object.values(SERVICE_CATEGORIES)];

    return (
        <View style={[styles.container, { backgroundColor: colors.background }]}>
            <LinearGradient
                colors={[colors.background, colors.gradientStart]}
                style={StyleSheet.absoluteFill}
            />

            {/* Header */}
            <Animated.View
                style={[
                    styles.header,
                    { opacity: headerOpacity, transform: [{ translateY: headerTranslateY }], backgroundColor: 'transparent' },
                ]}
            >
                <View style={styles.headerTop}>
                    <Text style={[styles.headerTitle, { color: colors.text }]}>Services</Text>
                    <TouchableOpacity
                        style={[styles.historyBtn, { backgroundColor: colors.glass, borderColor: colors.border }]}
                        onPress={() => setHistoryVisible(true)}
                    >
                        <Ionicons name="time-outline" size={24} color={colors.primary} />
                    </TouchableOpacity>
                </View>

                {/* Stats Row */}
                <View style={[styles.statsContainer, { shadowColor: colors.primary }]}>
                    <LinearGradient
                        colors={[colors.cardBackground, colors.cardBackgroundLight]}
                        style={[styles.statsCard]}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                    >
                        <View style={styles.statItem}>
                            <Text style={[styles.statValue, { color: colors.primaryLight }]}>{getTodayServiceCount()}</Text>
                            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Today's count</Text>
                        </View>
                        <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
                        <View style={styles.statItem}>
                            <Text style={[styles.statValue, { color: colors.successLight }]}>
                                ₹{getTodayTotalCost().toLocaleString('en-IN')}
                            </Text>
                            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Today's Revenue</Text>
                        </View>
                    </LinearGradient>
                </View>

                {/* Search Bar */}
                <View style={[styles.searchContainer, { backgroundColor: colors.glass, borderColor: colors.border }]}>
                    <Ionicons name="search" size={20} color={colors.textMuted} style={styles.searchIcon} />
                    <TextInput
                        style={[styles.searchInput, { color: colors.text }]}
                        placeholder="Search services..."
                        placeholderTextColor={colors.textMuted}
                        value={searchQuery}
                        onChangeText={setSearchQuery}
                    />
                    {searchQuery.length > 0 && (
                        <TouchableOpacity onPress={() => setSearchQuery('')}>
                            <Ionicons name="close-circle" size={20} color={colors.textMuted} />
                        </TouchableOpacity>
                    )}
                </View>
            </Animated.View>

            {/* Category Tabs */}
            <View style={styles.tabsContainer}>
                <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.categoryTabs}
                >
                    {categories.map((cat) => {
                        const isAll = cat === 'ALL';
                        const label = isAll ? 'All' : CATEGORY_LABELS[cat];
                        const count = isAll ? services.length : getCategoryServiceCount(cat);

                        return (
                            <CategoryTab
                                key={cat}
                                category={cat}
                                label={label}
                                isActive={activeCategory === cat}
                                onPress={() => {
                                    setActiveCategory(cat);
                                    if (searchQuery.length > 0) setSearchQuery(''); // Clear search on category change
                                }}
                                count={count}
                                colors={colors}
                            />
                        );
                    })}
                </ScrollView>
            </View>

            {/* Services List */}
            <FlatList
                data={filteredServices}
                renderItem={({ item, index }) => (
                    <ServiceCard
                        service={item}
                        index={index}
                        onPress={handleServicePress}
                        colors={colors}
                    />
                )}
                keyExtractor={(item) => item.id}
                contentContainerStyle={styles.listContent}
                showsVerticalScrollIndicator={false}
                ListEmptyComponent={
                    <View style={styles.emptyState}>
                        <LinearGradient
                            colors={[colors.glass, 'transparent']}
                            style={styles.emptyIconContainer}
                        >
                            <Ionicons name={searchQuery ? "search" : "cut-outline"} size={48} color={colors.primary} />
                        </LinearGradient>
                        <Text style={[styles.emptyTitle, { color: colors.text }]}>
                            {searchQuery ? 'No matches found' : 'No Services'}
                        </Text>
                        <Text style={[styles.emptySubtitle, { color: colors.textMuted }]}>
                            {searchQuery ? `Make sure "${searchQuery}" is spelled correctly` : 'Select a different category'}
                        </Text>
                    </View>
                }
            />

            {/* Record Service Modal */}
            <Modal transparent visible={modalVisible} onRequestClose={() => setModalVisible(false)} animationType="none">
                <View style={styles.modalOverlay}>
                    <TouchableWithoutFeedback onPress={() => setModalVisible(false)}>
                        <View style={styles.modalBackdrop} />
                    </TouchableWithoutFeedback>
                    <Animated.View
                        style={[
                            styles.modalSheet,
                            {
                                transform: [{ translateY: modalSlide }],
                                backgroundColor: colors.cardBackground,
                                borderColor: colors.borderGlow
                            }
                        ]}
                    >
                        <View style={[styles.modalHandle, { backgroundColor: colors.border }]} />
                        <Text style={[styles.modalTitle, { color: colors.text }]}>Record Service</Text>

                        {selectedService && (
                            <>
                                <LinearGradient
                                    colors={[colors.glass, colors.glassLight]}
                                    style={[styles.selectedServiceCard, { borderColor: colors.border }]}
                                >
                                    <View style={{ flex: 1 }}>
                                        <Text style={[styles.selectedServiceName, { color: colors.text }]}>
                                            {selectedService.name}
                                        </Text>
                                        <Text style={[styles.selectedCategory, { color: colors.textMuted }]}>
                                            {CATEGORY_LABELS[selectedService.category] || selectedService.category}
                                        </Text>
                                    </View>
                                    <View>
                                        {selectedService.cost !== null ? (
                                            <Text style={[styles.selectedServiceCost, { color: colors.primaryLight }]}>
                                                ₹{selectedService.cost.toFixed(2)}
                                            </Text>
                                        ) : (
                                            <Text style={[styles.selectedServiceTbd, { color: colors.warning }]}>TBD</Text>
                                        )}
                                    </View>
                                </LinearGradient>

                                <View style={styles.inputGroup}>
                                    <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Worker Name (Optional)</Text>
                                    <TextInput
                                        style={[styles.input, { backgroundColor: colors.glass, borderColor: colors.border, color: colors.text }]}
                                        placeholder="Who performed this service?"
                                        placeholderTextColor={colors.textMuted}
                                        value={workerName}
                                        onChangeText={setWorkerName}
                                    />
                                </View>

                                <View style={styles.inputGroup}>
                                    <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Quantity</Text>
                                    <View style={[styles.quantityContainer, { backgroundColor: colors.glass, borderColor: colors.border }]}>
                                        <TouchableOpacity
                                            style={[styles.quantityBtn, { backgroundColor: colors.glassLight, borderColor: colors.border }]}
                                            onPress={() => setQuantity(Math.max(1, quantity - 1))}
                                        >
                                            <Ionicons name="remove" size={24} color={colors.text} />
                                        </TouchableOpacity>
                                        <Text style={[styles.quantityValue, { color: colors.text }]}>{quantity}</Text>
                                        <TouchableOpacity
                                            style={[styles.quantityBtn, { backgroundColor: colors.primary + '30', borderColor: colors.primary }]}
                                            onPress={() => setQuantity(quantity + 1)}
                                        >
                                            <Ionicons name="add" size={24} color={colors.primaryLight} />
                                        </TouchableOpacity>
                                    </View>
                                </View>

                                {selectedService.cost !== null && (
                                    <View style={styles.totalRow}>
                                        <Text style={[styles.totalLabel, { color: colors.textSecondary }]}>Total Cost</Text>
                                        <Text style={[styles.totalValue, { color: colors.successLight }]}>
                                            ₹{(selectedService.cost * quantity).toFixed(2)}
                                        </Text>
                                    </View>
                                )}

                                <View style={styles.modalButtons}>
                                    <TouchableOpacity
                                        style={[styles.cancelBtn, { backgroundColor: colors.glass, borderColor: colors.border }]}
                                        onPress={() => setModalVisible(false)}
                                    >
                                        <Text style={[styles.cancelBtnText, { color: colors.text }]}>Cancel</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity
                                        style={[styles.submitBtn, { shadowColor: colors.primary }, isSubmitting && { opacity: 0.6 }]}
                                        onPress={handleRecordService}
                                        disabled={isSubmitting}
                                    >
                                        <LinearGradient
                                            colors={colors.purplePinkGradient}
                                            start={{ x: 0, y: 0 }}
                                            end={{ x: 1, y: 0 }}
                                            style={styles.submitGradient}
                                        >
                                            <Text style={styles.submitBtnText}>
                                                {isSubmitting ? 'Recording...' : 'Record Service'}
                                            </Text>
                                            <Ionicons name="arrow-forward" size={20} color="#FFF" />
                                        </LinearGradient>
                                    </TouchableOpacity>
                                </View>
                            </>
                        )}
                    </Animated.View>
                </View>
            </Modal>

            {/* History Modal */}
            <Modal transparent visible={historyVisible} onRequestClose={() => setHistoryVisible(false)} animationType="none">
                <View style={styles.modalOverlay}>
                    <TouchableWithoutFeedback onPress={() => setHistoryVisible(false)}>
                        <View style={styles.modalBackdrop} />
                    </TouchableWithoutFeedback>
                    <Animated.View
                        style={[
                            styles.modalSheet,
                            {
                                transform: [{ translateY: historySlide }],
                                backgroundColor: colors.cardBackground,
                                borderColor: colors.borderGlow,
                                height: '80%', // Taller for list
                            }
                        ]}
                    >
                        <View style={[styles.modalHandle, { backgroundColor: colors.border }]} />
                        <Text style={[styles.modalTitle, { color: colors.text }]}>Service History</Text>

                        {serviceRecords.length === 0 ? (
                            <View style={styles.emptyState}>
                                <Text style={{ color: colors.textMuted }}>No recent records found.</Text>
                            </View>
                        ) : (
                            <FlatList
                                data={serviceRecords}
                                keyExtractor={item => item.$id}
                                renderItem={({ item }) => (
                                    <HistoryItem item={item} onDelete={handleDeleteRecord} colors={colors} />
                                )}
                                contentContainerStyle={{ paddingBottom: 40 }}
                                showsVerticalScrollIndicator={false}
                            />
                        )}

                        <TouchableOpacity
                            style={[styles.closeBtn, { backgroundColor: colors.glass, borderColor: colors.border }]}
                            onPress={() => setHistoryVisible(false)}
                        >
                            <Text style={{ color: colors.text, fontFamily: 'Poppins_600SemiBold' }}>Close</Text>
                        </TouchableOpacity>
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
        paddingHorizontal: 20,
        paddingTop: Platform.OS === 'ios' ? 60 : 50,
        paddingBottom: 10,
        zIndex: 10,
    },
    headerTop: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20,
    },
    headerTitle: {
        fontSize: 34,
        fontFamily: 'Poppins_700Bold',
        letterSpacing: -1,
    },
    historyBtn: {
        width: 44,
        height: 44,
        borderRadius: 22,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
    },
    statsContainer: {
        marginBottom: 20,
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.3,
        shadowRadius: 20,
        elevation: 10,
    },
    statsCard: {
        flexDirection: 'row',
        borderRadius: 18,
        padding: 20,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
    },
    statItem: {
        flex: 1,
        alignItems: 'center',
    },
    statDivider: {
        width: 1,
        height: '100%',
    },
    statValue: {
        fontSize: 24,
        fontFamily: 'Poppins_700Bold',
        marginBottom: 4,
    },
    statLabel: {
        fontSize: 12,
        fontFamily: 'Poppins_500Medium',
    },
    searchContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        borderRadius: 12,
        paddingHorizontal: 12,
        height: 50,
        borderWidth: 1,
    },
    searchIcon: {
        marginRight: 10,
    },
    searchInput: {
        flex: 1,
        fontFamily: 'Poppins_400Regular',
        fontSize: 16,
    },
    tabsContainer: {
        paddingBottom: 10,
    },
    categoryTabs: {
        paddingHorizontal: 20,
        paddingVertical: 10,
        gap: 12,
    },
    categoryTab: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 25,
        borderWidth: 1,
    },
    categoryTabText: {
        fontSize: 14,
        fontFamily: 'Poppins_500Medium',
    },
    countBadge: {
        marginLeft: 8,
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 10,
    },
    countText: {
        fontSize: 10,
        fontFamily: 'Poppins_700Bold',
    },
    listContent: {
        paddingHorizontal: 20,
        paddingBottom: 100,
        paddingTop: 10,
    },
    serviceCard: {
        marginBottom: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 5,
        borderRadius: 18, // Added for container
        borderWidth: 1,
    },
    serviceCardTouchable: {
        flexDirection: 'row',
        alignItems: 'center',
        borderRadius: 18,
        overflow: 'hidden',
        minHeight: 100,
    },
    categoryIndicator: {
        width: 6,
        height: '100%',
    },
    serviceContent: {
        flex: 1,
        padding: 16,
    },
    serviceName: {
        fontSize: 16,
        fontFamily: 'Poppins_600SemiBold',
        marginBottom: 8,
    },
    serviceFooter: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    serviceCost: {
        fontSize: 18,
        fontFamily: 'Poppins_700Bold',
    },
    tbdBadge: {
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 6,
    },
    tbdText: {
        fontSize: 12,
        fontFamily: 'Poppins_600SemiBold',
    },
    productBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 6,
        gap: 4,
    },
    productCount: {
        fontSize: 12,
        fontFamily: 'Poppins_500Medium',
    },
    actionIcon: {
        paddingRight: 20,
    },
    emptyState: {
        alignItems: 'center',
        paddingVertical: 60,
    },
    emptyIconContainer: {
        width: 80,
        height: 80,
        borderRadius: 40,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 16,
    },
    emptyTitle: {
        fontSize: 20,
        fontFamily: 'Poppins_600SemiBold',
        marginBottom: 8,
    },
    emptySubtitle: {
        fontSize: 14,
        fontFamily: 'Poppins_400Regular',
        textAlign: 'center',
        maxWidth: '80%',
    },
    modalOverlay: {
        flex: 1,
        justifyContent: 'flex-end',
        backgroundColor: 'rgba(0,0,0,0.5)',
    },
    modalBackdrop: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'transparent', // Handled by overlay
    },
    modalSheet: {
        borderTopLeftRadius: 32,
        borderTopRightRadius: 32,
        padding: 24,
        paddingBottom: 40,
        borderTopWidth: 1,
        shadowOffset: { width: 0, height: -5 },
        shadowOpacity: 0.2,
        shadowRadius: 20,
        elevation: 20,
    },
    modalHandle: {
        width: 40,
        height: 5,
        borderRadius: 2.5,
        alignSelf: 'center',
        marginBottom: 25,
    },
    modalTitle: {
        fontSize: 24,
        fontFamily: 'Poppins_700Bold',
        marginBottom: 20,
        textAlign: 'center',
    },
    selectedServiceCard: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 16,
        borderRadius: 16,
        marginBottom: 24,
        borderWidth: 1,
    },
    selectedServiceName: {
        fontSize: 16,
        fontFamily: 'Poppins_600SemiBold',
        marginBottom: 2,
    },
    selectedCategory: {
        fontSize: 12,
        fontFamily: 'Poppins_500Medium',
        textTransform: 'uppercase',
    },
    selectedServiceCost: {
        fontSize: 20,
        fontFamily: 'Poppins_700Bold',
    },
    selectedServiceTbd: {
        fontSize: 16,
        fontFamily: 'Poppins_600SemiBold',
    },
    inputGroup: {
        marginBottom: 24,
    },
    inputLabel: {
        fontSize: 14,
        fontFamily: 'Poppins_500Medium',
        marginBottom: 10,
        marginLeft: 4,
    },
    input: {
        borderWidth: 1,
        borderRadius: 14,
        padding: 16,
        fontSize: 16,
        fontFamily: 'Poppins_400Regular',
    },
    quantityContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderRadius: 14,
        padding: 8,
        borderWidth: 1,
    },
    quantityBtn: {
        width: 48,
        height: 48,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
    },
    quantityValue: {
        fontSize: 24,
        fontFamily: 'Poppins_700Bold',
    },
    totalRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 30,
        paddingHorizontal: 4,
    },
    totalLabel: {
        fontSize: 16,
        fontFamily: 'Poppins_500Medium',
    },
    totalValue: {
        fontSize: 28,
        fontFamily: 'Poppins_700Bold',
        textShadowColor: 'rgba(52, 211, 153, 0.3)',
        textShadowOffset: { width: 0, height: 4 },
        textShadowRadius: 10,
    },
    modalButtons: {
        flexDirection: 'row',
        gap: 16,
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
    // History Styles
    historyItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 16,
        borderRadius: 16,
        marginBottom: 12,
        borderWidth: 1,
    },
    historyContent: {
        flex: 1,
    },
    historyName: {
        fontSize: 16,
        fontFamily: 'Poppins_600SemiBold',
        marginBottom: 4,
    },
    historyDetails: {
        fontSize: 12,
    },
    historyRight: {
        alignItems: 'flex-end',
        gap: 8,
    },
    historyCost: {
        fontSize: 16,
        fontFamily: 'Poppins_700Bold',
    },
    deleteBtn: {
        padding: 4,
    },
    closeBtn: {
        marginTop: 16,
        padding: 16,
        borderRadius: 16,
        alignItems: 'center',
        borderWidth: 1,
    }
});
