import { useCallback, useMemo, useState } from 'react';
import { Button } from './Button';
import { useSound } from '../../hooks/useSound';

const DIGIT_WORDS = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine'];

const CHALLENGE_LENGTH = 4;

function generateChallenge(): string {
  let challenge = '';
  for (let i = 0; i < CHALLENGE_LENGTH; i++) {
    challenge += Math.floor(Math.random() * 10);
  }
  return challenge;
}

interface GrownUpGateProps {
  onSuccess: () => void;
  onCancel?: () => void;
  title?: string;
}

/**
 * A reading-based gate, not a secret.
 *
 * The digits to enter are shown on screen as words, so anyone who can read
 * passes instantly and a pre-reader does not. That is the whole security
 * model: it keeps a small child out of parent mode, and is not intended to
 * stop anyone else — the household session already authenticates the adult.
 *
 * The challenge is random per attempt rather than the household's saved PIN,
 * so nothing secret is printed on screen and a child who memorises one
 * sequence cannot reuse it.
 */
export function GrownUpGate({ onSuccess, onCancel, title = 'Ask a grown-up' }: GrownUpGateProps) {
  const [challenge, setChallenge] = useState(generateChallenge);
  const [entry, setEntry] = useState('');
  const [error, setError] = useState('');
  const { playPlaced, playRejected } = useSound();

  const words = useMemo(
    () => challenge.split('').map((d) => DIGIT_WORDS[Number(d)]),
    [challenge],
  );

  const handleDigit = useCallback((digit: string) => {
    setError('');
    setEntry((prev) => {
      if (prev.length >= CHALLENGE_LENGTH) return prev;
      const next = prev + digit;

      if (next.length === CHALLENGE_LENGTH) {
        if (next === challenge) {
          playPlaced();
          onSuccess();
        } else {
          // New challenge on failure, so repeated guessing can't converge.
          playRejected();
          setError("That's not quite it — try the new words.");
          setChallenge(generateChallenge());
          return '';
        }
      } else {
        playPlaced();
      }

      return next;
    });
  }, [challenge, onSuccess, playPlaced, playRejected]);

  const handleBackspace = useCallback(() => {
    setError('');
    setEntry((prev) => prev.slice(0, -1));
  }, []);

  const digits = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', ''];

  return (
    <div className="flex flex-col items-center">
      <h3 className="text-lg font-semibold text-gray-800 mb-1" style={{ fontFamily: 'var(--font-heading)' }}>
        {title}
      </h3>
      <p className="text-sm text-gray-500 mb-4">Tap these numbers:</p>

      {/* The challenge, spelled out. aria-label gives screen readers the digits
          rather than the words, since a screen-reader user is not the audience
          this gate is filtering for. */}
      <p
        className="mb-5 text-center text-2xl font-bold tracking-wide text-parent-primary"
        style={{ fontFamily: 'var(--font-heading)' }}
        aria-label={`Enter ${challenge.split('').join(' ')}`}
      >
        {words.join(' ')}
      </p>

      {/* Entry progress */}
      <div className="flex gap-3 mb-5" aria-hidden="true">
        {Array.from({ length: CHALLENGE_LENGTH }).map((_, i) => (
          <div
            key={i}
            className={`w-12 h-12 rounded-full border-2 flex items-center justify-center transition-all duration-150 ${
              entry.length > i ? 'bg-parent-primary border-parent-primary' : 'border-gray-300'
            }`}
          >
            {entry.length > i && <div className="w-3 h-3 bg-white rounded-full" />}
          </div>
        ))}
      </div>

      {error && <p className="text-danger text-sm mb-4">{error}</p>}

      <div className="grid grid-cols-3 gap-3 mb-4">
        {digits.map((digit, i) => (
          <div key={i} className="w-16 h-16">
            {digit && (
              <button
                type="button"
                onClick={() => handleDigit(digit)}
                className="w-full h-full rounded-full bg-gray-100 hover:bg-gray-200 text-2xl font-semibold text-gray-800 touch-feedback transition-colors duration-150"
              >
                {digit}
              </button>
            )}
          </div>
        ))}
      </div>

      <div className="flex gap-3 w-full">
        {onCancel && (
          <Button variant="ghost" onClick={onCancel} className="flex-1">
            Cancel
          </Button>
        )}
        <Button
          variant="ghost"
          onClick={handleBackspace}
          className="flex-1"
          disabled={entry.length === 0}
        >
          Delete
        </Button>
      </div>
    </div>
  );
}
