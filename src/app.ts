import { exec, execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

export interface AppRuntimeDeps {
  state: {
    telegramBot?: any | null;
    registeredGroups: Record<string, any>;
    messageLoopRunning?: boolean;
    sock?: any;
    lidToPhoneMap?: Record<string, string>;
    groupSyncTimerStarted?: boolean;
    shuttingDown?: boolean;
    heartbeatLoopStarted?: boolean;
  };
  constants: {
    telegramBotToken?: string;
    telegramApiBaseUrl?: string;
    assistantName: string;
    triggerPattern: RegExp;
    storeDir?: string;
    groupSyncIntervalMs?: number;
    pollInterval?: number;
    heartbeatActiveHoursRaw?: string;
    heartbeatActiveHours?: unknown;
    dataDir?: string;
    fftProfile?: string;
    featureFarm?: boolean;
    farmStateEnabled?: boolean;
    profileDetection?: unknown;
    whatsappEnabled?: boolean;
    onboardingMode?: boolean;
    mainWorkspaceDir?: string;
  };
  createTelegramBot: (params: {
    token: string;
    apiBaseUrl?: string;
    assistantName: string;
    triggerPattern: RegExp;
  }) => any;
  refreshTelegramCommandMenus: () => Promise<void>;
  handleTelegramCallbackQuery: (event: any) => Promise<void>;
  handleTelegramSetupInput: (event: any) => Promise<boolean>;
  handleTelegramCommand: (event: any) => Promise<boolean>;
  storeChatMetadata: (
    chatJid: string,
    timestamp: string,
    chatName?: string,
  ) => void;
  maybeRegisterTelegramChat: (chatJid: string, chatName: string) => boolean;
  isMainChat: (chatJid: string) => boolean;
  persistTelegramMedia: (event: any) => Promise<string>;
  storeTextMessage: (message: any) => void;
  logger: {
    info?: (payload: unknown, message?: string) => void;
    debug?: (payload: unknown, message?: string) => void;
    error?: (payload: unknown, message?: string) => void;
    warn?: (payload: unknown, message?: string) => void;
    fatal?: (payload: unknown, message?: string) => void;
  };
  useMultiFileAuthState?: (
    authDir: string,
  ) => Promise<{ state: any; saveCreds: () => void }>;
  makeWASocket?: (params: any) => any;
  makeCacheableSignalKeyStore?: (keys: any, logger: any) => any;
  browsers?: { macOS: (name: string) => unknown };
  disconnectReason?: { loggedOut: number };
  sendMessage?: (chatJid: string, text: string) => Promise<boolean>;
  maybeRegisterWhatsAppMainChat?: () => void;
  syncGroupMetadata?: (force?: boolean) => Promise<void>;
  startSchedulerLoop?: (params: any) => void;
  startIpcWatcher?: () => void;
  startMessageLoop?: () => Promise<void>;
  requestHeartbeatNow?: (reason?: string) => void;
  storeMessage?: (
    message: any,
    chatJid: string,
    fromMe: boolean,
    senderName?: string,
  ) => void;
  translateJid?: (jid: string) => string;
  processMessage?: (msg: any) => Promise<boolean>;
  getNewMessages?: (
    jids: string[],
    lastTimestamp: string,
    assistantName: string,
  ) => { messages: any[] };
  lastTimestamp?: () => string;
  setLastTimestamp?: (value: string) => void;
  saveState?: () => void;
  isWithinHeartbeatActiveHoursInvalid?: boolean;
  acquireSingletonLock?: (lockPath: string) => void;
  ensureContainerSystemRunning?: () => void;
  initDatabase?: () => void;
  loadState?: () => void;
  migrateLegacyClaudeMemoryFiles?: () => void;
  migrateCompactionSummariesFromSoul?: () => void;
  maybePromoteConfiguredTelegramMain?: () => void;
  startTuiGatewayService?: () => Promise<void>;
  startWebControlCenterService?: () => Promise<void>;
  stopTuiGatewayService?: () => Promise<void>;
  stopWebControlCenterService?: () => Promise<void>;
  startHalUiService?: () => Promise<void>;
  stopHalUiService?: () => Promise<void>;
  startFarmStateCollector?: () => void;
  stopFarmStateCollector?: () => void;
  startHeartbeatLoop?: () => void;
  maybeRunBootMdOnce?: () => void;
  getContainerRuntime?: () => string;
}

export function createAppRuntime(deps: AppRuntimeDeps): {
  startTelegram: () => Promise<void>;
  connectWhatsApp: () => Promise<void>;
  startMessageLoop: () => Promise<void>;
  ensureContainerSystemRunning: () => void;
  stopFarmServicesForShutdown: (signal: string) => void;
  shutdownAndExit: (signal: string, exitCode: number) => Promise<void>;
  registerShutdownHandlers: () => void;
  main: () => Promise<void>;
} {
  async function startTelegram(): Promise<void> {
    if (!deps.constants.telegramBotToken) return;
    if (deps.state.telegramBot) return;

    deps.state.telegramBot = deps.createTelegramBot({
      token: deps.constants.telegramBotToken,
      apiBaseUrl: deps.constants.telegramApiBaseUrl,
      assistantName: deps.constants.assistantName,
      triggerPattern: deps.constants.triggerPattern,
    });

    const callbackLocks = new Map<string, Promise<void>>();

    deps.state.telegramBot.startPolling(async (event: any) => {
      try {
        deps.logger.debug?.(
          {
            kind: event.kind,
            chatJid: event.chatJid,
            contentLength: event.content?.length,
          },
          'Telegram event received from polling',
        );

        if (event.kind === 'callback_query') {
          const chatJid = event.chatJid as string;
          const previous = callbackLocks.get(chatJid) ?? Promise.resolve();
          const next = previous
            .then(() => deps.handleTelegramCallbackQuery(event))
            .catch((err) => {
              deps.logger.error?.(
                { err, chatJid, eventKind: event.kind },
                'Unhandled exception in Telegram callback query handler',
              );
            })
            .finally(() => {
              if (callbackLocks.get(chatJid) === next) {
                callbackLocks.delete(chatJid);
              }
            });
          callbackLocks.set(chatJid, next);
          return;
        }

        const m = event;
        deps.storeChatMetadata(m.chatJid, m.timestamp, m.chatName);
        const didRegister = deps.maybeRegisterTelegramChat(
          m.chatJid,
          m.chatName,
        );
        if (didRegister && deps.isMainChat(m.chatJid)) {
          await deps.refreshTelegramCommandMenus();
        }
        if (await deps.handleTelegramSetupInput(m)) return;
        if (await deps.handleTelegramCommand(m)) return;
        if (deps.state.registeredGroups[m.chatJid]) {
          const finalContent = m.media
            ? await deps.persistTelegramMedia(m)
            : m.content;
          deps.storeTextMessage({
            id: m.id,
            chatJid: m.chatJid,
            sender: m.sender,
            senderName: m.senderName,
            content: finalContent,
            timestamp: m.timestamp,
            isFromMe: false,
          });
        }
      } catch (err) {
        deps.logger.error?.(
          { err, eventKind: event.kind, chatJid: event.chatJid },
          'Unhandled exception in Telegram polling callback',
        );
      }
    });

    deps.logger.info?.('Telegram polling started');
    void deps.refreshTelegramCommandMenus();
  }

  async function connectWhatsApp(): Promise<void> {
    if (
      !deps.useMultiFileAuthState ||
      !deps.makeWASocket ||
      !deps.makeCacheableSignalKeyStore
    ) {
      throw new Error('WhatsApp runtime dependencies are not configured');
    }
    const authDir = path.join(deps.constants.storeDir || 'data', 'auth');
    fs.mkdirSync(authDir, { recursive: true });
    const { state: authState, saveCreds } =
      await deps.useMultiFileAuthState(authDir);

    deps.state.sock = deps.makeWASocket({
      auth: {
        creds: authState.creds,
        keys: deps.makeCacheableSignalKeyStore(authState.keys, deps.logger),
      },
      printQRInTerminal: false,
      logger: deps.logger,
      browser: deps.browsers?.macOS('Chrome'),
    });

    deps.state.sock.ev.on('connection.update', (update: any) => {
      const { connection, lastDisconnect, qr } = update;
      if (qr) {
        const msg = 'WhatsApp authentication required. Run: npm run auth';
        deps.logger.error?.(msg);
        if (process.platform === 'darwin') {
          exec(
            `osascript -e 'display notification "${msg}" with title "FarmPal" sound name "Basso"'`,
          );
        }
        setTimeout(() => process.exit(1), 1000);
      }

      if (connection === 'close') {
        const reason = (
          lastDisconnect?.error as
            | { output?: { statusCode?: number } }
            | undefined
        )?.output?.statusCode;
        const shouldReconnect = reason !== deps.disconnectReason?.loggedOut;
        deps.logger.info?.({ reason, shouldReconnect }, 'Connection closed');
        if (shouldReconnect) {
          deps.logger.info?.('Reconnecting...');
          void connectWhatsApp();
        } else {
          deps.logger.info?.('Logged out. Run /setup to re-authenticate.');
          process.exit(0);
        }
      } else if (connection === 'open') {
        deps.logger.info?.('Connected to WhatsApp');
        deps.state.sock
          .sendPresenceUpdate('available')
          .catch((err: unknown) => {
            deps.logger.debug?.(
              { err },
              'Failed to set initial available presence',
            );
          });
        if (deps.state.sock.user) {
          const phoneUser = deps.state.sock.user.id.split(':')[0];
          const lidUser = deps.state.sock.user.lid?.split(':')[0];
          if (lidUser && phoneUser) {
            deps.state.lidToPhoneMap ||= {};
            deps.state.lidToPhoneMap[lidUser] = `${phoneUser}@s.whatsapp.net`;
            deps.logger.debug?.(
              { lidUser, phoneUser },
              'LID to phone mapping set',
            );
          }
        }
        deps.maybeRegisterWhatsAppMainChat?.();
        deps
          .syncGroupMetadata?.()
          .catch((err) =>
            deps.logger.error?.({ err }, 'Initial group sync failed'),
          );
        if (!deps.state.groupSyncTimerStarted) {
          deps.state.groupSyncTimerStarted = true;
          setInterval(
            () => {
              deps
                .syncGroupMetadata?.()
                .catch((err) =>
                  deps.logger.error?.({ err }, 'Periodic group sync failed'),
                );
            },
            deps.constants.groupSyncIntervalMs || 24 * 60 * 60 * 1000,
          );
        }
        deps.startSchedulerLoop?.({
          sendMessage: deps.sendMessage,
          registeredGroups: () => deps.state.registeredGroups,
          requestHeartbeatNow: deps.requestHeartbeatNow,
        });
        deps.startIpcWatcher?.();
        void deps
          .startMessageLoop?.()
          .catch((err) =>
            deps.logger.fatal?.({ err }, 'Message loop crashed unexpectedly'),
          );
      }
    });

    deps.state.sock.ev.on('creds.update', saveCreds);
    deps.state.sock.ev.on(
      'messages.upsert',
      ({ messages }: { messages: any[] }) => {
        for (const msg of messages) {
          if (!msg.message) continue;
          const rawJid = msg.key.remoteJid;
          if (!rawJid || rawJid === 'status@broadcast') continue;
          const chatJid = deps.translateJid
            ? deps.translateJid(rawJid)
            : rawJid;
          const timestamp = new Date(
            Number(msg.messageTimestamp) * 1000,
          ).toISOString();
          deps.storeChatMetadata(chatJid, timestamp);
          if (deps.state.registeredGroups[chatJid]) {
            deps.storeMessage?.(
              msg,
              chatJid,
              msg.key.fromMe || false,
              msg.pushName || undefined,
            );
          }
        }
      },
    );
  }

  async function startMessageLoop(): Promise<void> {
    if (deps.state.messageLoopRunning) {
      deps.logger.debug?.(
        'Message loop already running, skipping duplicate start',
      );
      return;
    }
    deps.state.messageLoopRunning = true;
    deps.logger.info?.(
      `FarmPal running (trigger: @${deps.constants.assistantName})`,
    );
    while (true) {
      try {
        const jids = Object.keys(deps.state.registeredGroups);
        const { messages } = deps.getNewMessages
          ? deps.getNewMessages(
              jids,
              deps.lastTimestamp?.() || '',
              deps.constants.assistantName,
            )
          : { messages: [] };
        if (messages.length > 0) {
          deps.logger.info?.({ count: messages.length }, 'New messages');
        }
        for (const msg of messages) {
          try {
            const processed = await deps.processMessage?.(msg);
            if (!processed) {
              deps.logger.debug?.(
                { msgId: msg.id, chatJid: msg.chat_jid },
                'Message processing deferred; retrying on next poll loop',
              );
              break;
            }
            deps.setLastTimestamp?.(msg.timestamp);
            deps.saveState?.();
          } catch (err) {
            deps.logger.error?.(
              { err, msg: msg.id },
              'Error processing message, will retry',
            );
            break;
          }
        }
      } catch (err) {
        deps.logger.error?.({ err }, 'Error in message loop');
      }
      await new Promise((resolve) =>
        setTimeout(resolve, deps.constants.pollInterval || 1000),
      );
    }
  }

  function ensureContainerSystemRunning(): void {
    const runtime = deps.getContainerRuntime?.() || 'docker';
    if (runtime === 'host') {
      if (
        (process.env.NODE_ENV || '').toLowerCase() === 'production' &&
        !['1', 'true', 'yes', 'on'].includes(
          (process.env.FFT_NANO_ALLOW_HOST_RUNTIME_IN_PROD || '').toLowerCase(),
        )
      ) {
        throw new Error(
          'Host runtime is blocked in production unless FFT_NANO_ALLOW_HOST_RUNTIME_IN_PROD=1',
        );
      }
      deps.logger.warn?.(
        'Running in host runtime mode (no container isolation). This should only be used for trusted local workflows.',
      );
      return;
    }
    try {
      execSync('docker info', { stdio: 'pipe' });
      deps.logger.debug?.('Docker runtime available');
    } catch (err) {
      deps.logger.error?.({ err }, 'Docker runtime not available');
      console.error(
        '\n╔════════════════════════════════════════════════════════════════╗',
      );
      console.error(
        '║  FATAL: Docker is required but is not available               ║',
      );
      console.error(
        '║                                                                ║',
      );
      console.error(
        '║  To fix:                                                       ║',
      );
      console.error(
        '║  1. Install Docker (Desktop on macOS, engine on Linux/RPi)     ║',
      );
      console.error(
        '║  2. Start the Docker daemon                                    ║',
      );
      console.error(
        '║  3. Restart FarmPal                                           ║',
      );
      console.error(
        '╚════════════════════════════════════════════════════════════════╝\n',
      );
      throw new Error('Docker is required but not available');
    }
    try {
      const output = execSync(
        "docker ps -a --filter status=exited --filter name=nanoclaw- --format '{{.Names}}'",
        { stdio: ['pipe', 'pipe', 'pipe'], encoding: 'utf-8' },
      );
      const stale = output
        .split('\n')
        .map((n) => n.trim())
        .filter((n) => n.startsWith('nanoclaw-'));
      if (stale.length > 0) {
        execSync(`docker rm ${stale.join(' ')}`, { stdio: 'pipe' });
        deps.logger.info?.(
          { runtime, count: stale.length },
          'Cleaned up stale containers',
        );
      }
    } catch {
      // Ignore cleanup failures.
    }
  }

  function stopFarmServicesForShutdown(signal: string): void {
    if (deps.state.shuttingDown) return;
    deps.state.shuttingDown = true;
    deps.logger.info?.({ signal }, 'Shutting down FarmPal services');
    if (deps.constants.featureFarm && deps.constants.farmStateEnabled) {
      deps.stopFarmStateCollector?.();
    }
  }

  let halPollTimer: ReturnType<typeof setInterval> | null = null;
  let halAlertTimer: ReturnType<typeof setInterval> | null = null;

  async function shutdownAndExit(
    signal: string,
    exitCode: number,
  ): Promise<void> {
    stopFarmServicesForShutdown(signal);
    deps.state.telegramBot?.stopAllTypingLoops?.();
    if (halPollTimer) {
      clearInterval(halPollTimer);
      halPollTimer = null;
    }
    if (halAlertTimer) {
      clearInterval(halAlertTimer);
      halAlertTimer = null;
    }
    // Stop watchdog
    try {
      const { stopWatchdog } = await import('./safety/estop.js');
      stopWatchdog();
    } catch {
      // Ignore errors stopping watchdog
    }
    await deps.stopWebControlCenterService?.();
    await deps.stopTuiGatewayService?.();
    await deps.stopHalUiService?.();
    process.exit(exitCode);
  }

  function registerShutdownHandlers(): void {
    process.on('SIGINT', () => {
      void shutdownAndExit('SIGINT', 0);
    });
    process.on('SIGTERM', () => {
      void shutdownAndExit('SIGTERM', 0);
    });
  }

  async function main(): Promise<void> {
    registerShutdownHandlers();
    if (
      deps.constants.heartbeatActiveHoursRaw?.trim() &&
      deps.isWithinHeartbeatActiveHoursInvalid
    ) {
      deps.logger.warn?.(
        { value: deps.constants.heartbeatActiveHoursRaw },
        'Ignoring invalid heartbeat active-hours format; expected HH:MM-HH:MM, Mon-Fri@HH:MM-HH:MM, or HH:MM-HH:MM@America/New_York',
      );
    }
    if (deps.constants.dataDir) {
      deps.acquireSingletonLock?.(
        path.join(deps.constants.dataDir, 'farmpal.lock'),
      );
    }
    deps.ensureContainerSystemRunning?.();
    deps.initDatabase?.();
    deps.logger.info?.('Database initialized');

    // First-boot provisioning check
    // VAL-IMG-006: Auto-detect unprovisioned state and enter provisioning mode
    // VAL-IMG-014: Power loss mid-provisioning → clean restart to provisioning
    // VAL-IMG-015: Multiple provisioning attempts handled idempotently
    // VAL-IMG-021: Power loss mid-decision-cycle → re-issue safe states
    let cycleInterrupted = false;
    let interruptedCycleData: {
      cycleId: string;
      activeRelays: string[];
    } | null = null;
    try {
      const {
        getProvisioningManager,
        needsProvisioning,
        handleStartupRecovery,
      } = await import('./first-boot.js');
      const mgr = getProvisioningManager();

      // VAL-IMG-021: Call handleStartupRecovery and use its return value
      const recovery = handleStartupRecovery();

      if (recovery.provisioningInterrupted) {
        deps.logger.warn?.(
          { startedAt: recovery.provisioningState?.startedAt },
          '[first-boot] Power loss during provisioning detected — will restart provisioning',
        );
      }

      if (recovery.cycleInterrupted) {
        const cycleData = mgr.loadInterruptedCycle();
        deps.logger.warn?.(
          { cycle: cycleData },
          '[first-boot] Power loss during decision cycle detected — will re-issue safe states',
        );
        // VAL-IMG-021: Re-issue safe states to all relays that were active
        cycleInterrupted = true;
        interruptedCycleData = cycleData;
      }

      if (needsProvisioning()) {
        deps.logger.info?.(
          '[first-boot] System is unprovisioned — provisioning mode active',
        );
      } else {
        deps.logger.info?.('[first-boot] System is provisioned');
      }

      // VAL-IMG-011: Display IP on console when no network (no mDNS)
      const networkInfo = mgr.getNetworkInfo();
      if (networkInfo.primaryIp && !mgr.isAvahiRunning()) {
        mgr.displayIpOnConsole(networkInfo.primaryIp, networkInfo.hostname);
      }
    } catch (err) {
      deps.logger.warn?.(
        { err },
        '[first-boot] Provisioning check failed — continuing anyway',
      );
    }

    // Initialize HAL subsystem (hardware abstraction layer)
    try {
      const { runMigrations: halRunMigrations } = await import('./hal/db.js');
      const { halRegistry: halReg } = await import('./hal/registry.js');
      halRunMigrations();
      deps.logger.info?.('[HAL] Database migrated');

      if (process.env.HAL_SIM_MODE === '1') {
        // Digital Twin Runtime — live simulation, no real hardware
        const { startSimulator } = await import('./hal/simulator.js');
        startSimulator({
          tickMs: parseInt(process.env.HAL_SIM_TICK_MS || '5000', 10),
          speed: parseFloat(process.env.HAL_SIM_SPEED || '1'),
          seed: parseInt(process.env.HAL_SIM_SEED || '42', 10),
          scenario: (process.env.HAL_SIM_SCENARIO as any) || 'normal_day',
        });
        deps.logger.info?.('[HAL] Simulator started (HAL_SIM_MODE=1)');
      } else {
        // Real hardware mode
        if (process.env.MQTT_BROKER_URL) {
          const { mqttSubscriber } = await import('./hal/mqtt.js');
          await mqttSubscriber.start();
          deps.logger.info?.('[HAL] MQTT subscriber started');
        }
        await halReg.poll();
        deps.logger.info?.('[HAL] Initial device poll complete');
      }

      // Seed static demo data for history/charts (idempotent — won't duplicate)
      const { seedHalDemoData } = await import('./hal/seed-data.js');
      seedHalDemoData();
      deps.logger.info?.('[HAL] Demo data seeded');

      // Initialize Emergency Stop system and start watchdog
      try {
        const { startWatchdog, initializeDefaultSafeStates, getEstopState } =
          await import('./safety/estop.js');
        initializeDefaultSafeStates();
        startWatchdog();
        const estopState = getEstopState();
        if (estopState.active) {
          deps.logger.warn?.(
            { activatedAt: estopState.activatedAt, reason: estopState.reason },
            '[Safety] E-Stop is ACTIVE on startup — autonomous control suspended',
          );
        } else {
          deps.logger.info?.('[Safety] E-Stop system initialized');
        }
      } catch (err) {
        deps.logger.warn?.(
          { err },
          '[Safety] E-Stop/Watchdog initialization failed — continuing without safety watchdog',
        );
      }

      // VAL-IMG-021: Re-issue safe states to relays that were active when cycle was interrupted
      if (
        cycleInterrupted &&
        interruptedCycleData &&
        interruptedCycleData.activeRelays.length > 0
      ) {
        deps.logger.info?.(
          { relays: interruptedCycleData.activeRelays },
          '[first-boot] Re-issuing safe states to interrupted relays',
        );
        try {
          const { halRegistry: halReg } = await import('./hal/registry.js');
          for (const relayId of interruptedCycleData.activeRelays) {
            try {
              await halReg.control(relayId, 'off');
              deps.logger.info?.(
                { relayId },
                '[first-boot] Set relay to safe state (off)',
              );
            } catch (relayErr) {
              deps.logger.warn?.(
                { relayId, err: relayErr },
                '[first-boot] Failed to set relay safe state',
              );
            }
          }
          // Clear the interrupted cycle marker after safe states are issued
          const { getProvisioningManager } = await import('./first-boot.js');
          getProvisioningManager().clearInterruptedCycle();
          deps.logger.info?.('[first-boot] Interrupted cycle marker cleared');
        } catch (err) {
          deps.logger.warn?.(
            { err },
            '[first-boot] Failed to re-issue relay safe states',
          );
        }
      }

      await deps.startHalUiService?.();
    } catch (err) {
      deps.logger.error?.({ err }, '[HAL] Init error — continuing without HAL');
    }

    // Periodic HAL poll every 5 minutes (skip in sim mode — simulator handles its own loop)
    halPollTimer = setInterval(
      async () => {
        try {
          if (process.env.HAL_SIM_MODE === '1') {
            // Simulator runs its own tick loop; just trigger decision cycle if enabled
            if (process.env.HAL_AUTO_DECISIONS === 'true') {
              const { runDecisionCycle } =
                await import('./agent/decision-loop.js');
              await runDecisionCycle({ trigger: 'heartbeat' });
            }
            return;
          }
          const { halRegistry: halReg } = await import('./hal/registry.js');
          await halReg.poll();
          if (process.env.HAL_AUTO_DECISIONS === 'true') {
            const { runDecisionCycle } =
              await import('./agent/decision-loop.js');
            await runDecisionCycle({ trigger: 'heartbeat' });
          }
        } catch (err) {
          deps.logger.error?.({ err }, '[HAL] Periodic poll error');
        }
      },
      5 * 60 * 1000,
    );
    halPollTimer.unref?.();

    // HAL alert evaluator — check sensor thresholds every minute
    halAlertTimer = setInterval(async () => {
      try {
        const { evaluateHalAlerts } = await import('./hal/alert-evaluator.js');
        const alerts = await evaluateHalAlerts();
        if (alerts.length > 0) {
          for (const alert of alerts) {
            deps.logger.info?.(
              {
                alertId: alert.id,
                deviceId: alert.deviceId,
                metric: alert.metric,
              },
              'HAL alert fired',
            );
          }
        }
      } catch (err) {
        deps.logger.error?.({ err }, '[HAL] Alert evaluation error');
      }
    }, 60_000);
    halAlertTimer.unref?.();

    deps.loadState?.();
    deps.migrateLegacyClaudeMemoryFiles?.();
    deps.migrateCompactionSummariesFromSoul?.();
    deps.maybePromoteConfiguredTelegramMain?.();
    await deps.startTuiGatewayService?.();
    await deps.startWebControlCenterService?.();
    deps.logger.info?.(
      {
        profile: deps.constants.fftProfile,
        featureFarm: deps.constants.featureFarm,
        profileDetection: deps.constants.profileDetection,
      },
      'Runtime profile resolved',
    );
    if (deps.constants.featureFarm && deps.constants.farmStateEnabled) {
      deps.startFarmStateCollector?.();
    }
    if (deps.constants.onboardingMode) {
      deps.logger.info?.(
        'Running in onboarding-only mode (web/TUI enabled, channels deferred)',
      );
      deps.maybeRunBootMdOnce?.();
      return;
    }
    const telegramEnabled = !!deps.constants.telegramBotToken;
    const farmOnlyMode =
      !!deps.constants.featureFarm &&
      deps.constants.whatsappEnabled === false &&
      !telegramEnabled;
    if (
      deps.constants.whatsappEnabled === false &&
      !telegramEnabled &&
      !farmOnlyMode
    ) {
      throw new Error(
        'No channels enabled. Set WHATSAPP_ENABLED=1 and/or TELEGRAM_BOT_TOKEN.',
      );
    }
    if (telegramEnabled) {
      await startTelegram();
    }
    if (telegramEnabled || deps.constants.whatsappEnabled === false) {
      deps.startSchedulerLoop?.({
        sendMessage: deps.sendMessage,
        registeredGroups: () => deps.state.registeredGroups,
        requestHeartbeatNow: deps.requestHeartbeatNow,
      });
      deps.startIpcWatcher?.();
      deps.startHeartbeatLoop?.();
      void startMessageLoop().catch((err) =>
        deps.logger.fatal?.({ err }, 'Message loop crashed unexpectedly'),
      );
    }
    if (farmOnlyMode) {
      deps.logger.info?.(
        'Running in local FarmPal mode (dashboard/TUI enabled, no chat channels enabled)',
      );
    } else if (deps.constants.whatsappEnabled) {
      await connectWhatsApp();
      deps.startHeartbeatLoop?.();
    } else {
      deps.logger.info?.('WhatsApp disabled (WHATSAPP_ENABLED=0)');
    }
    deps.maybeRunBootMdOnce?.();
  }

  return {
    startTelegram,
    connectWhatsApp,
    startMessageLoop,
    ensureContainerSystemRunning,
    stopFarmServicesForShutdown,
    shutdownAndExit,
    registerShutdownHandlers,
    main,
  };
}
