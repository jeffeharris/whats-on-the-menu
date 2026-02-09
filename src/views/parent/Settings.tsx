import { useState } from 'react';
import { ArrowLeft, KeyRound, Image, Info } from 'lucide-react';
import { Button } from '../../components/common/Button';
import { Card } from '../../components/common/Card';
import { Modal } from '../../components/common/Modal';
import { PinPad } from '../../components/common/PinPad';
import { useAppState } from '../../contexts/AppStateContext';
import { useImageGenerationContext } from '../../contexts/ImageGenerationContext';
import { authApi } from '../../api/client';
import type { ImageProvider } from '../../services/imageGeneration';

interface SettingsProps {
  onBack: () => void;
}

export function Settings({ onBack }: SettingsProps) {
  const { setParentPin } = useAppState();
  const { provider, setProvider } = useImageGenerationContext();
  const [showPinModal, setShowPinModal] = useState(false);
  const [step, setStep] = useState<'verify' | 'new'>('verify');
  const [error, setError] = useState('');
  const [verifiedPin, setVerifiedPin] = useState('');

  const handleProviderChange = (newProvider: ImageProvider) => {
    setProvider(newProvider);
  };

  const handleVerifyPin = async (pin: string) => {
    try {
      const result = await authApi.verifyPin(pin);
      if (result.valid) {
        setVerifiedPin(pin);
        setStep('new');
        setError('');
      } else {
        setError('Incorrect PIN');
      }
    } catch {
      setError('Failed to verify PIN');
    }
  };

  const handleNewPin = async (pin: string) => {
    const success = await setParentPin(verifiedPin, pin);
    if (success) {
      setShowPinModal(false);
      setStep('verify');
      setVerifiedPin('');
      setError('');
    } else {
      setError('Failed to update PIN');
    }
  };

  const handleClose = () => {
    setShowPinModal(false);
    setStep('verify');
    setError('');
  };

  return (
    <div className="h-full bg-parent-bg flex flex-col overflow-hidden">
      <header className="flex-shrink-0 flex items-center gap-4 p-4 md:p-6 max-w-3xl mx-auto w-full">
        <button
          onClick={onBack}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          aria-label="Go back"
        >
          <ArrowLeft className="w-6 h-6 text-gray-600" />
        </button>
        <h1 className="text-2xl font-bold text-gray-800 flex-1" style={{ fontFamily: 'var(--font-heading)' }}>
          Settings
        </h1>
      </header>

      <main className="flex-1 overflow-y-auto p-4 md:p-6 pt-0">
        <div className="max-w-lg mx-auto space-y-4">
          <Card className="fade-up-in" style={{ animationDelay: '0ms' }}>
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 bg-parent-primary/10 rounded-xl flex items-center justify-center flex-shrink-0">
                <KeyRound className="w-5 h-5 text-parent-primary" />
              </div>
              <div className="flex-1">
                <h2 className="font-semibold text-gray-800" style={{ fontFamily: 'var(--font-heading)' }}>Parent PIN</h2>
                <p className="text-sm text-gray-500">Used to access parent mode</p>
              </div>
              <Button variant="ghost" size="sm" onClick={() => setShowPinModal(true)}>
                Change
              </Button>
            </div>
          </Card>

          <Card className="fade-up-in" style={{ animationDelay: '75ms' }}>
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 bg-parent-secondary/10 rounded-xl flex items-center justify-center flex-shrink-0">
                <Image className="w-5 h-5 text-parent-secondary" />
              </div>
              <div className="flex-1">
                <h2 className="font-semibold text-gray-800 mb-3" style={{ fontFamily: 'var(--font-heading)' }}>Image Generation</h2>
                <div className="space-y-2">
                  <label className="flex items-center gap-3 p-3 rounded-xl border border-gray-200 cursor-pointer hover:bg-gray-50 transition-colors">
                    <input
                      type="radio"
                      name="image-provider"
                      value="pollinations"
                      checked={provider === 'pollinations'}
                      onChange={() => handleProviderChange('pollinations')}
                      className="w-4 h-4 text-parent-primary focus:ring-parent-primary"
                    />
                    <div className="flex-1">
                      <span className="font-medium text-gray-800 text-sm">Pollinations</span>
                      <p className="text-xs text-gray-500">Free, no API key required</p>
                    </div>
                  </label>
                  <label className="flex items-center gap-3 p-3 rounded-xl border border-gray-200 cursor-pointer hover:bg-gray-50 transition-colors">
                    <input
                      type="radio"
                      name="image-provider"
                      value="runware"
                      checked={provider === 'runware'}
                      onChange={() => handleProviderChange('runware')}
                      className="w-4 h-4 text-parent-primary focus:ring-parent-primary"
                    />
                    <div className="flex-1">
                      <span className="font-medium text-gray-800 text-sm">Runware</span>
                      <p className="text-xs text-gray-500">Fast, requires API key (server-side)</p>
                    </div>
                  </label>
                </div>
              </div>
            </div>
          </Card>

          <Card className="fade-up-in" style={{ animationDelay: '150ms' }}>
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 bg-gray-100 rounded-xl flex items-center justify-center flex-shrink-0">
                <Info className="w-5 h-5 text-gray-500" />
              </div>
              <div className="flex-1">
                <h2 className="font-semibold text-gray-800" style={{ fontFamily: 'var(--font-heading)' }}>About</h2>
                <p className="text-sm text-gray-500 mt-1">
                  What's On The Menu helps families reduce mealtime tension by giving kids
                  choices within parent-defined options.
                </p>
                <p className="text-sm text-gray-400 mt-3">Version 1.0.0</p>
              </div>
            </div>
          </Card>
        </div>
      </main>

      <Modal
        isOpen={showPinModal}
        onClose={handleClose}
        title={step === 'verify' ? 'Verify Current PIN' : 'Set New PIN'}
      >
        {step === 'verify' ? (
          <PinPad
            onSubmit={handleVerifyPin}
            onCancel={handleClose}
            title="Enter current PIN"
            error={error}
          />
        ) : (
          <PinPad
            onSubmit={handleNewPin}
            onCancel={handleClose}
            title="Enter new PIN"
            confirmMode
          />
        )}
      </Modal>
    </div>
  );
}
