import { useState } from 'react';
import { Button } from '../../components/common/Button';
import { Card } from '../../components/common/Card';
import { Modal } from '../../components/common/Modal';
import { PinPad } from '../../components/common/PinPad';
import { useAppState } from '../../contexts/AppStateContext';

interface SettingsProps {
  onBack: () => void;
}

export function Settings({ onBack }: SettingsProps) {
  const { setParentPin, parentPin } = useAppState();
  const [showPinModal, setShowPinModal] = useState(false);
  const [step, setStep] = useState<'verify' | 'new'>('verify');
  const [error, setError] = useState('');

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
    <div className="min-h-screen bg-parent-bg p-4">
      <header className="flex items-center gap-4 mb-6">
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
