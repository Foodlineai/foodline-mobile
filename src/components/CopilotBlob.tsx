import React, { useState } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

import { colors, radius, space, type as typeScale } from '../theme/tokens';
import { requiresSurface, type RecordAction } from '../actions/types';

/**
 * The Copilot blob — a floating AI entry point present on every screen.
 *
 * This answers Chris's dated 31 Aug ask: the AI console inside every module, not
 * only the central hub. On mobile a docked panel would eat a third of a small
 * screen, so it is a blob that expands.
 *
 * Three rules it exists to enforce:
 *
 *  1. **Page-aware.** It receives the screen's context and its suggestions are
 *     about what is on screen. A generic "How can I help?" on every screen is
 *     worse than no Copilot — it teaches people it knows nothing.
 *  2. **It proposes; it does not commit.** Any suggestion whose action is
 *     `review` or `draft` routes to that surface. The blob has no path that
 *     submits. See contracts/actions.md.
 *  3. **It never covers a primary action.** It sits above the tab bar and
 *     below any footer CTA, and it shrinks to a dot while a flow is mid-commit.
 */

export type CopilotSuggestion = {
  id: string;
  label: string;
  /** Carries the execution mode, so the blob can refuse to commit. */
  action: RecordAction;
};

export type CopilotBlobProps = {
  /** What the user is looking at, e.g. "Purchase order PO-2091". */
  contextLabel: string;
  /** One line of what the Copilot noticed here. Null renders no line. */
  observation?: string | null;
  suggestions?: CopilotSuggestion[];
  /** Routes to the action's own surface. The blob never executes. */
  onRunSuggestion: (s: CopilotSuggestion) => void;
  onAsk: (question: string) => void;
  /** True while a flow is committing — the blob shrinks out of the way. */
  muted?: boolean;
  /** Voice is metered per tier; hide the control when there is none left. */
  onStartVoice?: () => void;
};

export function CopilotBlob({
  contextLabel,
  observation,
  suggestions = [],
  onRunSuggestion,
  onAsk,
  muted = false,
  onStartVoice,
}: CopilotBlobProps) {
  const [open, setOpen] = useState(false);
  const [question, setQuestion] = useState('');

  const send = () => {
    const q = question.trim();
    if (!q) return;
    onAsk(q);
    setQuestion('');
    setOpen(false);
  };

  return (
    <>
      <Pressable
        onPress={() => setOpen(true)}
        accessibilityRole="button"
        accessibilityLabel={`Ask AI about ${contextLabel}`}
        style={[styles.blobShell, muted && styles.blobMuted]}
      >
        <LinearGradient
          colors={['#5A63E9', colors.ai.deep]}
          start={{ x: 0.3, y: 0 }}
          end={{ x: 0.7, y: 1 }}
          style={styles.blob}
        >
          <LinearGradient
            colors={['rgba(255,255,255,0.25)', 'rgba(255,255,255,0)']}
            style={styles.blobGloss}
            pointerEvents="none"
          />
          <Text style={styles.blobGlyph}>✦</Text>
        </LinearGradient>
      </Pressable>

      <Modal visible={open} animationType="slide" transparent onRequestClose={() => setOpen(false)}>
        <Pressable style={styles.scrim} onPress={() => setOpen(false)} accessibilityLabel="Close" />

        <View style={styles.sheet}>
          <View style={styles.grabber} />

          <View style={styles.sheetHead}>
            <Text style={styles.eyebrow}>AI Copilot</Text>
            <Text style={styles.context} numberOfLines={1}>
              {contextLabel}
            </Text>
          </View>

          <ScrollView contentContainerStyle={styles.sheetBody} keyboardShouldPersistTaps="handled">
            {observation && (
              <LinearGradient
                colors={[colors.ai.deep, colors.ai.DEFAULT]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0.4 }}
                style={styles.observation}
              >
                <Text style={styles.observationText}>{observation}</Text>
              </LinearGradient>
            )}

            {suggestions.length > 0 && (
              <View style={styles.suggestions}>
                {suggestions.map((s) => {
                  const blocked = s.action.unavailableReason;
                  return (
                    <Pressable
                      key={s.id}
                      disabled={!!blocked}
                      onPress={() => {
                        setOpen(false);
                        onRunSuggestion(s);
                      }}
                      accessibilityRole="button"
                      accessibilityState={{ disabled: !!blocked }}
                      style={[styles.suggestion, blocked && styles.suggestionOff]}
                    >
                      <Text style={styles.suggestionSpark}>✦</Text>
                      <View style={styles.suggestionText}>
                        <Text style={styles.suggestionLabel}>{s.label}</Text>
                        {blocked ? (
                          <Text style={styles.suggestionNote}>{blocked}</Text>
                        ) : requiresSurface(s.action) ? (
                          <Text style={styles.suggestionNote}>Opens for you to check first</Text>
                        ) : null}
                      </View>
                    </Pressable>
                  );
                })}
              </View>
            )}

            <View style={styles.askRow}>
              <TextInput
                value={question}
                onChangeText={setQuestion}
                placeholder="Ask about this screen"
                placeholderTextColor={colors.ink.disabled}
                style={styles.ask}
                accessibilityLabel="Ask the Copilot about this screen"
                returnKeyType="send"
                onSubmitEditing={send}
                autoFocus
              />
              <Pressable
                onPress={send}
                disabled={!question.trim()}
                accessibilityLabel="Send"
                style={[styles.send, !question.trim() && styles.sendOff]}
              >
                <Text style={styles.sendGlyph}>↑</Text>
              </Pressable>
            </View>

            {onStartVoice && (
              <Pressable
                onPress={() => {
                  setOpen(false);
                  onStartVoice();
                }}
                accessibilityRole="button"
                style={styles.voice}
              >
                <Text style={styles.voiceText}>Talk instead</Text>
              </Pressable>
            )}

            <Text style={styles.gate}>
              The Copilot drafts and explains. Anything that moves stock or money opens for you to
              approve first.
            </Text>
          </ScrollView>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  blobShell: {
    position: 'absolute',
    right: 18,
    bottom: 96, // clear of the tab bar
    shadowColor: colors.ai.DEFAULT,
    shadowOpacity: 0.5,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
    elevation: 8,
  },
  blobMuted: { opacity: 0.35, transform: [{ scale: 0.7 }] },
  blob: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
    overflow: 'hidden',
  },
  blobGloss: { position: 'absolute', top: 0, left: 0, right: 0, height: '48%' },
  blobGlyph: { color: '#FFFFFF', fontSize: 22 },

  scrim: { flex: 1, backgroundColor: 'rgba(11,16,32,0.45)' },
  sheet: {
    backgroundColor: colors.surface.card,
    borderTopLeftRadius: radius.sheet,
    borderTopRightRadius: radius.sheet,
    paddingBottom: 28,
    maxHeight: '82%',
  },
  grabber: {
    alignSelf: 'center',
    width: 38,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.hairline.DEFAULT,
    marginTop: 10,
  },
  sheetHead: { paddingHorizontal: space.screen, paddingTop: 14 },
  eyebrow: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 1,
    textTransform: 'uppercase',
    color: colors.ai.DEFAULT,
  },
  context: { ...typeScale.section, color: colors.ink.DEFAULT, marginTop: 3 },

  sheetBody: { padding: space.screen, gap: 12 },

  observation: { padding: 14, borderRadius: radius.card },
  observationText: { ...typeScale.body, color: '#FFFFFF' },

  suggestions: { gap: 8 },
  suggestion: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'flex-start',
    padding: 13,
    borderRadius: radius.card,
    backgroundColor: colors.ai.tint,
    borderWidth: 1,
    borderColor: colors.ai.line,
    minHeight: space.tap,
  },
  suggestionOff: { opacity: 0.5 },
  suggestionSpark: { color: colors.ai.DEFAULT, fontSize: 14, marginTop: 1 },
  suggestionText: { flex: 1 },
  suggestionLabel: { ...typeScale.bodyStrong, color: colors.ink.DEFAULT },
  suggestionNote: { ...typeScale.small, color: colors.ink.muted, marginTop: 2 },

  askRow: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  ask: {
    flex: 1,
    height: space.tap,
    paddingHorizontal: 13,
    borderRadius: radius.input,
    borderWidth: 1,
    borderColor: colors.hairline.DEFAULT,
    backgroundColor: colors.surface.DEFAULT,
    fontSize: 14,
    color: colors.ink.DEFAULT,
  },
  send: {
    width: space.tap,
    height: space.tap,
    borderRadius: radius.pill,
    backgroundColor: colors.ai.DEFAULT,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendOff: { opacity: 0.35 },
  sendGlyph: { color: '#FFFFFF', fontSize: 18, fontWeight: '700' },

  voice: { alignSelf: 'center', paddingVertical: 8 },
  voiceText: { ...typeScale.bodyStrong, color: colors.ai.DEFAULT },

  gate: { ...typeScale.small, color: colors.ink.subtle, textAlign: 'center' },
});
