let settings = {};
let headerIndices = {};
let allCaseNotes = {};
let slaInterval = null; // Store interval for timers

// --- Note Popover Logic ---
function createNotePopover() {
    if (document.getElementById('case-note-popover')) return;

    const popoverHTML = `
        <div id="case-note-popover" class="note-popover" style="display: none; position: absolute; z-index: 9002;">
            <div id="case-note-popover-content" class="note-popover-content">
                <h3 id="case-note-popover-title">Case Notes for: 000000</h3>
                <textarea id="case-note-popover-textarea" placeholder="Add your notes here..."></textarea>
                <div class="note-popover-actions">
                    <button id="case-note-popover-save" class="note-popover-button note-popover-save">Save</button>
                    <button id="case-note-popover-close" class="note-popover-button note-popover-close">Close</button>
                </div>
            </div>
        </div>
    `;
    document.body.insertAdjacentHTML('beforeend', popoverHTML);

    document.getElementById('case-note-popover-close').addEventListener('click', hideNotePopover);
    document.getElementById('case-note-popover-save').addEventListener('click', saveCurrentNote);

    document.addEventListener('mousedown', (e) => {
        const popover = document.getElementById('case-note-popover');
        if (!popover || popover.style.display === 'none') return;
        const isNoteButton = e.target.closest('.note-icon-btn');
        const isInsidePopover = e.target.closest('#case-note-popover');
        if (!isNoteButton && !isInsidePopover) hideNotePopover();
    }, true);
}

function showNotePopover(caseNumber, buttonElement) {
    const popover = document.getElementById('case-note-popover');
    const modalTitle = document.getElementById('case-note-popover-title');
    const modalTextarea = document.getElementById('case-note-popover-textarea');

    if (popover.style.display === 'block' && popover.dataset.caseNumber === caseNumber) {
        hideNotePopover();
        return;
    }

    modalTitle.textContent = `Case Notes for: ${caseNumber}`;
    modalTextarea.value = allCaseNotes[caseNumber] || '';
    popover.dataset.caseNumber = caseNumber; 
    
    const rect = buttonElement.getBoundingClientRect();
    const popoverWidth = 400; 
    const popoverHeight = 250; 

    let top = window.scrollY + rect.bottom + 5;
    let left = window.scrollX + rect.left;

    if (left + popoverWidth > window.innerWidth) left = window.scrollX + rect.right - popoverWidth;
    if (top + popoverHeight > window.innerHeight + window.scrollY) top = window.scrollY + rect.top - popoverHeight - 5;

    popover.style.top = `${top}px`;
    popover.style.left = `${left}px`;
    popover.style.display = 'block';
    modalTextarea.focus();
}

function hideNotePopover() {
    const popover = document.getElementById('case-note-popover');
    if (popover) popover.style.display = 'none';
}

function saveCurrentNote() {
    const popover = document.getElementById('case-note-popover');
    const caseNumber = popover.dataset.caseNumber;
    const noteText = document.getElementById('case-note-popover-textarea').value;

    if (!caseNumber) return;

    allCaseNotes[caseNumber] = noteText.trim();

    chrome.storage.sync.get(['caseNotes'], (data) => {
        let notes = data.caseNotes || {};
        if (noteText.trim() === '') delete notes[caseNumber];
        else notes[caseNumber] = noteText.trim();
        
        chrome.storage.sync.set({ ...settings, caseNotes: notes }, () => {
            hideNotePopover();
            processViews();
        });
    });
}

// --- Date Parsing ---
function parseSalesforceDate(dateString) {
    if (!dateString || typeof dateString !== 'string') { return null; }
    // Match "Today at 1:11 PM"
    const todayMatch = dateString.match(/today at (\d{1,2}):(\d{2})\s*(am|pm)/i);
    if (todayMatch) {
        let [, hours, minutes, period] = todayMatch;
        hours = parseInt(hours, 10);
        if (period.toLowerCase() === 'pm' && hours < 12) { hours += 12; }
        if (period.toLowerCase() === 'am' && hours === 12) { hours = 0; }
        const date = new Date();
        date.setHours(hours, parseInt(minutes, 10), 0, 0);
        return date;
    }
    // Match "1/24/2026 1:11 PM" or "1/24/2026, 1:11 PM"
    const fullDateMatch = dateString.match(/(\d{1,2})\/(\d{1,2})\/(\d{4}),?\s*(\d{1,2}):(\d{2})\s*(am|pm)/i);
    if (fullDateMatch) {
        let [, month, day, year, hours, minutes, period] = fullDateMatch;
        hours = parseInt(hours, 10);
        if (period.toLowerCase() === 'pm' && hours < 12) { hours += 12; }
        if (period.toLowerCase() === 'am' && hours === 12) { hours = 0; }
        return new Date(year, month - 1, day, hours, minutes);
    }
    return null;
}

// --- SLA Timer Logic ---
function formatElapsed(minutes) {
    if (minutes < 60) return `${minutes} min`;
    const h = Math.floor(minutes / 60);
    if (h < 24) {
        const m = minutes % 60;
        return m === 0 ? `${h} hr` : `${h} hr ${m} min`;
    }
    const d = Math.floor(h / 24);
    const remainingH = h % 24;
    return remainingH === 0 ? `${d} days` : `${d} days ${remainingH} hr`;
}

function getTimerColor(minutes) {
    const rules = (settings.timerRules || []).slice().sort((a, b) => b.mins - a.mins);
    for (const rule of rules) {
        if (minutes >= rule.mins) return rule.color;
    }
    return null;
}

function updateSlaTimers() {
    if (!chrome.runtime?.id) {
        if (slaInterval) clearInterval(slaInterval);
        return;
    }
    const timerElements = document.querySelectorAll('.sla-timer-badge');
    if (timerElements.length === 0) return;

    const now = new Date();
    pauseObserver();
    timerElements.forEach(el => {
        const openedTime = parseInt(el.dataset.openedTime, 10);
        const minutes = Math.floor((now.getTime() - openedTime) / 60000);
        el.textContent = formatElapsed(minutes);
        const color = getTimerColor(minutes);
        el.style.backgroundColor = color || '#4bca81';
        el.style.color = 'white';
    });
    resumeObserver();
}

function startTimerLoop() {
    if (slaInterval) clearInterval(slaInterval);
    updateSlaTimers();
    slaInterval = setInterval(updateSlaTimers, 60000);
}

// --- Main Processing ---

function getHeaderIndices(table) {
    const indices = {};
    const headers = table.querySelectorAll('thead th');
    headers.forEach((th, index) => {
        const text = (th.getAttribute('aria-label') || th.textContent).trim();
        
        if (text.includes('Account Support Tier')) indices.supportTier = index;
        if (text.includes('Account Name')) indices.accountName = index;
        if (text.includes('First Response')) indices.firstResponse = index;
        if (text === 'Status') indices.status = index;
        if (text.includes('JIRA Status')) indices.jiraStatus = index;
        if (text.includes('Last Modified Date')) indices.lastModified = index;
        if (text.includes('Case Number')) indices.caseNumber = index;
        if (text.includes('Subject')) indices.subject = index;
        // Detect Date/Time Opened for Timers
        if (text.includes('Date/Time Opened') || text.includes('Opened Date')) indices.dateOpened = index;
    });
    return indices;
}

function applyStylingAndNotes(row) {
    if (!row) return false;
    
    // --- Reset Styles ---
    row.style.backgroundColor = '';
    row.classList.remove('platinum-support-row');
    let appliedColor = null;

    const cells = row.querySelectorAll('td, th');
    if (cells.length === 0) return false;

    // --- Gather Data ---
    const rules = {
        supportTier: (headerIndices.supportTier !== undefined && cells[headerIndices.supportTier]) ? cells[headerIndices.supportTier].textContent.trim() : null,
        accountName: (headerIndices.accountName !== undefined && cells[headerIndices.accountName]) ? cells[headerIndices.accountName].textContent.trim() : null,
        firstResponse: (headerIndices.firstResponse !== undefined && cells[headerIndices.firstResponse]) ? cells[headerIndices.firstResponse].textContent.trim() : null,
        status: (headerIndices.status !== undefined && cells[headerIndices.status]) ? cells[headerIndices.status].textContent.trim() : null,
        jiraStatus: (headerIndices.jiraStatus !== undefined && cells[headerIndices.jiraStatus]) ? cells[headerIndices.jiraStatus].textContent.trim() : null,
        lastModifiedText: (headerIndices.lastModified !== undefined && cells[headerIndices.lastModified]) ? cells[headerIndices.lastModified].textContent.trim() : null,
        caseNumber: (headerIndices.caseNumber !== undefined && cells[headerIndices.caseNumber]) ? cells[headerIndices.caseNumber].textContent.trim() : null,
        dateOpenedText: (headerIndices.dateOpened !== undefined && cells[headerIndices.dateOpened]) ? cells[headerIndices.dateOpened].textContent.trim() : null,
    };
    
    const hasNote = !!(rules.caseNumber && allCaseNotes[rules.caseNumber]);

    // --- 1. Apply Coloring (if no note) ---
    if (!hasNote) {
        const lastModifiedDate = parseSalesforceDate(rules.lastModifiedText);
        const isOld = lastModifiedDate && lastModifiedDate < new Date(Date.now() - 24 * 60 * 60 * 1000);
        const isJiraClosed = rules.jiraStatus && ['released', 'done', 'cancelled', 'canceled'].includes(rules.jiraStatus.toLowerCase());
        const isTechnicalIssue = rules.status && rules.status.toLowerCase() === 'technical issue/bug';

        if (settings.enableActionNeeded && isJiraClosed && isTechnicalIssue && isOld) appliedColor = settings.colorActionNeeded;
        if (!appliedColor && settings.enablePlatinumSupport && rules.supportTier && rules.supportTier.toUpperCase() === 'PLATINUM SUPPORT') {
            row.classList.add('platinum-support-row');
            appliedColor = settings.colorPlatinumSupport;
        }
        if (!appliedColor && settings.accountRules && rules.accountName) {
            for (const name in settings.accountRules) {
                if (rules.accountName.toLowerCase() === name.toLowerCase()) {
                    appliedColor = settings.accountRules[name];
                    break;
                }
            }
        }
        if (!appliedColor && settings.enableEmptyFirstResponse && (rules.firstResponse === null || rules.firstResponse === '')) appliedColor = settings.colorEmptyFirstResponse;
        if (!appliedColor && settings.enableJiraStatus && isJiraClosed) appliedColor = settings.colorJiraStatus;
        if (!appliedColor && settings.enableOldLastModified && isOld) appliedColor = settings.colorOldLastModified;
        
        if (appliedColor) row.style.backgroundColor = appliedColor;
    } else {
         row.style.backgroundColor = ''; 
    }

    // --- 2. Inject SLA Timer (NEW FEATURE) ---
    if (headerIndices.firstResponse !== undefined && headerIndices.dateOpened !== undefined) {
        const firstResponseCell = cells[headerIndices.firstResponse];
        const dateOpened = parseSalesforceDate(rules.dateOpenedText);

        // If First Response is empty AND we have an Opened Date
        if (dateOpened && (!rules.firstResponse || rules.firstResponse === '')) {
            let timerEl = firstResponseCell.querySelector('.sla-timer-badge');
            if (!timerEl) {
                timerEl = document.createElement('span');
                timerEl.className = 'sla-timer-badge';
                const container = firstResponseCell.querySelector('span.slds-truncate') || firstResponseCell;
                container.appendChild(timerEl);
            }
            timerEl.dataset.openedTime = dateOpened.getTime();
        } else {
            // Remove timer if filled
            const existingTimer = firstResponseCell.querySelector('.sla-timer-badge');
            if (existingTimer) existingTimer.remove();
        }
    }

    // --- 3. Inject Notes Button ---
    if (headerIndices.subject !== undefined && rules.caseNumber) {
        const subjectCell = cells[headerIndices.subject];
        if (subjectCell) {
            // Find a good place to put the icon (anchor tag or grid container)
            const cellContainer = subjectCell.querySelector('span.slds-grid') || subjectCell.querySelector('a'); 
            
            if (cellContainer) {
                let noteBtn = subjectCell.querySelector('.note-icon-btn');
                if (!noteBtn) {
                    noteBtn = document.createElement('button');
                    noteBtn.className = 'note-icon-btn';
                    noteBtn.dataset.caseNumber = rules.caseNumber;
                    noteBtn.title = 'View/Add Note';
                    noteBtn.innerHTML = `<svg viewBox="0 0 20 20" fill="currentColor"><path d="M17.414 2.586a2 2 0 00-2.828 0L7 10.172V13h2.828l7.586-7.586a2 2 0 000-2.828z"></path><path fill-rule="evenodd" d="M2 6a2 2 0 012-2h4a1 1 0 010 2H4v10h10v-4a1 1 0 112 0v4a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" clip-rule="evenodd"></path></svg>`;
                    noteBtn.addEventListener('click', (e) => {
                        e.stopPropagation(); e.preventDefault();
                        showNotePopover(rules.caseNumber, e.currentTarget);
                    });
                    cellContainer.appendChild(noteBtn);
                }
                // Highlight icon if note exists
                if (noteBtn) noteBtn.classList.toggle('note-icon-btn--active', hasNote);
            }
        }
    }
    
    // --- 4. Check for Notification (Responded/Re-Opened) ---
    if (rules.status) {
        const statusLower = rules.status.toLowerCase();
        if (statusLower === 'responded' || statusLower === 're-opened') return true;
    }
    return false;
}

// Split View processing (Simplified for brevity, similar logic)
function processSplitViewItem(item) {
    if (!item) return;
    item.classList.remove('platinum-support-row');
    const accountNameEl = Array.from(item.querySelectorAll('a[data-recordid] .uiOutputText')).find(el => {
        const text = el.textContent.trim();
        return isNaN(text) && !text.includes('/');
    });
    const rules = {
        accountName: accountNameEl ? accountNameEl.textContent.trim() : null,
        lastModifiedText: item.querySelector('span.uiOutputDateTime')?.textContent.trim() || null,
    };
    if (!settings) return;
    
    let appliedColor = null;
    const lastModifiedDate = parseSalesforceDate(rules.lastModifiedText);
    const isOld = lastModifiedDate && lastModifiedDate < new Date(Date.now() - 24 * 60 * 60 * 1000);
    
    if (settings.enablePlatinumSupport && rules.supportTier && rules.supportTier.toUpperCase() === 'PLATINUM SUPPORT') {
        item.classList.add('platinum-support-row');
        appliedColor = settings.colorPlatinumSupport;
    }
    // ... (Other standard checks similar to main table) ...
    if (!appliedColor && settings.enableOldLastModified && isOld) appliedColor = settings.colorOldLastModified;
    
    if (appliedColor) item.style.backgroundColor = appliedColor;
}

function processActiveRecordView() {
    // Only needed for JIRA status coloring in single record view
    const urlMatch = window.location.pathname.match(/\/Case\/([a-zA-Z0-9]{18})/);
    if (!urlMatch) return;
    const activeRecordId = urlMatch[1];
    const activeListItemLink = document.querySelector(`li.slds-split-view__list-item a[data-recordid="${activeRecordId}"]`);
    if (!activeListItemLink) return;
    // ... (Jira Status check logic) ...
}

function cleanupStyles() {
    document.querySelectorAll('[style*="background-color"]').forEach(el => {
        if (el.style.backgroundColor) { el.style.backgroundColor = ''; }
    });
    document.querySelectorAll('.platinum-support-row').forEach(el => {
        el.classList.remove('platinum-support-row');
    });
    // Remove timers
    if (slaInterval) clearInterval(slaInterval);
    document.querySelectorAll('.sla-timer-badge').forEach(el => el.remove());
}

let observer = null;

function pauseObserver()  { if (observer) observer.disconnect(); }
function resumeObserver() { if (observer) observer.observe(document.body, { childList: true, subtree: true, attributes: false }); }

let running = false;
let debounceTimer;

function processViews() {
    if (!chrome.runtime?.id) { return; } 
    
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
        if (running) return;
        running = true;

        if (!settings || !settings.isGloballyEnabled) {
            cleanupStyles();
            running = false;
            return;
        }

        try {
            const mainTable = document.querySelector('table[role="grid"]');
            let respondedCount = 0;

            if (mainTable) {
                headerIndices = getHeaderIndices(mainTable);
                
                if (headerIndices.caseNumber !== undefined) {
                    const rows = mainTable.querySelectorAll('tbody tr');
                    rows.forEach(row => {
                        // Count cases that return true (Responded/Re-Opened)
                        if (applyStylingAndNotes(row)) {
                            respondedCount++;
                        }
                    });
                }
            }
            
            const splitViewListItems = document.querySelectorAll('li.slds-split-view__list-item');
            if (splitViewListItems.length > 0) {
                splitViewListItems.forEach(processSplitViewItem);
                processActiveRecordView();
            }

            // Send count to background for Badge & Notifications
            try {
                chrome.runtime.sendMessage({ type: 'responded-count-update', count: respondedCount });
            } catch (e) {
                // Extension was reloaded — stop all intervals and observer
                if (slaInterval) clearInterval(slaInterval);
                pauseObserver();
                return;
            }

            // Update timer text immediately after badges are injected
            updateSlaTimers();

        } catch (e) { console.error("Highlighter Error:", e); }
        running = false;
    }, 250);
}

function init() {
    createNotePopover();
    startTimerLoop(); // Start SLA timer loop

    chrome.storage.sync.get(null, (loadedSettings) => {
        settings = loadedSettings;
        allCaseNotes = loadedSettings.caseNotes || {};
        
        const initialCheck = setInterval(() => {
            if (document.querySelector('table[role="grid"]') || document.querySelector('li.slds-split-view__list-item')) {
                clearInterval(initialCheck);
                processViews();
            }
        }, 500);
        setTimeout(() => clearInterval(initialCheck), 10000);
    });

    observer = new MutationObserver(processViews);
    observer.observe(document.body, { childList: true, subtree: true, attributes: false });
}

chrome.storage.onChanged.addListener((changes, namespace) => {
    if (namespace === 'sync') {
        chrome.storage.sync.get(null, (loadedSettings) => {
            settings = loadedSettings;
            allCaseNotes = loadedSettings.caseNotes || {};
            processViews();
        });
    }
});

window.addEventListener('message', (event) => {
    if (event.source === window && event.data.type === 'APPLY_RULES_NOW') {
        processViews();
    }
});

init();