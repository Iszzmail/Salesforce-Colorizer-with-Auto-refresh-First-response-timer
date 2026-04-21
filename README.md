# ⚡ Salesforce Colorizer — Auto-refresh + First Response Timer

> A Chrome extension that supercharges your Salesforce Case list view with **live timers**, **smart row colors**, **auto-refresh**, and **case notes** — so your support team never misses a beat. 🎯

---

---

## ✨ What It Does

### ⏱️ 1. First Response Timer
Displays a live elapsed-time badge directly in the **First Response** column for any case that hasn't been responded to yet.

- Counts **up** from the moment the case was created (Date/Time Opened)
- Updates every **minute** — zero flickering 🙌
- Timer **automatically disappears** once a First Response is sent
- Displays time in a clean, readable format:

<img width="1024" height="195" alt="image" src="https://github.com/user-attachments/assets/ea432154-e29a-4511-859e-82ad6a98cf33" />


| Elapsed Time | Display |
|---|---|
| Under 1 hour | `43 min` |
| Under 1 day | `3 hr 12 min` |
| 1 day or more | `2 days 4 hr` |

<img width="354" height="229" alt="image" src="https://github.com/user-attachments/assets/31e14725-d5c9-4b7d-8b52-4032f96a226a" />


---

### 🎨 2. Timer Color Thresholds
The timer badge color changes automatically based on how long a case has been waiting. Defaults (all customizable! 🛠️):

| ⏳ Time Elapsed | 🎨 Color |
|---|---|
| 0 – 14 min | 🟢 Green |
| 15+ min | 🟡 Yellow |
| 30+ min | 🟠 Orange |
| 45+ min | 🔴 Red |

Add as many thresholds as you want directly from the popup — pick any minute value and any color.

---

### 🌈 3. Row Colorizing
Automatically highlights case rows based on smart rules:

- 🔴 **Action Needed** — JIRA closed + Technical Issue/Bug + not updated in 24hrs
- 🥇 **Platinum Support** — Account Support Tier is PLATINUM SUPPORT
- 🩷 **Empty First Response** — No first response sent yet
- 🔵 **Closed JIRA Status** — JIRA is Released / Done / Cancelled
- 🟡 **Last Modified > 24 hrs** — Case hasn't been touched in over a day
- 🎯 **Custom Account Rules** — Assign any color to any account name you choose

All colors are fully customizable via the popup. ✅

<img width="1725" height="906" alt="image" src="https://github.com/user-attachments/assets/8471226a-f8e1-46ed-bd1a-a719cebdc382" />

---

### 🔄 4. Tab Auto-Refresh
Automatically refreshes your Salesforce list view at a set interval (default: every 5 minutes) — keeping your team on the freshest data without lifting a finger. 💤➡️📋

<img width="374" height="608" alt="image" src="https://github.com/user-attachments/assets/5910c7a1-3430-42a6-abb7-e6ddc691babc" />

---

### 📝 5. Case Notes
Add private internal notes to any case right from the list view. A ✏️ pencil icon appears in the Subject column — click it to open the note editor. Notes are saved to your browser and persist across sessions.

<img width="1728" height="661" alt="image" src="https://github.com/user-attachments/assets/e2620937-1aa8-429f-8464-48b39721649a" />

---

## ⚙️ Requirements & Dependencies

### 🌩️ Only Works on Salesforce Lightning List Views
This extension **only activates** on URLs matching:
```
https://*.lightning.force.com/*
```

It will **not** work on:
- ❌ Classic Salesforce
- ❌ Record detail pages
- ❌ Reports or dashboards

---

### 📋 Required Columns in Your List View
For full functionality, your Case list view **must include these columns**:

| Column | Why It's Needed |
|---|---|
| ⏱️ **First Response** | Timer appears when empty, disappears when filled |
| 📅 **Date/Time Opened** | Used to calculate elapsed time |
| 🔢 **Case Number** | Required for case notes |
| 📌 **Subject** | Required for the notes ✏️ icon |
| 🔄 **Status** | Required for responded/re-opened badge |
| 🕐 **Last Modified Date** | Required for "Last Modified > 24 hrs" rule |
| 🏢 **Account Name** | Required for custom account color rules |
| 🥇 **Account Support Tier** | Required for Platinum Support highlighting |
| 🐛 **JIRA Status** | Required for JIRA-based coloring |

> ⚠️ **Important:** If **First Response** or **Date/Time Opened** are missing from your list view, the timer will not appear. Add them via the list view editor in Salesforce.

---

## 🚀 Installation

1. 📥 Download or clone this repository
2. 🌐 Open Chrome and go to `chrome://extensions`
3. 🔧 Enable **Developer Mode** (toggle in the top right)
4. 📂 Click **Load unpacked**
5. 📁 Select the folder containing this extension
6. ✅ Navigate to your Salesforce Case list view — it activates automatically!

---

## 🎛️ How to Use the Popup

Click the extension icon in your Chrome toolbar to open the control panel:

| Setting | What It Does |
|---|---|
| 🔌 **Enable Highlighter** | Master on/off switch for everything |
| 🔄 **Tab Auto Refresh** | Toggle auto-refresh and set interval in minutes |
| 🌈 **Coloring Rules** | Enable/disable each rule and pick its color |
| ⏱️ **Timer Highlight Rules** | Set minute thresholds + colors for the timer badge |
| 🏢 **Custom Account Rules** | Assign colors to specific account names |
| 📝 **Notes** | Clear all saved case notes |
| ▶️ **Apply All Rules on Page** | Force re-apply all rules without refreshing |

---

## 📌 Important Notes

- 🔍 The extension reads data from the **visible DOM** — it does not call any Salesforce APIs
- 💾 Case notes are stored in Chrome's `sync` storage — private to your browser profile
- 🔁 If you reload the extension while a tab is open, **refresh that Salesforce tab** to re-initialize
- 👁️ The timer only runs while the list view tab is open and visible

---

> Built with ❤️ for support teams who move fast and need their tools to keep up.
