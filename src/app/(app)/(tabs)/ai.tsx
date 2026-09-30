import { Feather } from '@expo/vector-icons';
import React, { useMemo, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppHeader, initialsFrom } from '@/components/app-header';
import { FoodlineAiOrb } from '@/components/foodline-ai-orb';
import { Button, Card, COLORS, Group, ListRow, Screen } from '@/components/ui';
import {
  executeFoodlineAiAction,
  reviewFoodlineAiAction,
  sendFoodlineAiMessage,
  type AiInteraction,
} from '@/features/ai/copilot';
import { useAuth } from '@/features/auth/auth-context';

const STARTERS = [
  { title: 'What needs my attention?', icon: 'alert-circle' as const },
  { title: 'Summarise purchasing', icon: 'shopping-cart' as const },
  { title: 'Prepare my route', icon: 'truck' as const },
];

type ConversationMessage = {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  interaction?: AiInteraction | null;
  suggestions?: string[];
  notice?: string | null;
};

function messageId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export default function FoodlineAI() {
  const { company, companyId } = useAuth();
  const [draft, setDraft] = useState('');
  const [messages, setMessages] = useState<ConversationMessage[]>([]);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function ask(nextQuestion: string) {
    const value = nextQuestion.trim();
    if (!value || pending || !companyId) return;
    const userMessage: ConversationMessage = { id: messageId(), role: 'user', content: value };
    const next = [...messages, userMessage].slice(-12);
    setMessages(next);
    setDraft('');
    setPending(true);
    setError(null);
    try {
      const result = await sendFoodlineAiMessage(
        companyId,
        next.map(({ role, content }) => ({ role, content }))
      );
      setMessages((current) => [
        ...current,
        {
          id: messageId(),
          role: 'assistant',
          content: result.answer,
          interaction: result.interaction,
          suggestions: result.suggestions,
          notice: result.notice,
        },
      ]);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Foodline AI could not complete that request.');
    } finally {
      setPending(false);
    }
  }

  function updateInteraction(messageIdValue: string, interaction: AiInteraction) {
    setMessages((current) =>
      current.map((message) =>
        message.id === messageIdValue ? { ...message, interaction } : message
      )
    );
  }

  return (
    <Screen>
      <SafeAreaView className="flex-1" edges={['top']}>
        <AppHeader context={company?.name ?? 'Foodline'} initials={initialsFrom(company?.name)} />
        <KeyboardAvoidingView
          className="flex-1"
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          keyboardVerticalOffset={88}
        >
          <ScrollView contentContainerClassName="gap-5 px-5 pb-8 pt-4" keyboardShouldPersistTaps="handled">
            <View className="items-center gap-2">
              <FoodlineAiOrb size={144} />
              <Text className="text-3xl font-bold text-ink">Ask Foodline AI</Text>
              <Text className="text-center text-base text-ink-muted">
                Your live copilot across orders, purchasing, inventory, receiving, and delivery.
              </Text>
            </View>

            {messages.length === 0 ? (
              <Group>
                {STARTERS.map((suggestion) => (
                  <ListRow
                    key={suggestion.title}
                    icon={suggestion.icon}
                    title={suggestion.title}
                    onPress={() => void ask(suggestion.title)}
                  />
                ))}
              </Group>
            ) : null}

            {messages.map((message) => (
              <View key={message.id} className={message.role === 'user' ? 'items-end' : 'items-stretch'}>
                <Card
                  className={
                    message.role === 'user'
                      ? 'max-w-[88%] bg-brand p-4'
                      : 'gap-3 border-ai-line bg-ai-tint p-4'
                  }
                >
                  {message.role === 'assistant' ? (
                    <View className="flex-row items-center gap-2">
                      <FoodlineAiOrb size={24} />
                      <Text className="text-xs font-bold uppercase tracking-wide text-ai">Foodline AI</Text>
                    </View>
                  ) : null}
                  <Text
                    className={
                      message.role === 'user' ? 'text-base leading-6 text-white' : 'text-base leading-6 text-ink'
                    }
                  >
                    {message.content}
                  </Text>
                  {message.notice ? <Text className="text-xs text-ink-muted">{message.notice}</Text> : null}
                  {message.interaction && companyId ? (
                    <AiActionCard
                      companyId={companyId}
                      interaction={message.interaction}
                      onChange={(interaction) => updateInteraction(message.id, interaction)}
                    />
                  ) : null}
                  {message.role === 'assistant' && message.suggestions?.length ? (
                    <View className="gap-2">
                      {message.suggestions.map((suggestion) => (
                        <Pressable
                          key={suggestion}
                          accessibilityRole="button"
                          className="min-h-11 justify-center rounded-xl border border-ai-line bg-surface-card px-3 py-2"
                          onPress={() => void ask(suggestion)}
                        >
                          <Text className="font-semibold text-ai">{suggestion}</Text>
                        </Pressable>
                      ))}
                    </View>
                  ) : null}
                </Card>
              </View>
            ))}

            {pending ? (
              <Card className="flex-row items-center gap-3 border-ai-line bg-ai-tint p-4">
                <FoodlineAiOrb size={32} />
                <Text className="text-sm font-semibold text-ai">Foodline AI is working…</Text>
              </Card>
            ) : null}
            {error ? (
              <Card className="gap-2 border-danger-line bg-danger-tint p-4">
                <Text className="font-bold text-danger">Couldn’t complete the request</Text>
                <Text className="text-sm text-ink">{error}</Text>
              </Card>
            ) : null}
          </ScrollView>

          <View className="gap-2 border-t border-surface-line bg-surface-card px-5 pb-5 pt-3">
            <TextInput
              accessibilityLabel="Message Foodline AI"
              className="min-h-12 rounded-2xl border border-surface-line bg-surface px-4 py-3 text-base text-ink"
              placeholder="Ask about today’s operation"
              placeholderTextColor={COLORS.inkFaint}
              value={draft}
              onChangeText={setDraft}
              onSubmitEditing={() => void ask(draft)}
              returnKeyType="send"
            />
            <Button
              label="Ask Foodline AI"
              icon="zap"
              loading={pending}
              disabled={!draft.trim() || !companyId}
              onPress={() => void ask(draft)}
            />
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Screen>
  );
}

function AiActionCard({
  companyId,
  interaction,
  onChange,
}: {
  companyId: string;
  interaction: AiInteraction;
  onChange: (interaction: AiInteraction) => void;
}) {
  const [answers, setAnswers] = useState<Record<string, string>>(
    interaction.kind === 'questionnaire' ? interaction.initialAnswers : {}
  );
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const visibleQuestions = useMemo(
    () =>
      interaction.kind === 'questionnaire'
        ? interaction.questions.filter((question) =>
            question.options.every(
              (option) =>
                !option.availableWhen || answers[option.availableWhen.questionId] === option.availableWhen.value
            ) || question.options.some((option) => !option.availableWhen)
          )
        : [],
    [answers, interaction]
  );

  async function review() {
    if (interaction.kind !== 'questionnaire') return;
    setPending(true);
    setError(null);
    try {
      onChange(await reviewFoodlineAiAction(companyId, { answers, workflow: interaction.workflow }));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not prepare this action.');
    } finally {
      setPending(false);
    }
  }

  async function execute() {
    if (interaction.kind !== 'review') return;
    setPending(true);
    setError(null);
    try {
      onChange(await executeFoodlineAiAction(companyId, interaction.proposalToken));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not complete this action.');
    } finally {
      setPending(false);
    }
  }

  return (
    <View className="gap-3 rounded-2xl border border-ai-line bg-surface-card p-4">
      <View className="flex-row items-center gap-2">
        <Feather name="clipboard" size={18} color={COLORS.ai} />
        <Text className="flex-1 text-base font-bold text-ink">{interaction.title}</Text>
      </View>
      <Text className="text-sm leading-5 text-ink-muted">{interaction.description}</Text>

      {interaction.kind === 'questionnaire'
        ? visibleQuestions.map((question) => {
            const availableOptions = question.options.filter(
              (option) =>
                !option.availableWhen || answers[option.availableWhen.questionId] === option.availableWhen.value
            );
            if (question.inputMode === 'choice')
              return (
                <View key={question.id} className="gap-2">
                  <Text className="font-semibold text-ink">{question.label}</Text>
                  {availableOptions.map((option) => {
                    const selectedValues = question.multiple
                      ? safelyReadSelection(answers[question.id])
                      : [answers[question.id]];
                    const selected = selectedValues.includes(option.value);
                    return (
                      <Pressable
                        key={option.value}
                        accessibilityRole="button"
                        accessibilityState={{ selected }}
                        className={`min-h-12 justify-center rounded-xl border px-3 py-2 ${
                          selected ? 'border-ai bg-ai-tint' : 'border-surface-line bg-surface-card'
                        }`}
                        onPress={() => {
                          if (!question.multiple) {
                            setAnswers((current) => ({ ...current, [question.id]: option.value }));
                            return;
                          }
                          const next = selected
                            ? selectedValues.filter((value) => value !== option.value)
                            : [...selectedValues, option.value];
                          setAnswers((current) => ({
                            ...current,
                            [question.id]: next.length ? JSON.stringify(next) : '',
                          }));
                        }}
                      >
                        <Text className={selected ? 'font-semibold text-ai' : 'font-semibold text-ink'}>
                          {option.label}
                        </Text>
                        {option.description ? (
                          <Text className="text-xs text-ink-muted">{option.description}</Text>
                        ) : null}
                      </Pressable>
                    );
                  })}
                </View>
              );
            return (
              <View key={question.id} className="gap-2">
                <Text className="font-semibold text-ink">{question.label}</Text>
                <TextInput
                  className="min-h-12 rounded-xl border border-surface-line bg-surface px-3 py-2 text-base text-ink"
                  placeholder={question.placeholder ?? undefined}
                  placeholderTextColor={COLORS.inkFaint}
                  value={answers[question.id] ?? ''}
                  multiline={question.inputMode === 'textarea'}
                  keyboardType={question.inputMode === 'email' ? 'email-address' : question.inputMode === 'number' || question.inputMode === 'money' ? 'decimal-pad' : 'default'}
                  onChangeText={(value) => setAnswers((current) => ({ ...current, [question.id]: value }))}
                />
                {question.hint ? <Text className="text-xs text-ink-muted">{question.hint}</Text> : null}
              </View>
            );
          })
        : null}

      {interaction.kind === 'review'
        ? interaction.summary.map((row) => (
            <View key={`${row.label}-${row.value}`} className="flex-row justify-between gap-4">
              <Text className="flex-1 text-sm text-ink-muted">{row.label}</Text>
              <Text className="flex-1 text-right text-sm font-semibold text-ink">{row.value}</Text>
            </View>
          ))
        : null}

      {interaction.kind === 'result'
        ? interaction.details.map((row) => (
            <Text key={`${row.label}-${row.value}`} className="text-sm text-ink">
              {row.label}: {row.value}
            </Text>
          ))
        : null}

      {error ? <Text className="text-sm font-semibold text-danger">{error}</Text> : null}
      {interaction.kind === 'questionnaire' ? (
        <Button
          label={interaction.reviewLabel}
          loading={pending}
          disabled={visibleQuestions.some((question) => question.required && !answers[question.id]?.trim())}
          onPress={() => void review()}
        />
      ) : null}
      {interaction.kind === 'review' ? (
        <Button label={interaction.confirmLabel} loading={pending} onPress={() => void execute()} />
      ) : null}
    </View>
  );
}

function safelyReadSelection(value: string | undefined): string[] {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value) as unknown;
    return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === 'string') : [];
  } catch {
    return [];
  }
}
