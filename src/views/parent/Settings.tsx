import { useState, useEffect, useCallback } from 'react';
import { ArrowLeft, KeyRound, Image, Info, Users, UserPlus, Crown, X, Mail, Loader2, LogOut } from 'lucide-react';
import { Button } from '../../components/common/Button';
import { Card } from '../../components/common/Card';
import { Modal } from '../../components/common/Modal';
import { PinPad } from '../../components/common/PinPad';
import { useAppState } from '../../contexts/AppStateContext';
import { useImageGenerationContext } from '../../contexts/ImageGenerationContext';
import { useAuth } from '../../contexts/AuthContext';
import { authApi, householdApi } from '../../api/client';
import type { ImageProvider } from '../../services/imageGeneration';
import type { HouseholdMember, HouseholdInvitation } from '../../types';

interface SettingsProps {
  onBack: () => void;
}

export function Settings({ onBack }: SettingsProps) {
  const { setParentPin, pinEnabled } = useAppState();
  const { provider, setProvider } = useImageGenerationContext();
  const { user, logout, refreshAuth } = useAuth();
  const [showPinModal, setShowPinModal] = useState(false);
  const [showEnablePinModal, setShowEnablePinModal] = useState(false);
  const [showDisablePinModal, setShowDisablePinModal] = useState(false);
  const [step, setStep] = useState<'verify' | 'new'>('verify');
  const [error, setError] = useState('');
  const [verifiedPin, setVerifiedPin] = useState('');

  // Household members & invitations
  const [members, setMembers] = useState<HouseholdMember[]>([]);
  const [invitations, setInvitations] = useState<HouseholdInvitation[]>([]);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteError, setInviteError] = useState('');
  const [inviteSuccess, setInviteSuccess] = useState('');
  const [isInviting, setIsInviting] = useState(false);
  const [memberError, setMemberError] = useState('');
  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false);

  const loadHouseholdData = useCallback(async () => {
    try {
      const [membersRes, invitationsRes] = await Promise.all([
        householdApi.getMembers(),
        householdApi.getInvitations(),
      ]);
      setMembers(membersRes.members);
      setInvitations(invitationsRes.invitations);
    } catch {
      // Silently fail — members section will just be empty
    }
  }, []);

  useEffect(() => {
    loadHouseholdData();
  }, [loadHouseholdData]);

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail.trim()) return;
    setInviteError('');
    setInviteSuccess('');
    setIsInviting(true);

    try {
      await householdApi.invite(inviteEmail.trim());
      setInviteSuccess(`Invitation sent to ${inviteEmail.trim()}`);
      setInviteEmail('');
      loadHouseholdData();
    } catch (err: unknown) {
      setInviteError((err as Error).message || 'Failed to send invitation');
    } finally {
      setIsInviting(false);
    }
  };

  const handleRevokeInvitation = async (id: string) => {
    try {
      await householdApi.revokeInvitation(id);
      loadHouseholdData();
    } catch {
      setInviteError('Failed to revoke invitation');
    }
  };

  const handleRemoveMember = async (userId: string) => {
    setMemberError('');
    try {
      await householdApi.removeMember(userId);
      loadHouseholdData();
    } catch (err: unknown) {
      setMemberError((err as Error).message || 'Failed to remove member');
    }
  };

  const handleLeave = async () => {
    try {
      await householdApi.leaveHousehold();
      await logout();
    } catch (err: unknown) {
      setMemberError((err as Error).message || 'Failed to leave household');
      setShowLeaveConfirm(false);
    }
  };

  const isOwner = user?.role === 'owner';

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

  const handleEnablePin = async (pin: string) => {
    try {
      await authApi.enablePin(pin);
      setShowEnablePinModal(false);
      setError('');
      refreshAuth();
    } catch {
      setError('Failed to enable PIN');
    }
  };

  const handleDisablePin = async (pin: string) => {
    try {
      await authApi.disablePin(pin);
      setShowDisablePinModal(false);
      setError('');
      refreshAuth();
    } catch {
      setError('Incorrect PIN');
    }
  };

  const handleClose = () => {
    setShowPinModal(false);
    setShowEnablePinModal(false);
    setShowDisablePinModal(false);
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
                <p className="text-sm text-gray-500">
                  {pinEnabled ? 'Required to access parent mode' : 'Off — parent mode is open'}
                </p>
              </div>
              <div className="flex gap-2">
                {pinEnabled && (
                  <Button variant="ghost" size="sm" onClick={() => setShowPinModal(true)}>
                    Change
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => pinEnabled ? setShowDisablePinModal(true) : setShowEnablePinModal(true)}
                >
                  {pinEnabled ? 'Disable' : 'Enable'}
                </Button>
              </div>
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

          {/* Household Members */}
          <Card className="fade-up-in" style={{ animationDelay: '150ms' }}>
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center flex-shrink-0">
                <Users className="w-5 h-5 text-blue-500" />
              </div>
              <div className="flex-1">
                <h2 className="font-semibold text-gray-800 mb-3" style={{ fontFamily: 'var(--font-heading)' }}>Household Members</h2>
                {memberError && (
                  <div className="mb-3 p-2 rounded-lg bg-red-50 text-red-700 text-xs">{memberError}</div>
                )}
                <div className="space-y-2">
                  {members.map((member) => (
                    <div key={member.id} className="flex items-center gap-3 p-3 rounded-xl bg-gray-50">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-gray-800 truncate">
                            {member.displayName || member.email}
                          </span>
                          {member.role === 'owner' && (
                            <Crown className="w-3.5 h-3.5 text-amber-500 flex-shrink-0" />
                          )}
                          {member.id === user?.id && (
                            <span className="text-xs text-gray-400">(you)</span>
                          )}
                        </div>
                        {member.displayName && (
                          <p className="text-xs text-gray-500 truncate">{member.email}</p>
                        )}
                      </div>
                      {isOwner && member.id !== user?.id && (
                        <button
                          onClick={() => handleRemoveMember(member.id)}
                          className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                          title="Remove member"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
                {!isOwner && members.length > 1 && (
                  <button
                    onClick={() => setShowLeaveConfirm(true)}
                    className="mt-3 flex items-center gap-2 text-sm text-red-500 hover:text-red-700 transition-colors"
                  >
                    <LogOut className="w-4 h-4" />
                    Leave household
                  </button>
                )}
              </div>
            </div>
          </Card>

          {/* Invite Partner */}
          <Card className="fade-up-in" style={{ animationDelay: '225ms' }}>
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 bg-purple-50 rounded-xl flex items-center justify-center flex-shrink-0">
                <UserPlus className="w-5 h-5 text-purple-500" />
              </div>
              <div className="flex-1">
                <h2 className="font-semibold text-gray-800 mb-3" style={{ fontFamily: 'var(--font-heading)' }}>Invite Partner</h2>

                {inviteError && (
                  <div className="mb-3 p-2 rounded-lg bg-red-50 text-red-700 text-xs">{inviteError}</div>
                )}
                {inviteSuccess && (
                  <div className="mb-3 p-2 rounded-lg bg-green-50 text-green-700 text-xs">{inviteSuccess}</div>
                )}

                <form onSubmit={handleInvite} className="flex gap-2 mb-3">
                  <div className="relative flex-1">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="email"
                      value={inviteEmail}
                      onChange={(e) => setInviteEmail(e.target.value)}
                      placeholder="partner@example.com"
                      className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-parent-primary focus:border-transparent text-gray-900 placeholder-gray-400"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={isInviting || !inviteEmail.trim()}
                    className="px-4 py-2 text-sm font-medium text-white bg-parent-primary rounded-xl hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-opacity flex items-center gap-1.5"
                  >
                    {isInviting ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                    Invite
                  </button>
                </form>

                {invitations.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Pending invitations</p>
                    {invitations.map((inv) => (
                      <div key={inv.id} className="flex items-center gap-3 p-2 rounded-lg bg-gray-50">
                        <span className="text-sm text-gray-600 truncate flex-1">{inv.email}</span>
                        <button
                          onClick={() => handleRevokeInvitation(inv.id)}
                          className="text-xs text-red-500 hover:text-red-700 font-medium transition-colors"
                        >
                          Revoke
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </Card>

          <Card className="fade-up-in" style={{ animationDelay: '300ms' }}>
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

      <Modal
        isOpen={showEnablePinModal}
        onClose={handleClose}
        title="Set a PIN"
      >
        <PinPad
          onSubmit={handleEnablePin}
          onCancel={handleClose}
          title="Choose a 4-digit PIN"
          confirmMode
          error={error}
        />
      </Modal>

      <Modal
        isOpen={showDisablePinModal}
        onClose={handleClose}
        title="Disable PIN"
      >
        <PinPad
          onSubmit={handleDisablePin}
          onCancel={handleClose}
          title="Enter current PIN to disable"
          error={error}
        />
      </Modal>

      <Modal
        isOpen={showLeaveConfirm}
        onClose={() => setShowLeaveConfirm(false)}
        title="Leave Household"
      >
        <div className="p-4 space-y-4">
          <p className="text-sm text-gray-600">
            Are you sure you want to leave this household? You'll be moved to a new empty household and will need to log in again.
          </p>
          <div className="flex gap-3 justify-end">
            <Button variant="ghost" size="sm" onClick={() => setShowLeaveConfirm(false)}>
              Cancel
            </Button>
            <button
              onClick={handleLeave}
              className="px-4 py-2 text-sm font-medium text-white bg-red-500 rounded-xl hover:bg-red-600 transition-colors"
            >
              Leave
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
