import { router } from 'expo-router';
import React from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useCompanyId } from '@/features/auth/auth-context';
import { CopilotScreen } from '@/features/copilot/CopilotScreen';
import { usePageContext } from '@/features/copilot/page-context';
import { useCopilot } from '@/features/copilot/useCopilot';
import { useVoice } from '@/features/copilot/voice/VoiceProvider';

/**
 * The centre AI tab and the landing route for `foodline://ai`. Tap opens this
 * conversation; long-press on the tab toggles inline voice instead. The
 * conversation is a thin client onto the ERP's governed Copilot — it
 * proposes, you review and confirm on a surface the ERP built.
 *
 * Keyed by company: switching company starts a clean conversation rather than
 * carrying one company's answers into another.
 */
export default function CopilotTab() {
  const companyId = useCompanyId();
  return <Conversation key={companyId} companyId={companyId} />;
}

function Conversation({ companyId }: { companyId: string }) {
  const page = usePageContext();
  const voice = useVoice();
  const c = useCopilot(companyId, page);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#F7FAFD' }} edges={['top']}>
      <CopilotScreen
        page={page}
        messages={c.messages}
        pending={c.pending}
        actions={c.actions}
        voiceActive={voice.status !== 'off'}
        onSend={(t) => void c.send(t)}
        onRetry={c.retry}
        onReset={c.reset}
        onOpenRoute={(route) => router.push(route as never)}
        onSubmitQuestionnaire={(id, q, answers) => void c.submitQuestionnaire(id, q, answers)}
        onConfirm={(id, review) => void c.confirm(id, review)}
        onDismiss={c.dismiss}
      />
    </SafeAreaView>
  );
}
