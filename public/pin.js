// Enhanced pin.js - Fixed Pin Bar Functionality

class PinBar {
  constructor() {
    this.progressText = document.getElementById('progress-text');
    this.timeText = document.getElementById('time-text');
    this.progressCircle = document.getElementById('progress-circle');
    this.statusDot = document.getElementById('status-dot');
    this.syncIcon = document.getElementById('sync-icon');
    this.syncText = document.getElementById('sync-text');
    
    this.init();
  }

  init() {
    this.setupEventListeners();
    this.updateTime();
    this.loadProgress();
    this.checkCalendarStatus();
    
    // Update time every minute
    setInterval(() => this.updateTime(), 60000);
    
    // Update progress every 30 seconds
    setInterval(() => this.loadProgress(), 30000);
    
    // Check for URL hash to trigger actions
    this.handleUrlHash();
  }

  handleUrlHash() {
    const hash = window.location.hash;
    if (hash === '#add-habit') {
      setTimeout(() => this.quickAddHabit(), 500);
    } else if (hash === '#calendar-connect') {
      setTimeout(() => this.toggleCalendarSync(), 500);
    }
  }

  setupEventListeners() {
    // Dashboard button
    const dashboardBtn = document.getElementById('open-dashboard');
    if (dashboardBtn) {
      dashboardBtn.addEventListener('click', (e) => {
        e.preventDefault();
        console.log('🏠 Dashboard button clicked');
        this.openDashboard();
      });
    }

    // Add habit button
    const addHabitBtn = document.getElementById('add-habit');
    if (addHabitBtn) {
      addHabitBtn.addEventListener('click', (e) => {
        e.preventDefault();
        console.log('➕ Add habit button clicked');
        this.quickAddHabit();
      });
    }

    // Sync calendar button
    const syncBtn = document.getElementById('sync-calendar');
    if (syncBtn) {
      syncBtn.addEventListener('click', (e) => {
        e.preventDefault();
        console.log('📅 Sync button clicked');
        this.toggleCalendarSync();
      });
    }

    // Listen for storage changes to update progress and calendar status
    if (typeof chrome !== 'undefined' && chrome.storage) {
      chrome.storage.onChanged.addListener((changes, area) => {
        if (area === 'local') {
          let shouldUpdateProgress = false;
          let shouldUpdateCalendar = false;

          // Check for progress-related changes
          if (changes.habits || changes['default-completed'] || changes['calendar-events']) {
            shouldUpdateProgress = true;
          }

          // Check for calendar-related changes
          if (changes.google_access_token) {
            shouldUpdateCalendar = true;
          }

          if (shouldUpdateProgress) {
            setTimeout(() => this.loadProgress(), 500);
          }

          if (shouldUpdateCalendar) {
            setTimeout(() => this.checkCalendarStatus(), 500);
          }
        }
      });
    }

    // Listen for messages from background script
    if (typeof chrome !== 'undefined' && chrome.runtime) {
      chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
        console.log('📨 Pin bar received message:', message);
        
        if (message.type === 'CALENDAR_STATUS_CHANGED') {
          this.checkCalendarStatus();
        } else if (message.type === 'PROGRESS_UPDATED') {
          this.loadProgress();
        }
        
        sendResponse({ success: true });
      });
    }
  }

  updateTime() {
    const now = new Date();
    const timeString = now.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
      timeZone: 'Asia/Kolkata'
    });
    
    if (this.timeText) {
      this.timeText.textContent = timeString;
    }
  }

  async loadProgress() {
    try {
      if (typeof chrome === 'undefined' || !chrome.storage) {
        console.warn('Chrome storage API not available');
        this.updateProgress(0, 0);
        return;
      }

      const result = await new Promise((resolve, reject) => {
        chrome.storage.local.get([
          'habits', 
          'default-completed', 
          'calendar-events', 
          'wake-time', 
          'winddown-time'
        ], (result) => {
          if (chrome.runtime.lastError) {
            reject(chrome.runtime.lastError);
          } else {
            resolve(result);
          }
        });
      });

      const habits = result.habits || [];
      const defaultCompleted = result['default-completed'] || [];
      const calendarEvents = result['calendar-events'] || [];
      
      // Get wake and wind down times
      const wakeTimeISO = result['wake-time'];
      const windDownTimeISO = result['winddown-time'];
      
      const defaultTimeHabits = [];
      const today = new Date().toDateString();
      
      if (wakeTimeISO) {
        defaultTimeHabits.push({
          id: 'wake-time',
          name: 'Wake Up',
          dateTime: wakeTimeISO,
          completedDates: defaultCompleted.includes('wake-time') ? [today] : []
        });
      }
      
      if (windDownTimeISO) {
        defaultTimeHabits.push({
          id: 'winddown-time',
          name: 'Wind Down',
          dateTime: windDownTimeISO,
          completedDates: defaultCompleted.includes('winddown-time') ? [today] : []
        });
      }

      // Combine all habits for today
      const allHabits = [...defaultTimeHabits, ...habits, ...calendarEvents];
      const todayHabits = this.filterHabitsForToday(allHabits);
      
      const totalHabits = todayHabits.length;
      const completedCount = this.getCompletedCount(todayHabits, defaultCompleted);
      
      console.log(`📊 Progress: ${completedCount}/${totalHabits}`);
      this.updateProgress(completedCount, totalHabits);
      
    } catch (error) {
      console.error('Failed to load progress:', error);
      this.updateProgress(0, 0);
    }
  }

  filterHabitsForToday(habits) {
    const today = new Date().toDateString();
    
    return habits.filter(habit => {
      if (!habit.dateTime) return false;
      
      const habitDate = new Date(habit.dateTime).toDateString();
      
      // For recurring daily habits, show if today is on or after the start date
      if (habit.isRecurring && habit.recurringType === 'daily') {
        const startDate = new Date(habit.dateTime);
        const checkDate = new Date(today);
        startDate.setHours(0, 0, 0, 0);
        checkDate.setHours(0, 0, 0, 0);
        return checkDate >= startDate;
      }
      
      // For non-recurring habits, tasks, and events, match exact date
      return habitDate === today;
    });
  }

  getCompletedCount(habits, defaultCompleted) {
    const today = new Date().toDateString();
    
    return habits.filter(habit => {
      if (habit.id === 'wake-time' || habit.id === 'winddown-time') {
        return defaultCompleted.includes(habit.id);
      }
      return habit.completedDates && habit.completedDates.includes(today);
    }).length;
  }

  updateProgress(completed, total) {
    if (this.progressText) {
      this.progressText.textContent = `${completed}/${total}`;
    }

    if (this.progressCircle) {
      const percentage = total > 0 ? (completed / total) * 100 : 0;
      const circumference = 88; // 2 * π * 14
      const offset = circumference - (percentage / 100) * circumference;
      this.progressCircle.style.strokeDashoffset = offset;
      
      // Change color based on progress
      if (percentage === 100) {
        this.progressCircle.style.stroke = '#10b981'; // Green
      } else if (percentage >= 50) {
        this.progressCircle.style.stroke = '#f59e0b'; // Orange
      } else {
        this.progressCircle.style.stroke = '#ec4899'; // Pink
      }
    }

    // Update status dot
    if (this.statusDot) {
      if (total === 0) {
        this.statusDot.style.background = '#6b7280'; // Gray
      } else if (completed === total) {
        this.statusDot.style.background = '#10b981'; // Green
      } else if (completed > 0) {
        this.statusDot.style.background = '#f59e0b'; // Orange
      } else {
        this.statusDot.style.background = '#ec4899'; // Pink
      }
    }
  }

  async checkCalendarStatus() {
    try {
      if (typeof chrome === 'undefined' || !chrome.storage) {
        this.updateCalendarButton(false);
        return;
      }

      const result = await new Promise((resolve, reject) => {
        chrome.storage.local.get(['google_access_token'], (result) => {
          if (chrome.runtime.lastError) {
            reject(chrome.runtime.lastError);
          } else {
            resolve(result);
          }
        });
      });

      const isConnected = !!result.google_access_token;
      console.log('📅 Calendar connection status:', isConnected);
      this.updateCalendarButton(isConnected);
      
    } catch (error) {
      console.error('Failed to check calendar status:', error);
      this.updateCalendarButton(false);
    }
  }

  updateCalendarButton(isConnected) {
    if (this.syncIcon && this.syncText) {
      if (isConnected) {
        this.syncIcon.textContent = '✅';
        this.syncText.textContent = 'Synced';
        
        // Update button styling
        const syncButton = document.getElementById('sync-calendar');
        if (syncButton) {
          syncButton.classList.add('btn-success');
          syncButton.classList.remove('btn-warning');
        }
      } else {
        this.syncIcon.textContent = '📅';
        this.syncText.textContent = 'Sync';
        
        // Update button styling
        const syncButton = document.getElementById('sync-calendar');
        if (syncButton) {
          syncButton.classList.remove('btn-success');
          syncButton.classList.add('btn-warning');
        }
      }
    }
  }

  openDashboard() {
    console.log('🏠 Opening dashboard...');
    
    if (typeof chrome !== 'undefined' && chrome.runtime) {
      chrome.runtime.sendMessage({
        type: 'OPEN_DASHBOARD'
      }, (response) => {
        if (chrome.runtime.lastError) {
          console.warn('Dashboard open message failed:', chrome.runtime.lastError);
          // Fallback
          this.fallbackOpenDashboard();
        } else {
          console.log('✅ Dashboard opened successfully');
        }
      });
    } else {
      this.fallbackOpenDashboard();
    }
  }

  fallbackOpenDashboard() {
    // Fallback for testing or if chrome APIs fail
    const dashboardUrl = chrome?.runtime?.getURL ? 
      chrome.runtime.getURL('index.html') : 
      'index.html';
    window.open(dashboardUrl, '_blank');
  }

  quickAddHabit() {
    console.log('➕ Opening add habit form...');
    
    if (typeof chrome !== 'undefined' && chrome.runtime) {
      chrome.runtime.sendMessage({
        type: 'OPEN_ADD_FORM'
      }, (response) => {
        if (chrome.runtime.lastError) {
          console.warn('Add habit message failed:', chrome.runtime.lastError);
          // Fallback
          this.fallbackOpenAddForm();
        } else {
          console.log('✅ Add form opened successfully');
        }
      });
    } else {
      this.fallbackOpenAddForm();
    }
  }

  fallbackOpenAddForm() {
    // Fallback for testing or if chrome APIs fail
    const addFormUrl = chrome?.runtime?.getURL ? 
      chrome.runtime.getURL('index.html#add-habit') : 
      'index.html#add-habit';
    window.open(addFormUrl, '_blank');
  }

  async toggleCalendarSync() {
    console.log('📅 Toggling calendar sync...');
    
    try {
      // Show loading state
      this.setLoadingState(true);

      if (typeof chrome !== 'undefined' && chrome.runtime) {
        chrome.runtime.sendMessage({
          type: 'TOGGLE_CALENDAR_SYNC'
        }, (response) => {
          this.setLoadingState(false);
          
          if (chrome.runtime.lastError) {
            console.warn('Calendar sync message failed:', chrome.runtime.lastError);
            this.showError('Failed to sync calendar. Please try again.');
          } else {
            console.log('✅ Calendar sync response:', response);
            
            if (response.action === 'connecting') {
              console.log('🔄 Opening dashboard for calendar connection...');
            } else if (response.action === 'disconnected') {
              console.log('🔌 Calendar disconnected');
              this.updateCalendarButton(false);
            }
          }
        });
      } else {
        this.setLoadingState(false);
        console.warn('Chrome runtime not available for calendar sync');
      }
      
    } catch (error) {
      console.error('Failed to toggle calendar sync:', error);
      this.setLoadingState(false);
      this.showError('Failed to sync calendar. Please try again.');
    }
  }

  setLoadingState(isLoading) {
    if (this.syncIcon && this.syncText) {
      if (isLoading) {
        this.syncIcon.classList.add('loading');
        this.syncIcon.textContent = '⏳';
        this.syncText.textContent = 'Syncing...';
      } else {
        this.syncIcon.classList.remove('loading');
        // Status will be updated by checkCalendarStatus
        setTimeout(() => this.checkCalendarStatus(), 500);
      }
    }
  }

  showError(message) {
    // Simple error display - could be enhanced with a toast notification
    console.error('❌', message);
    
    // Temporarily show error in sync text
    if (this.syncText) {
      const originalText = this.syncText.textContent;
      this.syncText.textContent = 'Error';
      this.syncText.style.color = '#ef4444';
      
      setTimeout(() => {
        this.syncText.textContent = originalText;
        this.syncText.style.color = '';
        this.checkCalendarStatus();
      }, 2000);
    }
  }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  console.log('🚀 Initializing Pin Bar...');
  
  try {
    new PinBar();
    console.log('✅ Pin Bar initialized successfully');
  } catch (error) {
    console.error('❌ Failed to initialize Pin Bar:', error);
  }
});

// Handle browser environment differences
if (typeof module !== 'undefined' && module.exports) {
  module.exports = PinBar;
}

// Add some additional CSS for button states
const additionalStyles = `
  .btn-success {
    background: rgba(16, 185, 129, 0.15);
    border-color: rgba(16, 185, 129, 0.3);
    color: #059669;
  }
  
  .btn-success:hover {
    background: rgba(16, 185, 129, 0.25);
    border-color: rgba(16, 185, 129, 0.4);
  }
  
  .btn-warning {
    background: rgba(245, 158, 11, 0.15);
    border-color: rgba(245, 158, 11, 0.3);
    color: #d97706;
  }
  
  .btn-warning:hover {
    background: rgba(245, 158, 11, 0.25);
    border-color: rgba(245, 158, 11, 0.4);
  }
`;

// Inject additional styles
const styleSheet = document.createElement('style');
styleSheet.textContent = additionalStyles;
document.head.appendChild(styleSheet);