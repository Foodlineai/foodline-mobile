import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { FoodlineAiOrb } from '@/components/foodline-ai-orb';
import { appRouteForHref } from './mappers';
import type { PageContext } from './page-context';
import type { InteractionState } from './useCopilot';
import type {
  ActionReview,
  ActionResult,
  CopilotCard,
  CopilotMessage,
  Interaction,
  Question,
  Questionnaire,
  TurnResult,
} from './types';

const AI = '#4953E4';
const AI_TINT = '#E7E9FD';
const AI_LINE = '#C7CBFA';
const INK = '#0B1020';
const MUTED = '#475776';
const SUBTLE = '#6B7894';
const LINE = '#DDE4F0';

const STARTERS = ['What needs my attention today?', 'Which items are below par?', 'Show open purchase orders'];

export type CopilotScreenProps = {
  page: PageContext;
  messages: CopilotMessage[];
  pending: boolean;
  actions: Record<string, InteractionState>;
  /** Extra bottom space so the composer clears the voice bar while voice is on. */
  voiceActive: boolean;
  onSend: (text: string) => void;
  onRetry: () => void;
  onReset: () => void;
  onOpenRoute: (route: string) => void;
  onSubmitQuestionnaire: (messageId: string, q: Questionnaire, answers: Record<string, string>) => void;
  onConfirm: (messageId: string, review: ActionReview) => void;
  onDismiss: (messageId: string) => void;
};

/**
 * Conversational Foodline AI. It answers, shows the records it found as tappable
 * cards, and for anything that changes data it shows a review the ERP built
 * — the person confirms there; the model never commits. All prompts, tools
 * and policy live on the ERP; this renders what comes back.
 */
export function CopilotScreen(props: CopilotScreenProps) {
  const { page, messages, pending, voiceActive, onSend, onReset } = props;
  const [draft, setDraft] = useState('');
  const scroller = useRef<ScrollView>(null);

  useEffect(() => {
    scroller.current?.scrollToEnd({ animated: true });
  }, [messages.length, pending]);

  const submit = (text: string) => {
    const t = text.trim();
    if (!t || pending) return;
    setDraft('');
    onSend(t);
  };

  const lastAssistantId = [...messages].reverse().find((m) => m.role === 'assistant')?.id;

  return (
    <KeyboardAvoidingView style={styles.screen} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={styles.header}>
        <FoodlineAiOrb size={38} />
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>Foodline AI</Text>
          <Text style={styles.context} numberOfLines={1}>
            Looking at: {page.title}
          </Text>
        </View>
        {messages.length > 0 ? (
          <Pressable accessibilityRole="button" onPress={onReset} hitSlop={8} testID="copilot-new">
            <Text style={styles.link}>New chat</Text>
          </Pressable>
        ) : null}
      </View>

      <ScrollView
        ref={scroller}
        style={{ flex: 1 }}
        contentContainerStyle={styles.thread}
        keyboardShouldPersistTaps="handled"
        testID="copilot-thread"
      >
        {messages.length === 0 ? (
          <View style={styles.empty}>
            <FoodlineAiOrb size={92} />
            <Text style={styles.emptyTitle}>How can Foodline AI help?</Text>
            <Text style={styles.emptyBody}>
              Ask about items, vendors, customers and orders. When something needs to change, I&apos;ll draft it and
              you review it before anything happens.
            </Text>
            <View style={styles.chips}>
              {STARTERS.map((s) => (
                <Chip key={s} label={s} onPress={() => submit(s)} />
              ))}
            </View>
          </View>
        ) : null}

        {messages.map((m) => {
          if (m.role === 'user') return <UserBubble key={m.id} text={m.text} />;
          if (m.role === 'error') return <ErrorBubble key={m.id} text={m.text} onRetry={props.onRetry} />;
          return (
            <AssistantTurn
              key={m.id}
              messageId={m.id}
              text={m.text}
              result={m.result}
              action={props.actions[m.id]}
              showSuggestions={m.id === lastAssistantId && !pending}
              onSuggestion={submit}
              onOpenRoute={props.onOpenRoute}
              onSubmitQuestionnaire={props.onSubmitQuestionnaire}
              onConfirm={props.onConfirm}
              onDismiss={props.onDismiss}
            />
          );
        })}

        {pending ? (
          <View style={styles.working} testID="copilot-working">
            <FoodlineAiOrb size={30} />
            <Text style={styles.workingText}>Foodline AI is working…</Text>
          </View>
        ) : null}
      </ScrollView>

      <View style={[styles.composer, voiceActive && { marginBottom: 74 }]}>
        <TextInput
          value={draft}
          onChangeText={setDraft}
          onSubmitEditing={() => submit(draft)}
          placeholder="Ask Foodline…"
          placeholderTextColor="#96A8CE"
          style={styles.input}
          returnKeyType="send"
          multiline
          testID="copilot-input"
        />
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Send"
          disabled={!draft.trim() || pending}
          onPress={() => submit(draft)}
          style={[styles.send, (!draft.trim() || pending) && styles.sendOff]}
          testID="copilot-send"
        >
          <Text style={styles.sendText}>↑</Text>
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

/* ------------------------------------------------------------- bubbles */

function UserBubble({ text }: { text: string }) {
  return (
    <View style={styles.userRow}>
      <View style={styles.userBubble}>
        <Text style={styles.userText}>{text}</Text>
      </View>
    </View>
  );
}

function ErrorBubble({ text, onRetry }: { text: string; onRetry: () => void }) {
  return (
    <View style={styles.errorBox} accessibilityLiveRegion="polite">
      <Text style={styles.errorText}>{text}</Text>
      <Pressable accessibilityRole="button" onPress={onRetry} hitSlop={8}>
        <Text style={styles.link}>Try again</Text>
      </Pressable>
    </View>
  );
}

function AssistantTurn({
  messageId,
  text,
  result,
  action,
  showSuggestions,
  onSuggestion,
  onOpenRoute,
  onSubmitQuestionnaire,
  onConfirm,
  onDismiss,
}: {
  messageId: string;
  text: string;
  result: TurnResult;
  action: InteractionState | undefined;
  showSuggestions: boolean;
  onSuggestion: (s: string) => void;
  onOpenRoute: (route: string) => void;
  onSubmitQuestionnaire: CopilotScreenProps['onSubmitQuestionnaire'];
  onConfirm: CopilotScreenProps['onConfirm'];
  onDismiss: CopilotScreenProps['onDismiss'];
}) {
  return (
    <View style={styles.assistantRow}>
      <View style={styles.assistantBubble}>
        <View style={styles.assistantIdentity}>
          <FoodlineAiOrb size={22} />
          <Text style={styles.assistantName}>Foodline AI</Text>
        </View>
        <Text style={styles.assistantText}>{text}</Text>
        {result.executedActions ? <Text style={styles.meta}>This reply ran an action.</Text> : null}
        {result.toolNames.length > 0 ? <Text style={styles.meta}>Looked at: {result.toolNames.join(', ')}</Text> : null}
        {result.attachments.length > 0 ? (
          <Text style={styles.meta}>
            Attached on web: {result.attachments.map((a) => a.fileName).join(', ')} — open the ERP to download.
          </Text>
        ) : null}
        {result.notice ? <Text style={styles.notice}>{result.notice}</Text> : null}
      </View>

      {result.cards.map((card) => (
        <CardView key={card.id} card={card} onOpenRoute={onOpenRoute} />
      ))}

      {action ? (
        <InteractionView
          messageId={messageId}
          state={action}
          onSubmitQuestionnaire={onSubmitQuestionnaire}
          onConfirm={onConfirm}
          onDismiss={onDismiss}
        />
      ) : null}

      {showSuggestions && result.suggestions.length > 0 ? (
        <View style={styles.chips}>
          {result.suggestions.map((s) => (
            <Chip key={s} label={s} onPress={() => onSuggestion(s)} />
          ))}
        </View>
      ) : null}
    </View>
  );
}

function Chip({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={styles.chip}>
      <Text style={styles.chipText}>{label}</Text>
    </Pressable>
  );
}

/* --------------------------------------------------------------- cards */

function CardView({ card, onOpenRoute }: { card: CopilotCard; onOpenRoute: (route: string) => void }) {
  if (card.items.length === 0) return null;
  return (
    <View style={styles.card} testID={`card-${card.kind}`}>
      <View style={styles.cardHead}>
        <Text style={styles.cardTitle}>{card.title}</Text>
        {card.subtitle ? <Text style={styles.cardSub}>{card.subtitle}</Text> : null}
      </View>
      {card.items.map((item, i) => {
        // Only links that map to a real mobile screen are tappable; the rest read fine without a dead tap.
        const route = appRouteForHref(item.href);
        const body = (
          <View style={[styles.cardRow, i > 0 && styles.cardRowBorder]}>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={styles.itemLabel} numberOfLines={1}>
                {item.label}
              </Text>
              {item.description ? (
                <Text style={styles.itemDesc} numberOfLines={1}>
                  {item.description}
                </Text>
              ) : null}
              {item.meta ? <Text style={styles.itemMeta}>{item.meta}</Text> : null}
            </View>
            {item.badge ? (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{item.badge}</Text>
              </View>
            ) : null}
            {route ? <Text style={styles.chevron}>›</Text> : null}
          </View>
        );
        return route ? (
          <Pressable key={item.id} accessibilityRole="button" onPress={() => onOpenRoute(route)}>
            {body}
          </Pressable>
        ) : (
          <View key={item.id}>{body}</View>
        );
      })}
    </View>
  );
}

/* --------------------------------------------------------- interactions */

function InteractionView({
  messageId,
  state,
  onSubmitQuestionnaire,
  onConfirm,
  onDismiss,
}: {
  messageId: string;
  state: InteractionState;
  onSubmitQuestionnaire: CopilotScreenProps['onSubmitQuestionnaire'];
  onConfirm: CopilotScreenProps['onConfirm'];
  onDismiss: CopilotScreenProps['onDismiss'];
}) {
  const i: Interaction = state.interaction;
  if (i.kind === 'questionnaire') {
    return (
      <QuestionnaireView
        q={i}
        busy={state.busy}
        error={state.error}
        onSubmit={(answers) => onSubmitQuestionnaire(messageId, i, answers)}
        onCancel={() => onDismiss(messageId)}
      />
    );
  }
  if (i.kind === 'review') {
    return (
      <ReviewView
        review={i}
        busy={state.busy}
        error={state.error}
        onConfirm={() => onConfirm(messageId, i)}
        onCancel={() => onDismiss(messageId)}
      />
    );
  }
  return <ResultView result={i} onDone={() => onDismiss(messageId)} />;
}

function QuestionnaireView({
  q,
  busy,
  error,
  onSubmit,
  onCancel,
}: {
  q: Questionnaire;
  busy: boolean;
  error: string | null;
  onSubmit: (answers: Record<string, string>) => void;
  onCancel: () => void;
}) {
  const [answers, setAnswers] = useState<Record<string, string>>(q.initialAnswers);
  const set = (id: string, v: string) => setAnswers((a) => ({ ...a, [id]: v }));
  const missing = q.questions.some((x) => x.required && !(answers[x.id] ?? '').trim());

  return (
    <View style={styles.panel} testID="copilot-questionnaire">
      <Text style={styles.panelTitle}>{q.title}</Text>
      <Text style={styles.panelBody}>{q.description}</Text>
      {q.questions.map((question) => (
        <QuestionField key={question.id} question={question} answers={answers} onChange={(v) => set(question.id, v)} />
      ))}
      {error ? <Text style={styles.errorText}>{error}</Text> : null}
      <View style={styles.actionsRow}>
        <Pressable accessibilityRole="button" onPress={onCancel} disabled={busy} style={styles.secondary}>
          <Text style={styles.secondaryText}>Cancel</Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          onPress={() => onSubmit(answers)}
          disabled={busy || missing}
          style={[styles.primary, (busy || missing) && styles.primaryOff]}
        >
          {busy ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.primaryText}>{q.reviewLabel}</Text>}
        </Pressable>
      </View>
    </View>
  );
}

function QuestionField({
  question,
  answers,
  onChange,
}: {
  question: Question;
  answers: Record<string, string>;
  onChange: (v: string) => void;
}) {
  const value = answers[question.id] ?? '';
  const options = question.options.filter((o) => !o.availableWhen || answers[o.availableWhen.questionId] === o.availableWhen.value);
  const selected = new Set(value.split(',').filter(Boolean));

  const toggle = (v: string) => {
    if (!question.multiple) return onChange(v);
    const next = new Set(selected);
    if (next.has(v)) next.delete(v);
    else next.add(v);
    onChange([...next].join(','));
  };

  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>
        {question.label}
        {question.required ? ' *' : ''}
      </Text>
      {question.inputMode === 'choice' ? (
        <View style={styles.chips}>
          {options.map((o) => {
            const on = selected.has(o.value);
            return (
              <Pressable
                key={o.value}
                accessibilityRole="button"
                accessibilityState={{ selected: on }}
                onPress={() => toggle(o.value)}
                style={[styles.chip, on && styles.chipOn]}
              >
                <Text style={[styles.chipText, on && styles.chipTextOn]}>{o.label}</Text>
              </Pressable>
            );
          })}
        </View>
      ) : (
        <TextInput
          value={value}
          onChangeText={onChange}
          placeholder={question.placeholder ?? undefined}
          placeholderTextColor="#96A8CE"
          multiline={question.inputMode === 'textarea'}
          keyboardType={
            question.inputMode === 'email'
              ? 'email-address'
              : question.inputMode === 'phone'
                ? 'phone-pad'
                : question.inputMode === 'number' || question.inputMode === 'money'
                  ? 'decimal-pad'
                  : 'default'
          }
          autoCapitalize={question.inputMode === 'email' ? 'none' : 'sentences'}
          style={[styles.fieldInput, question.inputMode === 'textarea' && { minHeight: 70 }]}
        />
      )}
      {question.hint ? <Text style={styles.hint}>{question.hint}</Text> : null}
    </View>
  );
}

function ReviewView({
  review,
  busy,
  error,
  onConfirm,
  onCancel,
}: {
  review: ActionReview;
  busy: boolean;
  error: string | null;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const expired = review.expiresAt ? Date.parse(review.expiresAt) < Date.now() : false;
  return (
    <View style={[styles.panel, styles.panelReview]} testID="copilot-review">
      <Text style={styles.reviewKicker}>Review before anything happens</Text>
      <Text style={styles.panelTitle}>{review.title}</Text>
      <Text style={styles.panelBody}>{review.description}</Text>
      <View style={styles.summary}>
        {review.summary.map((row, idx) => (
          <View key={`${row.label}-${idx}`} style={[styles.summaryRow, idx > 0 && styles.cardRowBorder]}>
            <Text style={styles.summaryLabel}>{row.label}</Text>
            <Text style={styles.summaryValue}>{row.value}</Text>
          </View>
        ))}
      </View>
      {expired ? <Text style={styles.errorText}>This proposal expired. Ask again to get a fresh one.</Text> : null}
      {error ? <Text style={styles.errorText}>{error}</Text> : null}
      <View style={styles.actionsRow}>
        <Pressable accessibilityRole="button" onPress={onCancel} disabled={busy} style={styles.secondary}>
          <Text style={styles.secondaryText}>{review.cancelLabel}</Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          onPress={onConfirm}
          disabled={busy || expired}
          style={[styles.primary, (busy || expired) && styles.primaryOff]}
          testID="copilot-confirm"
        >
          {busy ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.primaryText}>{review.confirmLabel}</Text>}
        </Pressable>
      </View>
    </View>
  );
}

function ResultView({ result, onDone }: { result: ActionResult; onDone: () => void }) {
  const tone = result.tone === 'success' ? '#256D32' : result.tone === 'warning' ? '#A2680E' : '#C62F27';
  const bg = result.tone === 'success' ? '#F1F9EC' : result.tone === 'warning' ? '#FEF4D9' : '#FDF0EF';
  return (
    <View style={[styles.panel, { backgroundColor: bg, borderColor: tone }]} testID="copilot-result">
      <Text style={[styles.panelTitle, { color: tone }]}>{result.title}</Text>
      <Text style={styles.panelBody}>{result.description}</Text>
      {result.details.map((d, idx) => (
        <Text key={`${d.label}-${idx}`} style={styles.panelBody}>
          {d.label}: {d.value}
        </Text>
      ))}
      <Pressable accessibilityRole="button" onPress={onDone} hitSlop={8}>
        <Text style={styles.link}>Done</Text>
      </Pressable>
    </View>
  );
}

/* -------------------------------------------------------------- styles */

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#F7FAFD' },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingTop: 8, paddingBottom: 10, gap: 12 },
  title: { fontSize: 22, fontWeight: '700', color: INK },
  context: { fontSize: 12, color: SUBTLE, marginTop: 2 },
  link: { fontSize: 14, fontWeight: '700', color: AI },

  thread: { paddingHorizontal: 16, paddingBottom: 18, gap: 12, flexGrow: 1 },
  empty: { alignItems: 'flex-start', gap: 8, paddingTop: 24, paddingHorizontal: 4 },
  emptyTitle: { fontSize: 24, fontWeight: '700', color: INK },
  emptyBody: { fontSize: 14, lineHeight: 20, color: MUTED },

  userRow: { alignItems: 'flex-end' },
  userBubble: { maxWidth: '84%', backgroundColor: AI, borderRadius: 18, borderBottomRightRadius: 5, paddingHorizontal: 14, paddingVertical: 10 },
  userText: { color: '#fff', fontSize: 15, lineHeight: 21 },

  assistantRow: { alignItems: 'flex-start', gap: 8, maxWidth: '100%' },
  assistantBubble: {
    maxWidth: '92%',
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: LINE,
    borderRadius: 18,
    borderBottomLeftRadius: 5,
    paddingHorizontal: 14,
    paddingVertical: 11,
    gap: 6,
  },
  assistantText: { color: INK, fontSize: 15, lineHeight: 22 },
  assistantIdentity: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  assistantName: { color: AI, fontSize: 11, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.5 },
  meta: { fontSize: 11, color: SUBTLE },
  notice: { fontSize: 11, color: '#A2680E', fontWeight: '600' },

  working: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 6 },
  workingText: { fontSize: 13, color: SUBTLE },

  errorBox: { backgroundColor: '#FDF0EF', borderWidth: 1, borderColor: '#F3C6C3', borderRadius: 14, padding: 12, gap: 6, alignSelf: 'stretch' },
  errorText: { fontSize: 13, color: '#C62F27', lineHeight: 18 },

  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { borderWidth: 1, borderColor: AI_LINE, backgroundColor: '#fff', borderRadius: 999, paddingHorizontal: 12, paddingVertical: 8 },
  chipOn: { backgroundColor: AI_TINT, borderColor: AI },
  chipText: { fontSize: 13, color: AI, fontWeight: '600' },
  chipTextOn: { color: '#1A40DA' },

  card: { alignSelf: 'stretch', backgroundColor: '#fff', borderWidth: 1, borderColor: LINE, borderRadius: 16, overflow: 'hidden' },
  cardHead: { paddingHorizontal: 14, paddingTop: 12, paddingBottom: 6 },
  cardTitle: { fontSize: 14, fontWeight: '700', color: INK },
  cardSub: { fontSize: 11, color: SUBTLE, marginTop: 2 },
  cardRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 14, paddingVertical: 10 },
  cardRowBorder: { borderTopWidth: 1, borderTopColor: '#EEF3FC' },
  itemLabel: { fontSize: 14, fontWeight: '700', color: INK },
  itemDesc: { fontSize: 12, color: MUTED, marginTop: 1 },
  itemMeta: { fontSize: 12, color: SUBTLE, marginTop: 1 },
  badge: { backgroundColor: AI_TINT, borderRadius: 999, paddingHorizontal: 8, paddingVertical: 3 },
  badgeText: { fontSize: 10, fontWeight: '700', color: '#1A40DA' },
  chevron: { fontSize: 20, color: '#96A8CE' },

  panel: { alignSelf: 'stretch', backgroundColor: '#fff', borderWidth: 1, borderColor: AI_LINE, borderRadius: 16, padding: 14, gap: 8 },
  panelReview: { borderColor: AI, backgroundColor: '#F5F6FF' },
  reviewKicker: { fontSize: 11, fontWeight: '700', color: AI, textTransform: 'uppercase', letterSpacing: 0.6 },
  panelTitle: { fontSize: 16, fontWeight: '700', color: INK },
  panelBody: { fontSize: 13, lineHeight: 19, color: MUTED },
  summary: { backgroundColor: '#fff', borderRadius: 12, borderWidth: 1, borderColor: LINE },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 12, paddingHorizontal: 12, paddingVertical: 9 },
  summaryLabel: { fontSize: 12, color: SUBTLE },
  summaryValue: { fontSize: 13, fontWeight: '600', color: INK, flexShrink: 1, textAlign: 'right' },

  field: { gap: 6 },
  fieldLabel: { fontSize: 12, fontWeight: '700', color: INK },
  fieldInput: { borderWidth: 1, borderColor: LINE, backgroundColor: '#fff', borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, color: INK },
  hint: { fontSize: 11, color: SUBTLE },

  actionsRow: { flexDirection: 'row', gap: 10, justifyContent: 'flex-end', marginTop: 4 },
  primary: { backgroundColor: AI, borderRadius: 12, paddingHorizontal: 16, paddingVertical: 11, minWidth: 110, alignItems: 'center' },
  primaryOff: { opacity: 0.45 },
  primaryText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  secondary: { borderRadius: 12, paddingHorizontal: 14, paddingVertical: 11, borderWidth: 1, borderColor: LINE, backgroundColor: '#fff' },
  secondaryText: { color: MUTED, fontWeight: '700', fontSize: 14 },

  composer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
    paddingHorizontal: 14,
    paddingTop: 8,
    paddingBottom: 10,
    borderTopWidth: 1,
    borderTopColor: LINE,
    backgroundColor: '#F7FAFD',
  },
  input: {
    flex: 1,
    maxHeight: 110,
    minHeight: 44,
    borderWidth: 1,
    borderColor: LINE,
    backgroundColor: '#fff',
    borderRadius: 22,
    paddingHorizontal: 16,
    paddingTop: 11,
    paddingBottom: 11,
    fontSize: 15,
    color: INK,
  },
  send: { height: 44, width: 44, borderRadius: 22, backgroundColor: AI, alignItems: 'center', justifyContent: 'center' },
  sendOff: { opacity: 0.35 },
  sendText: { color: '#fff', fontSize: 20, fontWeight: '700', lineHeight: 22 },
});
