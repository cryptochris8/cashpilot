"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Progress } from "@/components/ui/progress";
import { Loader2 } from "lucide-react";
import { getOnboardingStatus, markOnboardingComplete, type OnboardingStatus } from "@/app/actions/onboarding";
import { WelcomeStep, ConnectQboStep, ReviewInvoicesStep, SetupCadenceStep, TestReminderStep, CompletionStep } from "@/components/onboarding/onboarding-steps";

const STEP_LABELS = ["Welcome", "Connect QBO", "Review Invoices", "Set Up Cadence", "Test Reminder", "Complete"];

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [status, setStatus] = useState<OnboardingStatus | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchStatus = useCallback(async () => {
    const result = await getOnboardingStatus();
    if ("data" in result) { setStatus(result.data); }
    setLoading(false);
  }, []);

  useEffect(() => { fetchStatus(); }, [fetchStatus]);

  const nextStep = () => setStep((s) => Math.min(s + 1, STEP_LABELS.length - 1));
  const skipStep = () => nextStep();

  const handleComplete = async () => {
    await markOnboardingComplete();
    router.push("/");
  };

  if (loading) {
    return (<div className="flex h-[400px] items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>);
  }

  const progressPct = ((step + 1) / STEP_LABELS.length) * 100;

  return (
    <div className="mx-auto max-w-2xl space-y-8 py-8">
      <div className="space-y-2">
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>Step {step + 1} of {STEP_LABELS.length}</span>
          <span>{STEP_LABELS[step]}</span>
        </div>
        <Progress value={progressPct} className="h-2" />
      </div>

      {step === 0 && <WelcomeStep onNext={nextStep} onSkip={skipStep} />}
      {step === 1 && <ConnectQboStep onNext={nextStep} onSkip={skipStep} />}
      {step === 2 && <ReviewInvoicesStep onNext={nextStep} onSkip={skipStep} invoiceCount={status?.invoiceCount ?? 0} totalOutstanding={status?.totalOutstanding ?? 0} />}
      {step === 3 && <SetupCadenceStep onNext={nextStep} onSkip={skipStep} cadenceConfigured={status?.cadenceConfigured ?? false} />}
      {step === 4 && <TestReminderStep onNext={nextStep} onSkip={skipStep} />}
      {step === 5 && <CompletionStep onNext={handleComplete} />}
    </div>
  );
}
