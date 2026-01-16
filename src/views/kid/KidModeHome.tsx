import { useState } from 'react';
import { Button } from '../../components/common/Button';
import { Modal } from '../../components/common/Modal';
import { PinPad } from '../../components/common/PinPad';
import { KidAvatar } from '../../components/kid/KidAvatar';
import { useAppState } from '../../contexts/AppStateContext';
import { useKidProfiles } from '../../contexts/KidProfilesContext';
import { useMenu } from '../../contexts/MenuContext';

interface KidModeHomeProps {
  onSelectKid: (kidId: string) => void;
}

export function KidModeHome({ onSelectKid }: KidModeHomeProps) {
  const { authenticateParent } = useAppState();
  const { profiles } = useKidProfiles();
  const { currentMenu, hasKidSelected } = useMenu();
  const [showPinModal, setShowPinModal] = useState(false);
  const [pinError, setPinError] = useState('');

  const handlePinSubmit = (pin: string) => {
    const success = authenticateParent(pin);
    if (!success) {
      setPinError('Wrong PIN!');
    } else {
      setShowPinModal(false);
      setPinError('');
    }
  };

  // No menu set
  if (!currentMenu) {
    return (
      <div className="min-h-screen bg-kid-bg flex flex-col items-center justify-center p-6">
        <div className="text-center max-w-md">
          <h1 className="text-3xl font-bold text-gray-800 mb-4">
            No Menu Yet!
          </h1>
          <p className="text-xl text-gray-600 mb-8">
            Ask a grown-up to set up today's menu
          </p>
          <Button
            mode="kid"
            variant="primary"
            size="touch"
            onClick={() => setShowPinModal(true)}
          >
            Parent Login
          </Button>
        </div>

        <Modal isOpen={showPinModal} onClose={() => setShowPinModal(false)} mode="kid">
          <PinPad
            onSubmit={handlePinSubmit}
            onCancel={() => {
              setShowPinModal(false);
              setPinError('');
            }}
            title="Enter Parent PIN"
            error={pinError}
          />
        </Modal>
      </div>
    );
  }

  // No kids set up
  if (profiles.length === 0) {
    return (
      <div className="min-h-screen bg-kid-bg flex flex-col items-center justify-center p-6">
        <div className="text-center max-w-md">
          <h1 className="text-3xl font-bold text-gray-800 mb-4">
            Who's Here?
          </h1>
          <p className="text-xl text-gray-600 mb-8">
            Ask a grown-up to add your name
          </p>
          <Button
            mode="kid"
            variant="primary"
            size="touch"
            onClick={() => setShowPinModal(true)}
          >
            Parent Login
          </Button>
        </div>

        <Modal isOpen={showPinModal} onClose={() => setShowPinModal(false)} mode="kid">
          <PinPad
            onSubmit={handlePinSubmit}
            onCancel={() => {
              setShowPinModal(false);
              setPinError('');
            }}
            title="Enter Parent PIN"
            error={pinError}
          />
        </Modal>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-kid-bg flex flex-col p-6">
      {/* Header with parent access */}
      <div className="flex justify-end mb-4">
        <button
          onClick={() => setShowPinModal(true)}
          className="text-gray-400 hover:text-gray-600 transition-colors p-2"
          aria-label="Parent login"
        >
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        </button>
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col items-center justify-center">
        <h1 className="text-4xl font-bold text-gray-800 mb-2 text-center">
          Who's hungry?
        </h1>
        <p className="text-xl text-gray-600 mb-12 text-center">
          Tap your name to pick your food!
        </p>

        {/* Kid avatars */}
        <div className="flex flex-wrap justify-center gap-8">
          {profiles.map((profile) => {
            const hasSelected = hasKidSelected(profile.id);
            return (
              <div key={profile.id} className="flex flex-col items-center">
                <div className="relative">
                  <KidAvatar
                    name={profile.name}
                    color={profile.avatarColor}
                    size="xl"
                    onClick={() => onSelectKid(profile.id)}
                  />
                  {hasSelected && (
                    <div className="absolute -top-2 -right-2 w-10 h-10 bg-success rounded-full flex items-center justify-center shadow-lg">
                      <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                  )}
                </div>
                <span className="mt-3 text-2xl font-semibold text-gray-800">
                  {profile.name}
                </span>
                {hasSelected && (
                  <span className="text-sm text-success font-medium">Done!</span>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <Modal isOpen={showPinModal} onClose={() => setShowPinModal(false)} mode="kid">
        <PinPad
          onSubmit={handlePinSubmit}
          onCancel={() => {
            setShowPinModal(false);
            setPinError('');
          }}
          title="Enter Parent PIN"
          error={pinError}
        />
      </Modal>
    </div>
  );
}
