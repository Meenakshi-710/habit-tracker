// Enhanced background.js with proper message handling, calendar sync, and streak milestone notifications

function scheduleItemAlarm(item) {
  const { id, name, title, dateTime, remindBeforeMinutes = 0, type = 'habit' } = item;
  const itemName = name || title;

  if (!dateTime) return;

  const itemTime = new Date(dateTime);
  if (isNaN(itemTime.getTime())) return;

  const reminderTime = new Date(itemTime.getTime() - remindBeforeMinutes * 60 * 1000);
  const now = new Date();

  if (reminderTime.getTime() <= now.getTime()) {
    if (type === 'habit') {
      reminderTime.setTime(reminderTime.getTime() + 24 * 60 * 60 * 1000);
    } else {
      return;
    }
  }

  chrome.alarms.create(id, { when: reminderTime.getTime() });
  chrome.storage.local.set({ 
    [`alarm-${id}`]: {
      name: itemName,
      type,
      originalDateTime: dateTime,
      remindBeforeMinutes
    }
  });

  console.log(
    `📅 Scheduled "${itemName}" (${type}) reminder at ${reminderTime.toLocaleString("en-IN", {
      timeZone: "Asia/Kolkata",
    })}`
  );
}

function loadAndScheduleAllItems() {
  chrome.storage.local.get(['habits', 'default-completed', 'calendar-events'], (result) => {
    const habits = result.habits || [];
    const calendarEvents = result['calendar-events'] || [];

    // Get default time habits from localStorage equivalents
    const wakeTimeISO = result['wake-time'];
    const windDownTimeISO = result['winddown-time'];
    const defaultCompleted = result['default-completed'] || [];
    
    const defaultTimeHabits = [];
    const today = new Date().toDateString();
    
    if (wakeTimeISO) {
      defaultTimeHabits.push({
        id: 'wake-time',
        name: 'Wake Up',
        dateTime: wakeTimeISO,
        type: 'habit',
        completedDates: defaultCompleted.includes('wake-time') ? [today] : []
      });
    }
    
    if (windDownTimeISO) {
      defaultTimeHabits.push({
        id: 'winddown-time',
        name: 'Wind Down',
        dateTime: windDownTimeISO,
        type: 'habit',
        completedDates: defaultCompleted.includes('winddown-time') ? [today] : []
      });
    }

    const allItems = [
      ...defaultTimeHabits,
      ...habits.map(h => ({ ...h, type: h.type || 'habit' })),
      ...calendarEvents.map(e => ({ ...e, type: e.type || 'event' }))
    ];

    if (allItems.length === 0) {
      console.warn("❌ No valid items found");
      return;
    }

    chrome.alarms.clearAll(() => {
      console.log("🧹 Cleared existing alarms");
      allItems.forEach(scheduleItemAlarm);
    });
  });
}

// Streak milestone definitions for notifications
const STREAK_MILESTONES = {
  3: {
    title: "Getting Started!",
    emoji: "🌟",
    message: "Great start! You're building momentum!"
  },
  7: {
    title: "Week Warrior!",
    emoji: "⚡",
    message: "Amazing! You've completed a full week!"
  },
  10: {
    title: "Bronze Achiever!",
    emoji: "🥉",
    message: "Congratulations! You've earned your first medal!"
  },
  21: {
    title: "Habit Former!",
    emoji: "🏆",
    message: "Incredible! You're officially forming a habit!"
  },
  30: {
    title: "Monthly Master!",
    emoji: "👑",
    message: "Outstanding! A full month of dedication!"
  },
  50: {
    title: "Silver Champion!",
    emoji: "🥈",
    message: "Phenomenal! You're a true champion!"
  },
  100: {
    title: "Gold Legend!",
    emoji: "🥇",
    message: "LEGENDARY! 100 days of unstoppable commitment!"
  }
};

// Function to create streak milestone notification
function createStreakMilestoneNotification(payload) {
  const { habitName, streak, milestone, reward, message } = payload;
  const milestoneData = STREAK_MILESTONES[streak];
  
  if (!milestoneData) return;

  const notificationId = `streak-${payload.habitId}-${streak}-${Date.now()}`;
  
  chrome.notifications.create(notificationId, {
    type: "basic",
    iconUrl: "logo.png",
    title: `${milestoneData.emoji} ${milestoneData.title}`,
    message: `"${habitName}" - ${streak} day streak! ${milestoneData.message}`,
    contextMessage: reward,
    priority: 2, // High priority for achievements
    requireInteraction: true // Keep notification until user interacts
  });

  // Store achievement in local storage for potential future features
  chrome.storage.local.get(['streak-achievements'], (result) => {
    const achievements = result['streak-achievements'] || [];
    achievements.push({
      habitId: payload.habitId,
      habitName,
      streak,
      milestone: milestoneData.title,
      achievedAt: payload.achievedAt,
      reward
    });
    
    // Keep only last 50 achievements to prevent storage bloat
    if (achievements.length > 50) {
      achievements.splice(0, achievements.length - 50);
    }
    
    chrome.storage.local.set({ 'streak-achievements': achievements });
  });

  console.log(`🏆 Streak milestone notification created: ${habitName} - ${streak} days`);
}

chrome.alarms.onAlarm.addListener((alarm) => {
  const alarmId = alarm.name;
  console.log("🔥 Alarm triggered:", alarmId);

  chrome.storage.local.get([`alarm-${alarmId}`], (result) => {
    const alarmData = result[`alarm-${alarmId}`];

    if (!alarmData) {
      console.warn("⚠️ No alarm data found for:", alarmId);
      return;
    }

    const { name: itemName, type, originalDateTime, remindBeforeMinutes } = alarmData;
    const scheduledTime = new Date(originalDateTime);
    const remindBefore = remindBeforeMinutes || 0;

    const formattedTime = scheduledTime.toLocaleTimeString("en-IN", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
      timeZone: "Asia/Kolkata",
    });

    const formattedDate = scheduledTime.toLocaleDateString("en-IN", {
      weekday: "short",
      month: "short",
      day: "numeric",
      year: "numeric",
      timeZone: "Asia/Kolkata",
    });

    let message = "";
    if (remindBefore > 0) {
      const timeText = remindBefore === 60 ? "1 hour" : `${remindBefore} minutes`;
      message = `Heads up! "${itemName}" is scheduled at ${formattedTime} on ${formattedDate} (in ${timeText}).`;
    } else {
      const actionText = type === 'habit' ? 'complete' : type === 'task' ? 'work on' : 'attend';
      message = `Time to ${actionText}: "${itemName}" now!`;
    }

    chrome.notifications.create(alarmId, {
      type: "basic",
      iconUrl: "logo.png",
      title: "🔔 Reminder",
      message,
    });

    if (type === 'habit') {
      const nextTime = new Date(originalDateTime);
      nextTime.setTime(nextTime.getTime() + 24 * 60 * 60 * 1000);

      const nextReminder = new Date(nextTime.getTime() - remindBefore * 60 * 1000);
      chrome.alarms.create(alarmId, { when: nextReminder.getTime() });

      chrome.storage.local.set({
        [`alarm-${alarmId}`]: {
          ...alarmData,
          originalDateTime: nextTime.toISOString()
        }
      });

      console.log(
        `🔄 Rescheduled habit "${itemName}" for next day at ${nextReminder.toLocaleString("en-IN", {
          timeZone: "Asia/Kolkata",
        })}`
      );
    } else {
      chrome.storage.local.remove([`alarm-${alarmId}`]);
      console.log(`✅ ${type} "${itemName}" completed, alarm data removed`);
    }
  });
});

// Enhanced message handling with dashboard tab routing and streak notifications
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log("📨 Received message:", message.type, message);

  switch (message.type) {
    case "SAVE_HABITS":
      const habits = message.payload;
      if (!Array.isArray(habits)) {
        console.warn("⚠️ Invalid habit data received");
        sendResponse({ success: false, error: "Invalid data" });
        return;
      }

      chrome.storage.local.set({ habits }, () => {
        console.log("💾 Saved habits from app:", habits.length);
        loadAndScheduleAllItems();
        sendResponse({ success: true });
      });
      return true;

    case "HABIT_COMPLETED":
    case "ITEM_COMPLETED":
      const { id, name, title, type = 'habit', completedAt } = message.payload;
      const itemName = name || title;

      const formattedTime = new Date(completedAt).toLocaleTimeString("en-IN", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
        timeZone: "Asia/Kolkata",
      });

      const actionText = type === 'habit' ? 'completed' : type === 'task' ? 'finished' : 'attended';

      chrome.notifications.create(`completed-${id}-${Date.now()}`, {
        type: "basic",
        iconUrl: "logo.png",
        title: "✅ Completed",
        message: `You ${actionText} "${itemName}" at ${formattedTime}. Keep it up!`,
      });

      console.log(`✅ Completion notification sent for ${type} "${itemName}"`);
      sendResponse({ success: true });
      return true;

    case "STREAK_MILESTONE_ACHIEVED":
      console.log("🏆 Streak milestone achieved:", message.payload);
      createStreakMilestoneNotification(message.payload);
      sendResponse({ success: true });
      return true;

    case "TOGGLE_CALENDAR_SYNC":
      console.log("📅 Calendar sync toggle requested");
      
      // Get current connection status
      chrome.storage.local.get(['google_access_token'], (result) => {
        const isConnected = !!result.google_access_token;
        
        if (isConnected) {
          // Disconnect
          chrome.storage.local.remove(['google_access_token', 'calendar-events'], () => {
            console.log("🔌 Disconnected from Google Calendar");
            sendResponse({ 
              success: true, 
              action: 'disconnected',
              message: "Disconnected from Google Calendar" 
            });
          });
        } else {
          // Connect - open main dashboard for OAuth flow
          chrome.tabs.create({ 
            url: chrome.runtime.getURL('index.html#calendar-connect')
          }, () => {
            sendResponse({ 
              success: true, 
              action: 'connecting',
              message: "Opening dashboard for calendar connection" 
            });
          });
        }
      });
      return true;

    case "OPEN_DASHBOARD":
      // Find if there's already a dashboard tab open
      chrome.tabs.query({ url: chrome.runtime.getURL('index.html') }, (tabs) => {
        if (tabs.length > 0) {
          // Focus the existing tab
          chrome.tabs.update(tabs[0].id, { active: true });
          chrome.windows.update(tabs[0].windowId, { focused: true });
          console.log("🏠 Focused existing dashboard tab");
        } else {
          // Create new tab
          chrome.tabs.create({ 
            url: chrome.runtime.getURL('index.html') 
          }, () => {
            console.log("🏠 Created new dashboard tab");
          });
        }
        sendResponse({ success: true });
      });
      return true;

    case "OPEN_ADD_FORM":
      // Enhanced add form handling - find dashboard tab and send message or open new one
      chrome.tabs.query({ url: chrome.runtime.getURL('index.html') }, (tabs) => {
        if (tabs.length > 0) {
          // Dashboard is open, focus it and send message to open form
          const dashboardTab = tabs[0];
          chrome.tabs.update(dashboardTab.id, { active: true });
          chrome.windows.update(dashboardTab.windowId, { focused: true });
          
          // Send message to the dashboard to open the add form
          chrome.tabs.sendMessage(dashboardTab.id, {
            type: 'OPEN_ADD_FORM'
          }, (response) => {
            if (chrome.runtime.lastError) {
              console.warn("⚠️ Failed to send message to dashboard tab, trying URL hash");
              // Fallback: update URL with hash
              chrome.tabs.update(dashboardTab.id, { 
                url: chrome.runtime.getURL('index.html#add-habit')
              });
            }
          });
          
          console.log("📝 Focused dashboard tab and requested add form");
        } else {
          // No dashboard open, create new tab with hash
          chrome.tabs.create({ 
            url: chrome.runtime.getURL('index.html#add-habit')
          }, () => {
            console.log("📝 Created new dashboard tab with add form");
          });
        }
        sendResponse({ success: true });
      });
      return true;

    case "GET_STREAK_ACHIEVEMENTS":
      // New message type to retrieve streak achievements
      chrome.storage.local.get(['streak-achievements'], (result) => {
        const achievements = result['streak-achievements'] || [];
        sendResponse({ success: true, achievements });
      });
      return true;

    case "CLEAR_STREAK_ACHIEVEMENTS":
      // New message type to clear streak achievements
      chrome.storage.local.remove(['streak-achievements'], () => {
        sendResponse({ success: true, message: "Achievements cleared" });
      });
      return true;

    default:
      console.warn("❓ Unknown message type:", message.type);
      sendResponse({ success: false, error: "Unknown message type" });
      return false;
  }
});

// Enhanced notification click handler for streak achievements
chrome.notifications.onClicked.addListener((notificationId) => {
  console.log("🔔 Notification clicked:", notificationId);
  
  // Clear the notification
  chrome.notifications.clear(notificationId);
  
  // If it's a streak notification, open dashboard to show achievements
  if (notificationId.startsWith('streak-')) {
    chrome.tabs.query({ url: chrome.runtime.getURL('index.html') }, (tabs) => {
      if (tabs.length > 0) {
        chrome.tabs.update(tabs[0].id, { active: true });
        chrome.windows.update(tabs[0].windowId, { focused: true });
      } else {
        chrome.tabs.create({ 
          url: chrome.runtime.getURL('index.html#achievements')
        });
      }
    });
  }
});

// Storage change listener
chrome.storage.onChanged.addListener((changes, area) => {
  if (area === "local") {
    const relevantChanges = ['habits', 'default-completed', 'calendar-events', 'wake-time', 'winddown-time'];
    const hasRelevantChanges = relevantChanges.some(key => changes[key]);
    
    if (hasRelevantChanges) {
      console.log("🔁 Storage updated, rescheduling alarms...");
      setTimeout(() => loadAndScheduleAllItems(), 500);
    }
  }
});

function openMainTabAndPinBar() {
  // Open main UI
  chrome.tabs.create({
    url: chrome.runtime.getURL("index.html"),
  });

  // Open floating pin bar
  chrome.windows.create({
    url: chrome.runtime.getURL("pin.html"),
    type: "popup",
    width: 380,
    height: 85,
    top: 50,
    left: 50,
    focused: false,
  });
}

// Extension startup
chrome.runtime.onStartup.addListener(() => {
  console.log("🚀 Extension started");
  loadAndScheduleAllItems();
});

chrome.runtime.onInstalled.addListener((details) => {
  console.log("✅ Extension installed/reloaded");
  loadAndScheduleAllItems();
  
  // Open on install/update
  if (details.reason === 'install' || details.reason === 'update') {
    openMainTabAndPinBar();
  }
});

// Action button click
chrome.action.onClicked.addListener(() => {
  openMainTabAndPinBar();
});