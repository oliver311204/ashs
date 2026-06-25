const SUBJECTS_KEY = 'readingSubjects';
const HISTORY_KEY = 'pomodoroHistory';
const DEFAULT_SUBJECTS = ['國文', '英文', '數學', '物理', '化學', '地理', '公民', '歷史'];
const POMODORO_SECONDS = 25 * 60;
const GAS_URL = 'https://your-gas-url-here'; // 請替換為你的 GAS Web App URL

const tabStudy = document.querySelector('#tab-study');
const tabDashboard = document.querySelector('#tab-dashboard');
const studyView = document.querySelector('#study-view');
const dashboardView = document.querySelector('#dashboard-view');
const subjectSelect = document.querySelector('#subject-select');
const durationSelect = document.querySelector('#duration-select');
const timerDisplay = document.querySelector('#timer-display');
const timerLabel = document.querySelector('#timer-label');
const startBtn = document.querySelector('#start-btn');
const pauseBtn = document.querySelector('#pause-btn');
const resetBtn = document.querySelector('#reset-btn');
const currentSubjectLabel = document.querySelector('#current-subject');
const cardFaceHint = document.querySelector('.card-face-hint');
const taskCard = document.querySelector('#task-card');
const cardInner = document.querySelector('#card-inner');
const completeMessage = document.querySelector('#complete-message');
const saveSessionBtn = document.querySelector('#save-session-btn');
const quoteText = document.querySelector('#quote-text');
const quoteSource = document.querySelector('#quote-source');
const subjectForm = document.querySelector('#subject-form');
const subjectInput = document.querySelector('#subject-input');
const recordForm = document.querySelector('#record-form');
const recordDatetime = document.querySelector('#record-datetime');
const recordSubjectSelect = document.querySelector('#record-subject-select');
const historyTbody = document.querySelector('#history-tbody');
const chartCanvas = document.querySelector('#subject-chart');

const DEFAULT_POMODORO_MINUTES = 25;
let subjects = [];
let historyRecords = [];
let selectedDurationMinutes = DEFAULT_POMODORO_MINUTES;
let currentSeconds = DEFAULT_POMODORO_MINUTES * 60;
let timerId = null;
let isRunning = false;
let chartInstance = null;

function loadLocalData() {
  const savedSubjects = localStorage.getItem(SUBJECTS_KEY);
  subjects = savedSubjects ? JSON.parse(savedSubjects) : DEFAULT_SUBJECTS.slice();

  const savedHistory = localStorage.getItem(HISTORY_KEY);
  historyRecords = savedHistory ? JSON.parse(savedHistory) : [];
}

function saveLocalData() {
  localStorage.setItem(SUBJECTS_KEY, JSON.stringify(subjects));
  localStorage.setItem(HISTORY_KEY, JSON.stringify(historyRecords));
}

function formatTime(seconds) {
  const minutes = String(Math.floor(seconds / 60)).padStart(2, '0');
  const secs = String(seconds % 60).padStart(2, '0');
  return `${minutes}:${secs}`;
}

function renderSubjectOptions() {
  const optionsHtml = subjects
    .map((subject) => `<option value="${subject}">${subject}</option>`)
    .join('');

  subjectSelect.innerHTML = optionsHtml;
  recordSubjectSelect.innerHTML = optionsHtml;
}

function getSelectedDurationMinutes() {
  return Number(durationSelect.value) || DEFAULT_POMODORO_MINUTES;
}

function syncDurationSelection() {
  selectedDurationMinutes = getSelectedDurationMinutes();
  updateDurationHint();
  if (!isRunning) {
    currentSeconds = selectedDurationMinutes * 60;
    updateTimerDisplay();
  }
}

function updateDurationHint() {
  if (cardFaceHint) {
    cardFaceHint.textContent = `開始後，番茄鐘倒數 ${selectedDurationMinutes} 分鐘。`;
  }
}

function updateTimerDisplay() {
  timerDisplay.textContent = formatTime(currentSeconds);
}

function updateSubjectLabel() {
  currentSubjectLabel.textContent = subjectSelect.value;
}

function setActiveTab(tab) {
  if (tab === 'study') {
    studyView.classList.remove('hidden');
    dashboardView.classList.add('hidden');
    tabStudy.classList.add('active');
    tabDashboard.classList.remove('active');
  } else {
    studyView.classList.add('hidden');
    dashboardView.classList.remove('hidden');
    tabStudy.classList.remove('active');
    tabDashboard.classList.add('active');
  }
}

function playFinishSound() {
  const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  const oscillator = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  oscillator.type = 'sine';
  oscillator.frequency.value = 880;
  gain.gain.value = 0.12;
  oscillator.connect(gain);
  gain.connect(audioCtx.destination);
  oscillator.start();
  oscillator.stop(audioCtx.currentTime + 0.28);
}

function showCompleteCard() {
  const subject = subjectSelect.value;
  completeMessage.textContent = `你完成了 1 個 ${selectedDurationMinutes} 分鐘 ${subject} 番茄鐘！`;
  cardInner.parentElement.classList.add('flipped');
}

function hideCompleteCard() {
  cardInner.parentElement.classList.remove('flipped');
}

function finishPomodoro() {
  pauseTimer();
  showCompleteCard();
  playFinishSound();
}

function resetTimer() {
  pauseTimer();
  syncDurationSelection();
  hideCompleteCard();
}

function startTimer() {
  if (isRunning) return;
  if (currentSeconds <= 0) {
    syncDurationSelection();
  }
  isRunning = true;
  timerId = window.setInterval(() => {
    currentSeconds -= 1;
    updateTimerDisplay();
    if (currentSeconds <= 0) {
      finishPomodoro();
    }
  }, 1000);
}

function pauseTimer() {
  if (!isRunning) return;
  isRunning = false;
  window.clearInterval(timerId);
  timerId = null;
}

function resetTimer() {
  pauseTimer();
  currentSeconds = POMODORO_SECONDS;
  updateTimerDisplay();
  hideCompleteCard();
}

function addHistoryRecord(subject, durationMinutes, timestamp = new Date().toISOString()) {
  historyRecords.unshift({ timestamp, subject, durationMinutes });
  saveLocalData();
  renderHistoryTable();
  updateChart();
}

function getLocalDatetimeLocalValue(date = new Date()) {
  const offsetMinutes = date.getTimezoneOffset();
  const localDate = new Date(date.getTime() - offsetMinutes * 60000);
  return localDate.toISOString().slice(0, 16);
}

function renderHistoryTable() {
  if (historyRecords.length === 0) {
    historyTbody.innerHTML = '<tr><td colspan="3" class="empty-row">目前尚未記錄任何番茄鐘。</td></tr>';
    return;
  }

  historyTbody.innerHTML = historyRecords
    .map((record) => {
      const date = new Date(record.timestamp);
      const formatted = date.toLocaleString('zh-Hant', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
      });
      return `
        <tr>
          <td>${formatted}</td>
          <td>${record.subject}</td>
          <td>${record.durationMinutes} 分鐘</td>
        </tr>
      `;
    })
    .join('');
}

function buildChartData() {
  const totals = subjects.reduce((acc, subject) => {
    acc[subject] = 0;
    return acc;
  }, {});

  historyRecords.forEach((record) => {
    if (totals[record.subject] !== undefined) {
      totals[record.subject] += record.durationMinutes;
    } else {
      totals[record.subject] = record.durationMinutes;
    }
  });

  const labels = Object.keys(totals);
  const data = labels.map((subject) => totals[subject]);
  return { labels, data };
}

function updateChart() {
  const chartData = buildChartData();

  if (!chartInstance) {
    chartInstance = new Chart(chartCanvas, {
      type: 'pie',
      data: {
        labels: chartData.labels,
        datasets: [{
          data: chartData.data,
          backgroundColor: [
            '#6366f1', '#22c55e', '#f59e0b', '#ec4899', '#0ea5e9', '#f97316', '#8b5cf6', '#14b8a6'
          ],
          borderColor: '#ffffff',
          borderWidth: 2,
        }],
      },
      options: {
        responsive: true,
        plugins: {
          legend: {
            position: 'bottom',
            labels: {
              color: '#344154',
              boxWidth: 14,
              padding: 18,
            },
          },
          tooltip: {
            callbacks: {
              label(context) {
                return `${context.label}: ${context.parsed} 分鐘`;
              },
            },
          },
        },
      },
    });
  } else {
    chartInstance.data.labels = chartData.labels;
    chartInstance.data.datasets[0].data = chartData.data;
    chartInstance.update();
  }
}

function fetchMotivationQuote() {
  const apiUrl = 'https://api.quotable.io/random?tags=education|motivational';

  fetch(apiUrl)
    .then((response) => response.json())
    .then((data) => {
      if (data && data.content) {
        quoteText.textContent = data.content;
        quoteSource.textContent = data.author ? `— ${data.author}` : '';
      }
    })
    .catch(() => {
      const fallback = [
        '專注 25 分鐘，讓你的學習成效更有形。',
        '每一個番茄鐘都是你專注力的投資。',
        '放下分心，給自己一段完整的深度學習時光。',
      ];
      const index = Math.floor(Math.random() * fallback.length);
      quoteText.textContent = fallback[index];
      quoteSource.textContent = '';
    });
}

function saveToGoogleSheet(subject, duration, timestamp = new Date().toISOString()) {
  const payload = {
    subject,
    duration,
    timestamp,
  };

  fetch(GAS_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  })
    .then((response) => {
      if (!response.ok) {
        throw new Error('Google Apps Script 儲存失敗');
      }
      return response.text();
    })
    .then(() => {
      console.log('已送出資料到 Google Sheets');
    })
    .catch((error) => {
      console.warn(error);
    });
}

function handleSaveSession() {
  const subject = subjectSelect.value;
  const durationMinutes = selectedDurationMinutes;
  addHistoryRecord(subject, durationMinutes);
  saveToGoogleSheet(subject, durationMinutes);
  hideCompleteCard();
  resetTimer();
}

function handleRecordSubmit(event) {
  event.preventDefault();
  const subject = recordSubjectSelect.value;
  const timestamp = recordDatetime.value;

  if (!timestamp) {
    alert('請選擇登記時間。');
    return;
  }

  addHistoryRecord(subject, 25, new Date(timestamp).toISOString());
  saveToGoogleSheet(subject, 25, new Date(timestamp).toISOString());
  recordForm.reset();
  recordDatetime.value = getLocalDatetimeLocalValue();
  alert('已儲存番茄鐘紀錄並送出後端。');
}

function handleAddSubject(event) {
  event.preventDefault();
  const subjectName = subjectInput.value.trim();
  if (!subjectName) {
    alert('請輸入科目名稱。');
    return;
  }

  if (subjects.includes(subjectName)) {
    alert('此科目已存在，請輸入其他名稱。');
    return;
  }

  subjects.push(subjectName);
  saveLocalData();
  renderSubjectOptions();
  updateSubjectLabel();
  updateChart();
  subjectInput.value = '';
}

function bindEvents() {
  tabStudy.addEventListener('click', () => setActiveTab('study'));
  tabDashboard.addEventListener('click', () => setActiveTab('dashboard'));

  startBtn.addEventListener('click', startTimer);
  pauseBtn.addEventListener('click', pauseTimer);
  resetBtn.addEventListener('click', resetTimer);
  saveSessionBtn.addEventListener('click', handleSaveSession);

  subjectSelect.addEventListener('change', updateSubjectLabel);
  durationSelect.addEventListener('change', syncDurationSelection);
  subjectForm.addEventListener('submit', handleAddSubject);
  recordForm.addEventListener('submit', handleRecordSubmit);
  taskCard.addEventListener('click', () => {
    if (taskCard.classList.contains('flipped')) {
      hideCompleteCard();
    }
  });
}

function init() {
  loadLocalData();
  renderSubjectOptions();
  durationSelect.value = String(DEFAULT_POMODORO_MINUTES);
  syncDurationSelection();
  updateSubjectLabel();
  recordDatetime.value = getLocalDatetimeLocalValue();
  renderHistoryTable();
  updateChart();
  fetchMotivationQuote();
  bindEvents();
  setActiveTab('study');
}

init();
