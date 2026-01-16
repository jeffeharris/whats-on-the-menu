import { useState, useCallback } from 'react';
import { Button } from './Button';

interface PinPadProps {
  onSubmit: (pin: string) => void;
  onCancel?: () => void;
  title?: string;
  error?: string;
  confirmMode?: boolean;
  confirmPin?: string;
}

export function PinPad({
  onSubmit,
  onCancel,
  title = 'Enter PIN',
  error,
  confirmMode = false,
  confirmPin,
}: PinPadProps) {
  const [pin, setPin] = useState('');
  const [confirmPinState, setConfirmPinState] = useState('');
  const [isConfirming, setIsConfirming] = useState(false);
  const [confirmError, setConfirmError] = useState('');

  const currentPin = isConfirming ? confirmPinState : pin;
  const setCurrentPin = isConfirming ? setConfirmPinState : setPin;

  const handleDigit = useCallback((digit: string) => {
    if (currentPin.length < 4) {
      setCurrentPin((prev) => prev + digit);
      setConfirmError('');
    }
  }, [currentPin.length, setCurrentPin]);

  const handleBackspace = useCallback(() => {
    setCurrentPin((prev) => prev.slice(0, -1));
    setConfirmError('');
  }, [setCurrentPin]);

  const handleClear = useCallback(() => {
    setCurrentPin('');
    setConfirmError('');
  }, [setCurrentPin]);

  const handleSubmit = useCallback(() => {
    if (currentPin.length !== 4) return;

    if (confirmMode && !isConfirming) {
      setIsConfirming(true);
      return;
    }

    if (confirmMode && isConfirming) {
      if (pin !== confirmPinState) {
        setConfirmError('PINs do not match');
        setConfirmPinState('');
        return;
      }
    }

    if (confirmPin && pin !== confirmPin) {
      setConfirmError('Incorrect PIN');
      setPin('');
      return;
    }

    onSubmit(pin);
  }, [currentPin.length, confirmMode, isConfirming, pin, confirmPinState, confirmPin, onSubmit]);

  const digits = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', ''];

  return (
    <div className="flex flex-col items-center">
      <h3 className="text-lg font-semibold text-gray-800 mb-4">
        {isConfirming ? 'Confirm PIN' : title}
      </h3>

      {/* PIN Display */}
      <div className="flex gap-3 mb-6">
        {[0, 1, 2, 3].map((i) => (
          <div
            key={i}
            className={`
              w-12 h-12 rounded-full border-2
              flex items-center justify-center
              transition-all duration-150
              ${currentPin.length > i
                ? 'bg-parent-primary border-parent-primary'
                : 'border-gray-300'
              }
            `}
          >
            {currentPin.length > i && (
              <div className="w-3 h-3 bg-white rounded-full" />
            )}
          </div>
        ))}
      </div>

      {/* Error message */}
      {(error || confirmError) && (
        <p className="text-danger text-sm mb-4">{error || confirmError}</p>
      )}

      {/* Number pad */}
      <div className="grid grid-cols-3 gap-3 mb-4">
        {digits.map((digit, i) => (
          <div key={i} className="w-16 h-16">
            {digit && (
              <button
                type="button"
                onClick={() => handleDigit(digit)}
                className="
                  w-full h-full rounded-full
                  bg-gray-100 hover:bg-gray-200
                  text-2xl font-semibold text-gray-800
                  touch-feedback
                  transition-colors duration-150
                "
              >
                {digit}
              </button>
            )}
          </div>
        ))}
      </div>

      {/* Action buttons */}
      <div className="flex gap-3 w-full">
        <Button
          variant="ghost"
          onClick={handleClear}
          className="flex-1"
          disabled={currentPin.length === 0}
        >
          Clear
        </Button>
        <Button
          variant="ghost"
          onClick={handleBackspace}
          className="flex-1"
          disabled={currentPin.length === 0}
        >
          Delete
        </Button>
      </div>

      <div className="flex gap-3 w-full mt-4">
        {onCancel && (
          <Button variant="ghost" onClick={onCancel} className="flex-1">
            Cancel
          </Button>
        )}
        <Button
          variant="primary"
          onClick={handleSubmit}
          className="flex-1"
          disabled={currentPin.length !== 4}
        >
          {confirmMode && !isConfirming ? 'Next' : 'Submit'}
        </Button>
      </div>
    </div>
  );
}
