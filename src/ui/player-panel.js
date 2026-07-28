export function createPlayerPanel({
  cleanInitials,
  cleanDisplayName,
  onOpen,
  onClose,
  onSaveInitials,
  onSaveDisplayName,
  onAutoSubmitChanged,
  onBeginEmailCode,
  onVerifyOtp
} = {}) {
  const panel = document.getElementById('player-panel');
  const playerButton = document.getElementById('player-btn');
  const inviteAdd = document.getElementById('display-name-invite-add');
  const backButton = document.getElementById('player-back');
  const initials = document.getElementById('player-initials-input');
  const initialsSave = document.getElementById('player-initials-save');
  const displayName = document.getElementById('player-display-name-input');
  const displayNameSave = document.getElementById('player-display-name-save');
  const autoSubmit = document.getElementById('auto-submit-toggle');
  const saveEmail = document.getElementById('player-save-email');
  const restoreEmail = document.getElementById('player-restore-email');
  const otp = document.getElementById('player-otp-input');
  const verifyOtp = document.getElementById('player-verify-otp');

  function sanitizeDisplayName() {
    const caretAtEnd = displayName.selectionStart === displayName.value.length;
    displayName.value = cleanDisplayName(displayName.value);
    if (caretAtEnd) displayName.setSelectionRange(displayName.value.length, displayName.value.length);
  }

  function bind() {
    playerButton?.addEventListener('click', () => onOpen?.());
    inviteAdd?.addEventListener('click', () => onOpen?.({ focusDisplayName: true }));
    backButton?.addEventListener('click', () => onClose?.());
    panel?.addEventListener('click', event => { if (event.target === panel) onClose?.(); });
    initials?.addEventListener('input', () => { initials.value = cleanInitials(initials.value); });
    initialsSave?.addEventListener('click', () => onSaveInitials?.(initials.value));
    displayName?.addEventListener('input', sanitizeDisplayName);
    displayNameSave?.addEventListener('click', () => onSaveDisplayName?.(displayName.value));
    autoSubmit?.addEventListener('change', () => onAutoSubmitChanged?.(autoSubmit.checked));
    saveEmail?.addEventListener('click', () => onBeginEmailCode?.('save'));
    restoreEmail?.addEventListener('click', () => onBeginEmailCode?.('restore'));
    otp?.addEventListener('input', () => { otp.value = otp.value.replace(/\D/g, '').slice(0, 8); });
    verifyOtp?.addEventListener('click', () => onVerifyOtp?.(otp.value.trim()));
  }

  return { bind };
}
