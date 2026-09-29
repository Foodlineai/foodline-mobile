import { Feather } from '@expo/vector-icons';
import React, { useState } from 'react';
import { Image, KeyboardAvoidingView, Platform, ScrollView, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppHeader, initialsFrom } from '@/components/app-header';
import { ARTWORK } from '@/components/artwork';
import { Button, Card, COLORS, Group, ListRow, Screen } from '@/components/ui';
import { useAuth } from '@/features/auth/auth-context';

const SUGGESTIONS = [
  {
    title: 'What needs my attention?',
    icon: 'alert-circle' as const,
    response: 'Today: 2 purchase approvals, 3 delivery exceptions, and 3 inventory items below par.',
  },
  {
    title: 'Summarise purchasing',
    icon: 'shopping-cart' as const,
    response: 'Fresh Valley PO-2084 is due today. Roma tomatoes remain the largest supply risk across 3 orders.',
  },
  {
    title: 'Prepare my route',
    icon: 'truck' as const,
    response: 'Route A-12 has 6 stops remaining. Cedar Grove Catering is next, with a 10:00–10:30 AM window.',
  },
];

export default function NovaAI() {
  const { company } = useAuth();
  const [draft, setDraft] = useState('');
  const [question, setQuestion] = useState<string | null>(null);
  const [answer, setAnswer] = useState<string | null>(null);

  const ask = (nextQuestion: string, response?: string) => {
    const value = nextQuestion.trim();
    if (!value) return;
    setQuestion(value);
    setAnswer(
      response ??
        'I can help you review sales, purchasing, stock, receiving, and routes. Live generative answers will use the ERP agent connection.'
    );
    setDraft('');
  };

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
              <Image source={ARTWORK.nova} accessibilityLabel="Nova AI orb" resizeMode="contain" className="h-36 w-36" />
              <Text className="text-3xl font-bold text-ink">Ask Nova</Text>
              <Text className="text-center text-base text-ink-muted">
                Your Foodline copilot across orders, purchasing, inventory, receiving, and delivery.
              </Text>
            </View>

            <Group>
              {SUGGESTIONS.map((suggestion) => (
                <ListRow
                  key={suggestion.title}
                  icon={suggestion.icon}
                  title={suggestion.title}
                  onPress={() => ask(suggestion.title, suggestion.response)}
                />
              ))}
            </Group>

            {answer ? (
              <Card className="gap-3 border-ai-line bg-ai-tint p-4">
                <View className="flex-row items-center gap-2">
                  <Feather name="zap" size={16} color={COLORS.ai} />
                  <Text className="text-xs font-bold uppercase tracking-wide text-ai">Nova</Text>
                </View>
                {question ? <Text className="text-sm font-bold text-ink">{question}</Text> : null}
                <Text className="text-base leading-6 text-ink">{answer}</Text>
                <Text className="text-xs text-ink-muted">Demo insight based on the app’s current operational data.</Text>
              </Card>
            ) : null}
          </ScrollView>

          <View className="gap-2 border-t border-surface-line bg-surface-card px-5 pb-5 pt-3">
            <TextInput
              className="min-h-12 rounded-2xl border border-surface-line bg-surface px-4 py-3 text-base text-ink"
              placeholder="Ask about today’s operation"
              placeholderTextColor={COLORS.inkFaint}
              value={draft}
              onChangeText={setDraft}
              onSubmitEditing={() => ask(draft)}
              returnKeyType="send"
            />
            <Button label="Ask Nova" icon="zap" disabled={!draft.trim()} onPress={() => ask(draft)} />
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Screen>
  );
}
