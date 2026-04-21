# Salesforce Colorizer — Auto-refresh + First Response Timer

A Chrome browser extension that enhances Salesforce Case list views with live timers, row colorizing, auto-refresh, and case notes — built to help support teams stay on top of response times at a glance.

---

## Screenshots

> *(Add your screenshots here)*

---

## What It Does

### 1. First Response Timer
Displays a live elapsed-time badge directly in the **First Response** column for any case that has not yet received a first response.

- The timer counts **up** from the moment the case was created (Date/Time Opened)
- It updates every **minute** — no flickering
- Once a First Response is sent and the field is populated, the timer automatically disappears
- Time is displayed in a human-readable format:
  - Under 1 hour → `43 min`
  - Under 1 day → `3 hr 12 min`
  - 1 day or more → `2 days 4 hr`

### 2. Timer Color Thresholds
The timer badge changes color based on how long the case has been waiting. Default thresholds (fully customizable in the popup):

| Time Elapsed | Color |
|---|---|
| 0 – 14 min | Green |
| 15+ min | Yellow |
| 30+ min | Orange |
| 45+ min | Red |

You can add, remove, or change any threshold and color directly from the extension popup.

### 3. Row Colorizing
Automatically highlights rows based on configurable rules:

- **Action Needed** — JIRA status is closed/done AND case status is Technical Issue/Bug AND last modified > 24 hrs
- **Platinum Support** — Account Support Tier is PLATINUM SUPPORT
- **Empty First Response** — First Response column is empty (no response sent yet)
- **Closed JIRA Status** — JIRA Status is Released / Done / Cancelled
- **Last Modified > 24 hrs** — Case has not been updated in over a day
- **Custom Account Rules** — Assign any color to specific account names

All colors are fully customizable via the popup.

### 4. Tab Auto-Refresh
Automatically refreshes your Salesforce list view tab at a set interval (default: every 5 minutes) so your team always sees the latest case data without manually refreshing.

### 5. Case Notes
Add private internal notes to any case directly from the list view. Notes are saved to your browser storage and persist across sessions. A pencil icon appears in the Subject column — click it to open the note editor.

### 6. Badge & Notifications
The extension icon shows a badge count of cases with status **Responded** or **Re-Opened** that need attention. Desktop notifications are also sent when new cases require action.

---

## Requirements & Dependencies

### Only works on Salesforce Lightning List Views
This extension **only activates** on URLs matching:
```
https://*.lightning.force.com/*
```
It targets the **Case list view table** (`table[role="grid"]`). It will not work on:
- Classic Salesforce
- Record detail pages
- Reports or dashboards

### Required Salesforce Fields in the List View
For full functionality, your Case list view **must include these columns**:

| Column | Purpose |
|---|---|
| **First Response** | Required for the timer — the timer appears when this is empty and disappears when filled |
| **Date/Time Opened** | Required for the timer — used to calculate elapsed time since case creation |
| **Case Number** | Required for case notes |
| **Subject** | Required for the notes icon |
| **Status** | Required for responded/re-opened badge count |
| **Last Modified Date** | Required for the "Last Modified > 24 hrs" coloring rule |
| **Account Name** | Required for custom account color rules |
| **Account Support Tier** | Required for Platinum Support highlighting |
| **JIRA Status** | Required for JIRA-based coloring rules |

> If **First Response** or **Date/Time Opened** are not in your list view columns, the timer will not appear. Add them via the list view editor in Salesforce.

---

## Installation

1. Download or clone this repository
2. Open Chrome and go to `chrome://extensions`
3. Enable **Developer Mode** (top right toggle)
4. Click **Load unpacked**
5. Select the folder containing this extension
6. Navigate to your Salesforce Case list view — the extension activates automatically

---

## How to Use the Popup

Click the extension icon in your Chrome toolbar to open the control panel:

- **Enable Highlighter** — master on/off switch for all features
- **Tab Auto Refresh** — toggle auto-refresh and set the interval in minutes
- **Coloring Rules** — enable/disable each rule and pick its highlight color
- **Timer Highlight Rules** — set minute thresholds and colors for the First Response timer (e.g. after 30 mins → orange). Use the **+ Add** button to create new tiers
- **Custom Account Rules** — type an account name and pick a color to highlight all cases from that account
- **Notes** — clear all saved case notes
- **Apply All Rules on Page** — force re-apply all rules without refreshing the page

---

## Important Notes

- The extension reads data directly from the visible DOM of the list view — it does not call any Salesforce APIs
- Case notes are stored in Chrome's `sync` storage — they sync across Chrome sessions but are private to your browser profile
- If you reload the extension while a Salesforce tab is open, refresh that tab to re-initialize the content script
- The timer only runs while the list view tab is open and visible
