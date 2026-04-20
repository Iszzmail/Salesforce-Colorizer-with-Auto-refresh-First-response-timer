document.addEventListener('DOMContentLoaded', () => {
    const elements = {
        masterEnableToggle: document.getElementById('master-enable-toggle'),
        rulesContainer: document.getElementById('rules-container'),
        themeToggle: document.getElementById('theme-toggle'),
        applyRulesBtn: document.getElementById('apply-rules-button'),
        enableActionNeeded: document.getElementById('enable-action-needed'), colorActionNeeded: document.getElementById('color-action-needed'),
        enablePlatinumSupport: document.getElementById('enable-platinum-support'), colorPlatinumSupport: document.getElementById('color-platinum-support'),
        enableEmptyFirstResponse: document.getElementById('enable-empty-first-response'), colorEmptyFirstResponse: document.getElementById('color-empty-first-response'),
        enableJiraStatus: document.getElementById('enable-jira-status'), colorJiraStatus: document.getElementById('color-jira-status'),
        enableOldLastModified: document.getElementById('enable-old-last-modified'), colorOldLastModified: document.getElementById('color-old-last-modified'),
        accountNameInput: document.getElementById('account-name-input'), accountColorInput: document.getElementById('account-color-input'),
        addAccountRuleBtn: document.getElementById('add-account-rule'), accountRulesList: document.getElementById('account-rules-list'),
        refreshEnableToggle: document.getElementById('refresh-enable-toggle'), refreshControlsContainer: document.getElementById('refresh-controls-container'),
        decreaseIntervalBtn: document.getElementById('decrease-interval'), increaseIntervalBtn: document.getElementById('increase-interval'),
        refreshIntervalDisplay: document.getElementById('refresh-interval-display'), lastRefreshTime: document.getElementById('last-refresh-time'),
        clearAllNotesBtn: document.getElementById('clear-all-notes'),
        timerRulesList: document.getElementById('timer-rules-list'),
        timerMinsInput: document.getElementById('timer-mins-input'),
        timerColorInput: document.getElementById('timer-color-input'),
        addTimerRuleBtn: document.getElementById('add-timer-rule'),
    };

    const defaultSettings = {
        isGloballyEnabled: true, theme: 'dark',
        enableActionNeeded: true, colorActionNeeded: '#ff4d4d',
        enablePlatinumSupport: true, colorPlatinumSupport: '#D4AF37',
        enableEmptyFirstResponse: true, colorEmptyFirstResponse: '#FFC0CB',
        enableJiraStatus: true, colorJiraStatus: '#ADD8E6',
        enableOldLastModified: true, colorOldLastModified: '#FFFFE0',
        accountRules: {},
        caseNotes: {},
        refreshEnabled: false, refreshInterval: 5, targetTabId: null,
        timerRules: [
            { mins: 15, color: '#ffff00' },
            { mins: 30, color: '#FFA500' },
            { mins: 45, color: '#ff4d4d' }
        ]
    };

    function saveAllSettings() {
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            const currentTabId = tabs[0] ? tabs[0].id : null;
            if (!currentTabId) return;

            const isEnablingRefresh = elements.refreshEnableToggle.checked;

            chrome.storage.sync.get(defaultSettings, (existingSettings) => {
                const settingsToSave = {
                    isGloballyEnabled: elements.masterEnableToggle.checked,
                    theme: document.body.classList.contains('dark-mode') ? 'dark' : 'light',
                    enableActionNeeded: elements.enableActionNeeded.checked, colorActionNeeded: elements.colorActionNeeded.value,
                    enablePlatinumSupport: elements.enablePlatinumSupport.checked, colorPlatinumSupport: elements.colorPlatinumSupport.value,
                    enableEmptyFirstResponse: elements.enableEmptyFirstResponse.checked, colorEmptyFirstResponse: elements.colorEmptyFirstResponse.value,
                    enableJiraStatus: elements.enableJiraStatus.checked, colorJiraStatus: elements.colorJiraStatus.value,
                    enableOldLastModified: elements.enableOldLastModified.checked, colorOldLastModified: elements.colorOldLastModified.value,
                    accountRules: getAccountRulesFromDOM(),
                    timerRules: getTimerRulesFromDOM(),
                    caseNotes: existingSettings.caseNotes,
                    refreshEnabled: isEnablingRefresh,
                    refreshInterval: parseInt(elements.refreshIntervalDisplay.textContent, 10),
                    targetTabId: isEnablingRefresh ? currentTabId : null
                };
    
                chrome.storage.sync.set(settingsToSave, updateRefreshAlarm);
            });
        });
    }

    function renderTimerRules(rules) {
        elements.timerRulesList.innerHTML = '';
        const sorted = [...rules].sort((a, b) => a.mins - b.mins);
        sorted.forEach((rule, i) => {
            const item = document.createElement('div');
            item.className = 'timer-rule-item';
            item.innerHTML = `
                <span>After</span>
                <input class="timer-mins-input" type="number" min="1" value="${rule.mins}" data-index="${i}" />
                <span>mins</span>
                <input type="color" value="${rule.color}" data-index="${i}" class="timer-color-pick" />
                <button class="timer-rule-delete" data-index="${i}">&times;</button>`;
            item.querySelector('.timer-rule-delete').addEventListener('click', () => {
                const updated = getTimerRulesFromDOM();
                updated.splice(i, 1);
                renderTimerRules(updated);
                saveAllSettings();
            });
            item.querySelector('.timer-mins-input').addEventListener('change', () => saveAllSettings());
            item.querySelector('.timer-color-pick').addEventListener('change', () => saveAllSettings());
            elements.timerRulesList.appendChild(item);
        });
    }

    function getTimerRulesFromDOM() {
        const rules = [];
        elements.timerRulesList.querySelectorAll('.timer-rule-item').forEach(item => {
            const mins  = parseInt(item.querySelector('.timer-mins-input').value, 10);
            const color = item.querySelector('.timer-color-pick').value;
            if (mins > 0) rules.push({ mins, color });
        });
        return rules;
    }

    function loadSettings() {
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            const currentTabId = tabs[0] ? tabs[0].id : null;
            
            chrome.storage.sync.get(defaultSettings, (settings) => {
                elements.masterEnableToggle.checked = settings.isGloballyEnabled;
                updateUIAccessibility(settings.isGloballyEnabled);
                applyTheme(settings.theme);
                elements.themeToggle.checked = (settings.theme === 'light');
                elements.enableActionNeeded.checked = settings.enableActionNeeded; elements.colorActionNeeded.value = settings.colorActionNeeded;
                elements.enablePlatinumSupport.checked = settings.enablePlatinumSupport; elements.colorPlatinumSupport.value = settings.colorPlatinumSupport;
                elements.enableEmptyFirstResponse.checked = settings.enableEmptyFirstResponse; elements.colorEmptyFirstResponse.value = settings.colorEmptyFirstResponse;
                elements.enableJiraStatus.checked = settings.enableJiraStatus; elements.colorJiraStatus.value = settings.colorJiraStatus;
                elements.enableOldLastModified.checked = settings.enableOldLastModified; elements.colorOldLastModified.value = settings.colorOldLastModified;
                renderAccountRules(settings.accountRules);
                renderTimerRules(settings.timerRules || defaultSettings.timerRules);

                const isRefreshActiveOnThisTab = settings.refreshEnabled && settings.targetTabId === currentTabId;
                elements.refreshEnableToggle.checked = isRefreshActiveOnThisTab;
                elements.refreshIntervalDisplay.textContent = settings.refreshInterval;
                elements.refreshControlsContainer.classList.toggle('disabled', !isRefreshActiveOnThisTab);
                elements.refreshEnableToggle.disabled = (settings.refreshEnabled && !isRefreshActiveOnThisTab);
            });

            chrome.storage.local.get({ lastRefreshTime: null }, (data) => {
                elements.lastRefreshTime.textContent = data.lastRefreshTime ? new Date(data.lastRefreshTime).toLocaleTimeString() : 'Never';
            });
        });
    }

    function updateRefreshAlarm() {
        chrome.storage.sync.get(['refreshEnabled', 'refreshInterval', 'targetTabId'], (settings) => {
            chrome.alarms.clear("salesforceRefresher", () => {
                if (settings.refreshEnabled && settings.targetTabId) {
                    chrome.alarms.create("salesforceRefresher", { periodInMinutes: settings.refreshInterval });
                }
            });
        });
    }

    function updateUIAccessibility(isEnabled) { elements.rulesContainer.classList.toggle('disabled', !isEnabled); }
    function applyTheme(theme) { document.body.classList.remove('dark-mode', 'light-mode'); document.body.classList.add(theme === 'dark' ? 'dark-mode' : 'light-mode'); }

    function renderAccountRules(rules) {
        elements.accountRulesList.innerHTML = '';
        for (const name in rules) {
            const ruleItem = document.createElement('div');
            ruleItem.className = 'account-rule-item';
            ruleItem.dataset.name = name;
            ruleItem.innerHTML = `<div class="account-info"><div class="color-box" style="background-color: ${rules[name]};"></div><span>${name}</span></div><button class="delete-button" title="Delete Rule">&times;</button>`;
            ruleItem.querySelector('.delete-button').addEventListener('click', () => {
                delete rules[name];
                renderAccountRules(rules);
                saveAllSettings();
            });
            elements.accountRulesList.appendChild(ruleItem);
        }
    }

    function getAccountRulesFromDOM() {
        const rules = {};
        elements.accountRulesList.querySelectorAll('.account-rule-item').forEach(item => {
            rules[item.dataset.name] = item.querySelector('.color-box').style.backgroundColor;
        });
        return rules;
    }

    elements.masterEnableToggle.addEventListener('change', saveAllSettings);
    elements.themeToggle.addEventListener('change', () => { applyTheme(elements.themeToggle.checked ? 'light' : 'dark'); saveAllSettings(); });
    elements.refreshEnableToggle.addEventListener('change', () => { elements.refreshControlsContainer.classList.toggle('disabled', !elements.refreshEnableToggle.checked); saveAllSettings(); });
    elements.decreaseIntervalBtn.addEventListener('click', () => { let c = parseInt(elements.refreshIntervalDisplay.textContent, 10); if (c > 1) { elements.refreshIntervalDisplay.textContent = c - 1; saveAllSettings(); } });
    elements.increaseIntervalBtn.addEventListener('click', () => { elements.refreshIntervalDisplay.textContent = parseInt(elements.refreshIntervalDisplay.textContent, 10) + 1; saveAllSettings(); });
    elements.addAccountRuleBtn.addEventListener('click', () => { const name = elements.accountNameInput.value.trim(); if (name) { let r = getAccountRulesFromDOM(); r[name] = elements.accountColorInput.value; renderAccountRules(r); saveAllSettings(); elements.accountNameInput.value = ''; } });
    
    elements.applyRulesBtn.addEventListener('click', () => { 
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => { 
            if (tabs[0]) { 
                chrome.scripting.executeScript({ 
                    target: { tabId: tabs[0].id }, 
                    func: () => window.postMessage({ type: 'APPLY_RULES_NOW' }, '*') 
                }); 
            } 
        }); 
    });
    
    elements.addTimerRuleBtn.addEventListener('click', () => {
        const mins = parseInt(elements.timerMinsInput.value, 10);
        if (!mins || mins < 1) return;
        const color = elements.timerColorInput.value;
        const current = getTimerRulesFromDOM();
        current.push({ mins, color });
        renderTimerRules(current);
        saveAllSettings();
        elements.timerMinsInput.value = '';
    });

    elements.clearAllNotesBtn.addEventListener('click', () => {
        if (confirm("Delete ALL saved case notes?")) {
            chrome.storage.sync.get(defaultSettings, (settings) => {
                settings.caseNotes = {}; 
                chrome.storage.sync.set(settings, () => {
                    elements.applyRulesBtn.click();
                });
            });
        }
    });

    document.querySelectorAll('input[type="checkbox"], input[type="color"]').forEach(el => { if (!['theme-toggle', 'master-enable-toggle', 'refresh-enable-toggle'].includes(el.id)) { el.addEventListener('change', saveAllSettings); } });

    loadSettings();
});