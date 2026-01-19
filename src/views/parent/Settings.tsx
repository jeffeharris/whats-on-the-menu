import { useState } from 'react';
import { Button } from '../../components/common/Button';
import { Card } from '../../components/common/Card';
import { Modal } from '../../components/common/Modal';
import { PinPad } from '../../components/common/PinPad';
import { useAppState } from '../../contexts/AppStateContext';
import { useImageGenerationContext } from '../../contexts/ImageGenerationContext';
import type { ImageProvider } from '../../services/imageGeneration';

interface SettingsProps {
  onBack: () => void;
}

export function Settings({ onBack }: SettingsProps) {
  const { setParentPin, parentPin } = useAppState();
  const { provider, setProvider } = useImageGenerationContext();
  const [showPinModal, setShowPinModal] = useState(false);
  const [step, setStep] = useState<'verify' | 'new'>('verify');
  const [error, setError] = useState('');

  const handleProviderChange = (newProvider: ImageProvider) => {
    setProvider(newProvider);
  };

  const handleVerifyPin = (pin: string) => {
    if (pin === parentPin) {
      setStep('new');
      setError('');
    } else {
      setError('Incorrect PIN');
    }
  };

  const handleNewPin = (pin: string) => {
    setParentPin(pin);
    setShowPinModal(false);
    setStep('verify');
    setError('');
  };

  const handleClose = () => {
    setShowPinModal(false);
    setStep('verify');
    setError('');
  };

  return (
    <div className="h-full bg-parent-bg flex flex-col overflow-hidden">
      <header className="flex-shrink-0 flex items-center gap-4 p-4">
        <button
          onClick={onBack}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          aria-label="Go back"
        >
          <svg className="w-6 h-6 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <h1 className="text-2xl font-bold text-gray-800 flex-1">Settings</h1>
      </header>

      <main className="flex-1 overflow-y-auto p-4 pt-0">
        <div className="max-w-lg mx-auto">
          <Card className="mb-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-semibold text-gray-800">Parent PIN</h2>
              <p className="text-sm text-gray-500">
                Used to access parent mode
              </p>
            </div>
            <Button variant="ghost" size="sm" onClick={() => setShowPinModal(true)}>
              Change
            </Button>
          </div>
        </Card>

        <Card className="mb-4">
          <div>
            <h2 className="font-semibold text-gray-800 mb-1">Image Generation</h2>
            <p className="text-sm text-gray-500 mb-3">
              Choose which AI service generates food images
            </p>
            <div className="space-y-2">
              <label className="flex items-center gap-3 p-3 rounded-lg border border-gray-200 cursor-pointer hover:bg-gray-50 transition-colors">
                <input
                  type="radio"
                  name="image-provider"
                  value="pollinations"
                  checked={provider === 'pollinations'}
                  onChange={() => handleProviderChange('pollinations')}
                  className="w-4 h-4 text-parent-primary focus:ring-parent-primary"
                />
                <div className="flex-1">
                  <span className="font-medium text-gray-800">Pollinations</span>
                  <p className="text-xs text-gray-500">Free, no API key required</p>
                </div>
              </label>
              <label className="flex items-center gap-3 p-3 rounded-lg border border-gray-200 cursor-pointer hover:bg-gray-50 transition-colors">
                <input
                  type="radio"
                  name="image-provider"
                  value="runware"
                  checked={provider === 'runware'}
                  onChange={() => handleProviderChange('runware')}
                  className="w-4 h-4 text-parent-primary focus:ring-parent-primary"
                />
                <div className="flex-1">
                  <span className="font-medium text-gray-800">Runware</span>
                  <p className="text-xs text-gray-500">Fast, requires API key (server-side)</p>
                </div>
              </label>
            </div>
          </div>
        </Card>

        <Card>
          <h2 className="font-semibold text-gray-800 mb-2">About</h2>
          <p className="text-sm text-gray-500">
            What's On The Menu helps families reduce mealtime tension by giving kids
            choices within parent-defined options.
          </p>
          <p className="text-sm text-gray-400 mt-4">
            Version 1.0.0
          </p>
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
