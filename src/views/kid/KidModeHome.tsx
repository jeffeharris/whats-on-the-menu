import { useState } from 'react';
import { Star, Settings, Check } from 'lucide-react';
import { Button } from '../../components/common/Button';
import { Modal } from '../../components/common/Modal';
import { PinPad } from '../../components/common/PinPad';
import { KidAvatar } from '../../components/kid/KidAvatar';
import { SelectionThumbnails } from '../../components/kid/SelectionThumbnails';
import { useAppState } from '../../contexts/AppStateContext';
import { useKidProfiles } from '../../contexts/KidProfilesContext';
import { useMenu } from '../../contexts/MenuContext';
import { useMealHistory } from '../../contexts/MealHistoryContext';

interface KidModeHomeProps {
  onSelectKid: (kidId: string) => void;
  onConfirmSelections?: () => void;
  onNavigateToStars?: () => void;
}

export function KidModeHome({ onSelectKid, onConfirmSelections, onNavigateToStars }: KidModeHomeProps) {
  const { authenticateParent, enterParentMode, pinEnabled } = useAppState();
  const { profiles } = useKidProfiles();
  const { currentMenu, hasKidSelected, selections, selectionsLocked, lockSelections, getSelectionForKid } = useMenu();
  const { getStarCountForKid, getTotalFamilyStars } = useMealHistory();
  const totalStars = getTotalFamilyStars();
  const [showPinModal, setShowPinModal] = useState(false);
  const [showConfirmPinModal, setShowConfirmPinModal] = useState(false);
  const [pinError, setPinError] = useState('');

  const hasAnySelections = selections.length > 0;

  const handleParentLogin = () => {
    if (!pinEnabled) {
      enterParentMode();
    } else {
      setShowPinModal(true);
    }
  };

  const handlePinSubmit = async (pin: string) => {
    const success = await authenticateParent(pin);
    if (!success) {
      setPinError('Wrong PIN!');
    } else {
      setShowPinModal(false);
      setPinError('');
    }
  };

  const handleConfirmSelections = () => {
    if (!pinEnabled) {
      enterParentMode();
      lockSelections();
      onConfirmSelections?.();
    } else {
      setShowConfirmPinModal(true);
    }
  };

  const handleConfirmPinSubmit = async (pin: string) => {
    const success = await authenticateParent(pin);
    if (!success) {
      setPinError('Wrong PIN!');
    } else {
      setShowConfirmPinModal(false);
      setPinError('');
      lockSelections();
      onConfirmSelections?.();
    }
  };

  // No menu set
  if (!currentMenu) {
    return (
      <div className="h-full bg-kid-bg flex flex-col items-center justify-center p-6 overflow-hidden">
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
            onClick={handleParentLogin}
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
      <div className="h-full bg-kid-bg flex flex-col items-center justify-center p-6 overflow-hidden">
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
            onClick={handleParentLogin}
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
    <div className="h-full bg-kid-bg flex flex-col p-4 md:p-8 overflow-hidden">
      {/* Header with parent access */}
      <div className="flex-shrink-0 flex justify-between items-center mb-4">
        {totalStars > 0 ? (
          <button
            onClick={onNavigateToStars}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-yellow-100 hover:bg-yellow-200 transition-colors"
            aria-label="Our Stars"
          >
            <Star className="w-5 h-5 text-yellow-400 fill-yellow-400" />
            <span className="text-sm font-bold text-yellow-700">Our Stars</span>
          </button>
        ) : (
          <div />
        )}
        <button
          onClick={handleParentLogin}
          className="text-gray-400 hover:text-gray-600 transition-colors p-2"
          aria-label="Parent login"
        >
          <Settings className="w-6 h-6" />
        </button>
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col items-center justify-center">
        <h1 className="text-3xl md:text-4xl font-bold text-gray-800 mb-2 text-center font-heading">
          Who's hungry?
        </h1>
        <p className="text-lg md:text-xl text-gray-600 mb-8 md:mb-12 text-center">
          {selectionsLocked ? 'Selections are locked!' : 'Tap your name to pick your food!'}
        </p>

        {/* Kid avatars */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 md:gap-10 max-w-3xl mx-auto">
          {profiles.map((profile) => {
            const hasSelected = hasKidSelected(profile.id);
            const selection = getSelectionForKid(profile.id);
            return (
              <div key={profile.id} className="flex flex-col items-center">
                <div className="relative">
                  <KidAvatar
                    name={profile.name}
                    color={profile.avatarColor}
                    avatarAnimal={profile.avatarAnimal}
                    size="2xl"
                    onClick={() => onSelectKid(profile.id)}
                  />
                  {hasSelected && (
                    <div className="absolute -top-2 -right-2 w-10 h-10 bg-success rounded-full flex items-center justify-center shadow-lg">
                      <Check className="w-6 h-6 text-white" strokeWidth={3} />
                    </div>
                  )}
                </div>
                <span className="mt-3 text-2xl font-semibold text-gray-800">
                  {profile.name}
                </span>
                {(() => {
                  const starCount = getStarCountForKid(profile.id);
                  return starCount > 0 ? (
                    <div className="flex items-center gap-1 mt-1">
                      <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />
                      <span className="text-sm font-bold text-yellow-600">{starCount}</span>
                    </div>
                  ) : null;
                })()}
                {hasSelected && selection && (
                  <>
                    <SelectionThumbnails selection={selection} />
                    <span className="text-sm text-success font-medium mt-1">Done!</span>
                  </>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Confirm Selections Button */}
      {hasAnySelections && !selectionsLocked && (
        <div className="mt-6">
          <Button
            mode="kid"
            variant="primary"
            size="touch"
            fullWidth
            onClick={handleConfirmSelections}
          >
            Confirm Selections
          </Button>
        </div>
      )}

      {/* Parent Login Modal */}
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

      {/* Confirm Selections PIN Modal */}
      <Modal isOpen={showConfirmPinModal} onClose={() => setShowConfirmPinModal(false)} mode="kid">
        <PinPad
          onSubmit={handleConfirmPinSubmit}
          onCancel={() => {
            setShowConfirmPinModal(false);
            setPinError('');
          }}
          title="Parent PIN to Confirm"
          error={pinError}
        />
      </Modal>
    </div>
  );
}
