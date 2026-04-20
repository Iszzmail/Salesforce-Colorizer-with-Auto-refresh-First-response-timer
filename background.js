// Background script: Manages Refresh, Notifications, Reminders, and Badge

chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.sync.set({
    refreshEnabled: false,
    refreshInterval: 5,
    targetTabId: null,
    isGloballyEnabled: true, theme: 'dark',
    enableActionNeeded: true, colorActionNeeded: '#ff4d4d',
    enablePlatinumSupport: true, colorPlatinumSupport: '#D4AF37',
    enableEmptyFirstResponse: true, colorEmptyFirstResponse: '#FFC0CB',
    enableJiraStatus: true, colorJiraStatus: '#ADD8E6',
    enableOldLastModified: true, colorOldLastModified: '#FFFFE0',
    accountRules: {},
    caseNotes: {},
    timerRules: [
      { mins: 15, color: '#ffff00' },
      { mins: 30, color: '#FFA500' },
      { mins: 45, color: '#ff4d4d' }
    ]
  });
  chrome.storage.local.set({ lastRefreshTime: null });
});

// --- MESSAGING LISTENER (From Content Script) ---
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.type === 'responded-count-update') {
        const count = request.count;
        const tabId = sender.tab.id;

        // Update Badge
        if (count > 0) {
            chrome.action.setBadgeText({ text: count.toString(), tabId: tabId });
            chrome.action.setBadgeBackgroundColor({ color: '#FF0000', tabId: tabId }); // Red background
            checkAndSendNotification(count, tabId);
        } else {
            chrome.action.setBadgeText({ text: '', tabId: tabId });
        }
    }
});

// --- NOTIFICATION LOGIC ---
let lastNotificationTime = 0;
const NOTIFICATION_COOLDOWN = 60 * 1000; // 1 minute cooldown to prevent spamming

function checkAndSendNotification(count, tabId) {
    const now = Date.now();
    // Only notify if enough time has passed since the last one
    if (now - lastNotificationTime > NOTIFICATION_COOLDOWN) {
        createNotification(count, tabId);
        lastNotificationTime = now;
    }
}

function createNotification(count, tabId) {
    let messageText = (count === "pending") 
        ? "Reminder: Check your cases!" 
        : `You have ${count} case(s) needing attention (Responded/Re-Opened)!`;

    chrome.notifications.create(`responded-alert-${tabId}-${Date.now()}`, {
        type: 'basic',
        iconUrl: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', // Transparent pixel, Chrome uses the extension icon
        title: 'Salesforce Case Alert',
        message: messageText,
        buttons: [
            { title: 'Go to Tab' },
            { title: 'Remind me in 5 mins' }
        ],
        priority: 2,
        requireInteraction: true // Keeps notification on screen until clicked
    });
}

// Handle Notification Button Clicks
chrome.notifications.onButtonClicked.addListener((notificationId, buttonIndex) => {
    const parts = notificationId.split('-');
    let tabId = parseInt(parts[2]);

    if (buttonIndex === 0) { // "Go to Tab"
        focusTab(tabId);
        chrome.notifications.clear(notificationId);
    } else if (buttonIndex === 1) { // "Remind me in 5 mins"
        chrome.alarms.create(`reminder-${tabId}`, { delayInMinutes: 5 });
        chrome.notifications.clear(notificationId);
    }
});

// Handle clicking the notification body
chrome.notifications.onClicked.addListener((notificationId) => {
    const parts = notificationId.split('-');
    let tabId = parseInt(parts[2]);
    focusTab(tabId);
    chrome.notifications.clear(notificationId);
});

function focusTab(tabId) {
    if (tabId) {
        chrome.tabs.update(tabId, { active: true });
        chrome.tabs.get(tabId, (tab) => {
            if (tab && tab.windowId) {
                chrome.windows.update(tab.windowId, { focused: true });
            }
        });
    } else {
        // Fallback: find any Salesforce tab if ID is lost
        chrome.tabs.query({ url: "https://*.lightning.force.com/*" }, (tabs) => {
            if (tabs.length > 0) {
                chrome.tabs.update(tabs[0].id, { active: true });
                chrome.windows.update(tabs[0].windowId, { focused: true });
            }
        });
    }
}

// --- ALARM LISTENER (Refresh & Reminders) ---
chrome.alarms.onAlarm.addListener((alarm) => {
    // 1. Handle Reminder Alarm
    if (alarm.name.startsWith('reminder-')) {
        const tabId = parseInt(alarm.name.split('-')[1]);
        createNotification("pending", tabId); 
    }
    
    // 2. Handle Auto-Refresh Alarm
    if (alarm.name === "salesforceRefresher") {
        chrome.storage.sync.get(["targetTabId", "refreshEnabled"], (settings) => {
            if (settings.refreshEnabled && settings.targetTabId) {
                chrome.tabs.get(settings.targetTabId, (tab) => {
                    if (chrome.runtime.lastError) {
                         disableTabRefresh(`Target tab ID ${settings.targetTabId} not found.`);
                    } else {
                        chrome.tabs.reload(tab.id, () => {
                            chrome.storage.local.set({ lastRefreshTime: new Date().toISOString() });
                        });
                    }
                });
            }
        });
    }
});

function disableTabRefresh(reason) {
  chrome.alarms.clear("salesforceRefresher");
  chrome.storage.sync.set({ refreshEnabled: false, targetTabId: null });
  console.log(`Salesforce Highlighter: Tab Auto-refresh disabled. ${reason}`);
}

// Disable refresh if tab is closed
chrome.tabs.onRemoved.addListener((tabId, removeInfo) => {
    chrome.storage.sync.get("targetTabId", (settings) => {
        if (settings.targetTabId === tabId) {
            disableTabRefresh("Target tab was closed.");
        }
    });
});