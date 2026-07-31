export function createPlayerIdentityController({
  elements,
  getClient,
  profileService,
  authService,
  getState,
  setState,
  cleanInitials,
  cleanDisplayName,
  escHtml,
  isSchemaError,
  onIdentitySettled = () => {},
  renderDisplayNameInvitation = () => {},
  completeDisplayNameInvitation = () => {},
  snoozeDisplayNameInvitation = () => {}
}) {
  const {
    playerMenuLabel, playerMenuMeta, playerIdentityStatus, playerProfileSetup, playerDisplaySetup,
    playerDisplayNameInput, playerAccountSetup, playerMessage, playerPanel,
    playerInitialsSave, playerInitialsInput, playerDisplayNameSave, playerEmailInput,
    playerSaveEmail, playerRestoreEmail, playerOtpInput, playerOtpGroup,
    playerVerifyOtp, displayNameInvite, displayNameInviteLater
  } = elements;

  const playerDisplayName = (profile = getState().playerProfile) =>
    profile ? `${profile.initials}·${profile.player_code}` : '';

  const setPlayerMessage = (message, isError = false) => {
    playerMessage.textContent = message;
    playerMessage.classList.toggle('error', isError);
  };

  const isPermanentPlayer = () => {
    const user = getState().currentUser;
    return !!user && user.is_anonymous !== true;
  };

  function render() {
    const { currentUser, playerProfile } = getState();
    const displayName = playerDisplayName(playerProfile);
    const publicName = String(playerProfile?.display_name || '').trim();
    const permanent = isPermanentPlayer();
    playerMenuLabel.textContent = publicName || displayName || 'Guest Player';
    if (playerMenuMeta) {
      playerMenuMeta.textContent = publicName
        ? displayName
        : displayName
          ? (permanent ? 'Saved player • Email restore' : 'Device player')
          : currentUser ? 'Choose arcade initials' : 'Connecting';
    }
    playerIdentityStatus.innerHTML = displayName
      ? `<span class="player-tag">${escHtml(displayName)}</span><br>${permanent ? 'Saved player • restorable by email' : 'Guest player • saved on this device'}`
      : currentUser ? 'Guest connected<br>Choose your arcade initials' : 'Connecting...';
    playerProfileSetup.style.display = playerProfile ? 'none' : 'block';
    playerDisplaySetup.style.display = playerProfile ? 'block' : 'none';
    if (playerProfile && document.activeElement !== playerDisplayNameInput) {
      playerDisplayNameInput.value = playerProfile.display_name || '';
    }
    playerAccountSetup.style.display = permanent ? 'none' : 'block';
    renderDisplayNameInvitation();
  }

  async function loadProfile(user = getState().currentUser, revision = getState().playerIdentityRevision) {
    if (revision !== getState().playerIdentityRevision || getState().currentUser?.id !== user?.id) return null;
    setState({ playerProfile: null });
    if (!getClient() || !user) {
      render();
      return null;
    }
    try {
      const data = await profileService.loadProfile(user);
      if (revision !== getState().playerIdentityRevision || getState().currentUser?.id !== user.id) return null;
      if (data) setState({ playerProfile: data });
    } catch (error) {
      if (revision !== getState().playerIdentityRevision || getState().currentUser?.id !== user.id) return null;
      console.warn('Player profile unavailable:', error);
    }
    render();
    return getState().playerProfile;
  }

  async function syncSession(session) {
    const revision = getState().playerIdentityRevision + 1;
    const user = session?.user || null;
    setState({ playerIdentityRevision: revision, currentUser: user });
    await loadProfile(user, revision);
    if (revision !== getState().playerIdentityRevision || getState().currentUser?.id !== user?.id) return;
    onIdentitySettled();
  }

  async function init() {
    try { render(); } catch (error) { console.warn('Player identity UI unavailable:', error); }
    if (!getClient()?.auth) {
      playerIdentityStatus.textContent = 'Player service unavailable';
      return;
    }
    try {
      await syncSession(await authService.getOrCreateSession());
    } catch (error) {
      console.warn('Player identity init failed:', error);
      playerIdentityStatus.textContent = 'Guest mode ready • player saving will reconnect automatically';
    }
  }

  function start() {
    try {
      const promise = Promise.resolve(init()).catch(error => {
        console.warn('Player identity startup failed:', error);
        playerIdentityStatus.textContent = 'Guest mode ready • player saving will reconnect automatically';
      });
      setState({ playerIdentityPromise: promise });
      if (getClient()?.auth?.onAuthStateChange) {
        try {
          authService.subscribe(eventSession => {
            setTimeout(async () => {
              let activeSession;
              try { activeSession = await authService.getSession(); } catch { return; }
              if ((activeSession?.user?.id || null) !== (eventSession?.user?.id || null)) return;
              const syncPromise = syncSession(activeSession);
              setState({ playerIdentityPromise: syncPromise });
              await syncPromise;
            }, 0);
          });
        } catch (error) {
          console.warn('Player identity listener unavailable:', error);
        }
      }
      return promise;
    } catch (error) {
      console.warn('Player identity unavailable:', error);
      playerIdentityStatus.textContent = 'Guest mode ready • player saving will reconnect automatically';
      const fallbackPromise = Promise.resolve();
      setState({ playerIdentityPromise: fallbackPromise });
      return fallbackPromise;
    }
  }

  async function saveInitials(value) {
    const initials = cleanInitials(value);
    const { currentUser, playerProfile } = getState();
    if (!initials || !getClient() || !currentUser) throw new Error('Enter 1 to 3 letters or numbers');
    const saved = await profileService.saveInitials(currentUser, initials);
    const profile = { ...(playerProfile || {}), ...(saved || {}) };
    setState({ playerProfile: profile });
    render();
    return profile;
  }

  async function saveDisplayName(value) {
    const { currentUser, playerProfile } = getState();
    if (!getClient() || !currentUser || !playerProfile) throw new Error('Choose your arcade initials first');
    const displayName = cleanDisplayName(value);
    if (displayName && Array.from(displayName).length < 2) throw new Error('Display name must contain 2 to 20 characters');
    const saved = await profileService.saveDisplayName(currentUser, displayName);
    const profile = { ...playerProfile, display_name: saved?.display_name || null };
    setState({ playerProfile: profile });
    if (profile.display_name) completeDisplayNameInvitation();
    render();
    return profile.display_name;
  }

  function openPanel({ focusDisplayName = false } = {}) {
    getState().setDisplayNameInviteSuppressed?.(true);
    displayNameInvite.hidden = true;
    setPlayerMessage('');
    playerPanel.classList.add('visible');
    try { render(); } catch (error) { console.warn('Player panel render unavailable:', error); }
    if (focusDisplayName) requestAnimationFrame(() => {
      playerDisplayNameInput.focus({ preventScroll: true });
      playerDisplayNameInput.select();
    });
  }

  function closePanel() {
    playerPanel.classList.remove('visible');
    renderDisplayNameInvitation();
  }

  async function handleSaveInitials(value) {
    playerInitialsSave.disabled = true;
    setPlayerMessage('Saving player...');
    try {
      await getState().playerIdentityPromise;
      await saveInitials(value);
      playerInitialsInput.value = '';
      setPlayerMessage(`Player ${playerDisplayName()} created`);
      onIdentitySettled();
    } catch (error) {
      setPlayerMessage(isSchemaError(error) ? 'Leaderboard database update required' : (error.message || 'Could not save initials'), true);
    } finally {
      playerInitialsSave.disabled = false;
    }
  }

  async function handleSaveDisplayName(value) {
    playerDisplayNameSave.disabled = true;
    setPlayerMessage('Saving public display name...');
    try {
      await getState().playerIdentityPromise;
      const displayName = await saveDisplayName(value);
      setPlayerMessage(displayName ? `Display name saved as ${displayName}` : 'Public display name removed');
    } catch (error) {
      setPlayerMessage(isSchemaError(error) ? 'Display-name database update required' : (error.message || 'Could not save display name'), true);
    } finally {
      playerDisplayNameSave.disabled = false;
    }
  }

  function handleAutoSubmitChanged(enabled) {
    setState({ autoSubmitEnabled: enabled });
    localStorage.setItem('snake_auto_submit', String(enabled));
    setPlayerMessage(enabled ? 'Personal bests will submit automatically' : 'You will choose when to submit each score');
  }

  function validEmail() {
    const email = playerEmailInput.value.trim().toLowerCase();
    if (!/^\S+@\S+\.\S+$/.test(email)) throw new Error('Enter a valid email address');
    return email;
  }

  async function beginEmailCode(action) {
    if (!getClient()?.auth) return;
    const email = validEmail();
    playerSaveEmail.disabled = true;
    playerRestoreEmail.disabled = true;
    setPlayerMessage('Sending an 8-digit code...');
    try {
      await getState().playerIdentityPromise;
      if (action === 'save') {
        if (!getState().currentUser || isPermanentPlayer()) throw new Error('This player is already saved');
        await authService.saveEmail(email);
        setState({ pendingOtpType: 'email_change' });
      } else {
        await authService.sendRestoreCode(email);
        setState({ pendingOtpType: 'email' });
      }
      setState({ pendingOtpEmail: email });
      playerOtpInput.value = '';
      playerOtpGroup.classList.add('visible');
      setPlayerMessage(`Code sent to ${email}`);
      playerOtpInput.focus();
    } catch (error) {
      const fallback = action === 'save'
        ? 'Could not save this email. If it already has a player, use Restore Player.'
        : 'No saved player was found for that email.';
      setPlayerMessage(error.message || fallback, true);
    } finally {
      playerSaveEmail.disabled = false;
      playerRestoreEmail.disabled = false;
    }
  }

  async function verifyOtp(token) {
    const { pendingOtpEmail, pendingOtpType } = getState();
    if (!pendingOtpEmail || token.length !== 8) {
      setPlayerMessage('Enter the complete 8-digit code', true);
      return;
    }
    playerVerifyOtp.disabled = true;
    setPlayerMessage('Verifying...');
    try {
      const session = await authService.verifyCode({ email: pendingOtpEmail, token, type: pendingOtpType });
      const syncPromise = syncSession(session);
      setState({ playerIdentityPromise: syncPromise });
      await syncPromise;
      if (!getState().playerProfile && session?.user && getClient()?.auth?.getSession) {
        await new Promise(resolve => setTimeout(resolve, 0));
        let currentSession = null;
        try { currentSession = await authService.getSession(); } catch {}
        if (currentSession?.user?.id === session.user.id) {
          const retry = syncSession(currentSession);
          setState({ playerIdentityPromise: retry });
          await retry;
        }
      }
      playerOtpGroup.classList.remove('visible');
      playerOtpInput.value = '';
      setPlayerMessage(isPermanentPlayer() ? 'Player restored' : 'Email saved');
    } catch (error) {
      setPlayerMessage(error.message || 'Could not verify this code', true);
    } finally {
      playerVerifyOtp.disabled = false;
    }
  }

  if (displayNameInviteLater) displayNameInviteLater.addEventListener('click', snoozeDisplayNameInvitation);

  return {
    start, render, playerDisplayName, isPermanentPlayer, setPlayerMessage,
    saveInitials, saveDisplayName, openPanel, closePanel, handleSaveInitials,
    handleSaveDisplayName, handleAutoSubmitChanged, beginEmailCode, verifyOtp
  };
}
