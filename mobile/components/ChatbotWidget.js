import React, { useState, useRef, useEffect } from 'react';
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    StyleSheet,
    Modal,
    ScrollView,
    Platform,
    KeyboardAvoidingView,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { apiPost } from '../lib/api';

const SUGGESTIONS = [
    "How much did I make today?",
    "What's my profit this month?",
    "What's low on stock?",
    "Who is my top customer?",
];

const GREETING = "Hi! I'm your salon assistant — ask me things like \"how much did I make today\" or \"what's low on stock\".";

// Owner-only floating assistant, mirroring web's ChatbotWidget. Answers
// come from the same server-side logic/chatbot.js — real data, no
// external AI call. Mounted once in App.js, gated by role there.
export default function ChatbotWidget() {
    const { colors } = useTheme();
    const [open, setOpen] = useState(false);
    const [messages, setMessages] = useState([{ role: 'bot', text: GREETING }]);
    const [input, setInput] = useState('');
    const [sending, setSending] = useState(false);
    const scrollRef = useRef(null);

    useEffect(() => {
        if (open) setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 50);
    }, [messages, open]);

    const send = async (text) => {
        const message = (text ?? input).trim();
        if (!message || sending) return;

        setMessages((prev) => [...prev, { role: 'user', text: message }]);
        setInput('');
        setSending(true);

        try {
            const result = await apiPost('/api/chatbot/query', { message });
            setMessages((prev) => [...prev, { role: 'bot', text: result.answer }]);
        } catch (err) {
            setMessages((prev) => [...prev, { role: 'bot', text: "Sorry, I couldn't reach the server just now." }]);
        } finally {
            setSending(false);
        }
    };

    return (
        <>
            <TouchableOpacity
                style={[styles.fab, { backgroundColor: colors.primary, shadowColor: colors.primary }]}
                onPress={() => setOpen(true)}
                activeOpacity={0.85}
            >
                <Text style={{ fontSize: 24 }}>💬</Text>
            </TouchableOpacity>

            <Modal visible={open} animationType="slide" transparent onRequestClose={() => setOpen(false)}>
                <KeyboardAvoidingView
                    style={styles.overlay}
                    behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                >
                    <TouchableOpacity style={StyleSheet.absoluteFill} onPress={() => setOpen(false)} />
                    <View style={[styles.sheet, { backgroundColor: colors.cardBackground, borderColor: colors.borderGlow }]}>
                        <LinearGradient colors={colors.purplePinkGradient} style={styles.header}>
                            <Text style={styles.headerTitle}>🤖 Salon Assistant</Text>
                            <TouchableOpacity onPress={() => setOpen(false)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                                <Ionicons name="close" size={22} color="#FFF" />
                            </TouchableOpacity>
                        </LinearGradient>

                        <ScrollView ref={scrollRef} style={styles.messages} contentContainerStyle={{ padding: 12, gap: 10 }}>
                            {messages.map((m, i) => (
                                <View
                                    key={i}
                                    style={[
                                        styles.bubble,
                                        m.role === 'user'
                                            ? { alignSelf: 'flex-end', backgroundColor: colors.primary }
                                            : { alignSelf: 'flex-start', backgroundColor: colors.glass, borderWidth: 1, borderColor: colors.border },
                                    ]}
                                >
                                    <Text style={{ color: m.role === 'user' ? '#FFF' : colors.text, fontSize: 13, fontFamily: 'Poppins_400Regular', lineHeight: 18 }}>
                                        {m.text}
                                    </Text>
                                </View>
                            ))}
                            {sending && (
                                <Text style={{ color: colors.textMuted, fontSize: 12, marginLeft: 4 }}>thinking…</Text>
                            )}
                        </ScrollView>

                        {messages.length <= 1 && (
                            <View style={styles.suggestRow}>
                                {SUGGESTIONS.map((s) => (
                                    <TouchableOpacity
                                        key={s}
                                        style={[styles.suggestChip, { backgroundColor: colors.glass, borderColor: colors.border }]}
                                        onPress={() => send(s)}
                                    >
                                        <Text style={{ fontSize: 11, color: colors.textSecondary }}>{s}</Text>
                                    </TouchableOpacity>
                                ))}
                            </View>
                        )}

                        <View style={[styles.inputRow, { borderColor: colors.border }]}>
                            <TextInput
                                style={[styles.input, { backgroundColor: colors.glass, borderColor: colors.border, color: colors.text }]}
                                placeholder="Ask about your salon..."
                                placeholderTextColor={colors.textMuted}
                                value={input}
                                onChangeText={setInput}
                                onSubmitEditing={() => send()}
                                editable={!sending}
                            />
                            <TouchableOpacity
                                style={[styles.sendBtn, { backgroundColor: colors.primary }, (sending || !input.trim()) && { opacity: 0.5 }]}
                                onPress={() => send()}
                                disabled={sending || !input.trim()}
                            >
                                <Ionicons name="arrow-forward" size={18} color="#FFF" />
                            </TouchableOpacity>
                        </View>
                    </View>
                </KeyboardAvoidingView>
            </Modal>
        </>
    );
}

const styles = StyleSheet.create({
    fab: {
        position: 'absolute',
        right: 16,
        bottom: 100,
        width: 52,
        height: 52,
        borderRadius: 26,
        alignItems: 'center',
        justifyContent: 'center',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.4,
        shadowRadius: 12,
        elevation: 8,
    },
    overlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.5)' },
    sheet: { height: '65%', borderTopLeftRadius: 24, borderTopRightRadius: 24, borderWidth: 1, overflow: 'hidden' },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14 },
    headerTitle: { color: '#FFF', fontFamily: 'Poppins_700Bold', fontSize: 15 },
    messages: { flex: 1 },
    bubble: { maxWidth: '85%', paddingHorizontal: 13, paddingVertical: 9, borderRadius: 14 },
    suggestRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, paddingHorizontal: 12, paddingBottom: 10 },
    suggestChip: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 99, borderWidth: 1 },
    inputRow: { flexDirection: 'row', gap: 8, padding: 12, borderTopWidth: 1 },
    input: { flex: 1, borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10, fontSize: 13, fontFamily: 'Poppins_400Regular' },
    sendBtn: { width: 42, height: 42, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
});
