// Global state variables
let allQuestions = [];
let quizQuestions = [];
let currentIndex = 0;
let userAnswers = {}; // key: index, value: selected option letter (A, B, C, D)
let checkedQuestions = {}; // key: index, value: true/false
let timerInterval = null;
let timeSpentSeconds = 0;

// DOM Elements
const homeScreen = document.getElementById('home-screen');
const quizScreen = document.getElementById('quiz-screen');
const resultScreen = document.getElementById('result-screen');

const sourceCheckboxesContainer = document.getElementById('source-checkboxes');
const qCountSelect = document.getElementById('q-count');
const shuffleQuestionsCheckbox = document.getElementById('shuffle-questions');
const shuffleOptionsCheckbox = document.getElementById('shuffle-options');

const startBtn = document.getElementById('start-btn');
const prevBtn = document.getElementById('prev-btn');
const checkBtn = document.getElementById('check-btn');
const nextBtn = document.getElementById('next-btn');
const submitBtn = document.getElementById('submit-btn');
const restartBtn = document.getElementById('restart-btn');

const timerText = document.getElementById('timer-text');
const progressText = document.getElementById('quiz-progress-text');
const progressBar = document.getElementById('quiz-progress-bar');
const questionContainer = document.getElementById('question-container');

const scorePercentText = document.getElementById('score-percent');
const scoreFractionText = document.getElementById('score-fraction');
const resultCircle = document.getElementById('result-circle');
const resultRatingText = document.getElementById('result-rating');
const timeSpentText = document.getElementById('time-spent');
const correctCountText = document.getElementById('correct-count');
const incorrectCountText = document.getElementById('incorrect-count');
const skippedCountText = document.getElementById('skipped-count');
const reviewList = document.getElementById('review-list');
const filterBtns = document.querySelectorAll('.filter-btn');

// Load questions from global questions.js (works offline/file://) or fetch from server
window.addEventListener('DOMContentLoaded', () => {
    if (window.allQuestionsData && window.allQuestionsData.length > 0) {
        allQuestions = window.allQuestionsData;
        initHomeStats();
    } else {
        fetch('questions.json')
            .then(res => res.json())
            .then(data => {
                allQuestions = data;
                initHomeStats();
            })
            .catch(err => {
                console.error('Error loading questions:', err);
                alert('Không thể tải cơ sở dữ liệu câu hỏi. Hãy chắc chắn rằng bạn đã khởi động server.py.');
            });
    }
});

// Initialize Homepage Statistics
function initHomeStats() {
    document.getElementById('total-questions-count').innerText = allQuestions.length;
    
    // Extract unique sources
    const sources = [...new Set(allQuestions.map(q => q.source))];
    document.getElementById('source-files-count').innerText = sources.length;
    
    // Dynamically build source checkboxes
    sourceCheckboxesContainer.innerHTML = '';
    sources.forEach(src => {
        const label = document.createElement('label');
        label.className = 'custom-checkbox';

        const cb = document.createElement('input');
        cb.type = 'checkbox';
        cb.value = src;
        cb.checked = true;

        const span = document.createElement('span');
        span.className = 'checkmark';

        const text = document.createTextNode(' ' + src);

        label.appendChild(cb);
        label.appendChild(span);
        label.appendChild(text);
        sourceCheckboxesContainer.appendChild(label);
    });
}

// Helper to shuffle array
function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
}

// Start Quiz Action
startBtn.addEventListener('click', startQuiz);

function startQuiz() {
    const sourceCbs = document.querySelectorAll('#source-checkboxes input[type="checkbox"]');
    const selectedSources = [];
    sourceCbs.forEach(cb => {
        if (cb.checked) selectedSources.push(cb.value);
    });

    const countSelect = qCountSelect.value;
    const shuffleQs = shuffleQuestionsCheckbox.checked;
    const shuffleOpts = shuffleOptionsCheckbox.checked;
    
    if (selectedSources.length === 0) {
        alert('Vui lòng chọn ít nhất một nguồn câu hỏi.');
        return;
    }
    
    // Filter by selected sources
    let filtered = allQuestions.filter(q => selectedSources.includes(q.source));
    
    if (filtered.length === 0) {
        alert('Không có câu hỏi nào thuộc nguồn đã chọn.');
        return;
    }
    
    // Clone questions to avoid modifying raw database
    quizQuestions = filtered.map(q => JSON.parse(JSON.stringify(q)));
    
    // Shuffle Questions
    if (shuffleQs) {
        shuffleArray(quizQuestions);
    }
    
    // Limit count
    if (countSelect !== 'all') {
        const limit = parseInt(countSelect);
        quizQuestions = quizQuestions.slice(0, limit);
    }
    
    // Shuffle Choices/Options for each question
    if (shuffleOpts) {
        quizQuestions.forEach(q => {
            const originalAnsLetter = q.answer; // e.g. 'B'
            if (!originalAnsLetter || !q.options || q.options.length === 0) return;
            
            // Find correct option content
            const correctOptObj = q.options.find(o => o.startsWith(originalAnsLetter + '.'));
            if (!correctOptObj) return; // if can't match option
            
            const correctTextClean = cleanOptionPrefix(correctOptObj);
            
            // Clean prefixes from options
            let cleanOpts = q.options.map(o => cleanOptionPrefix(o));
            
            // Shuffle clean options
            shuffleArray(cleanOpts);
            
            // Find new index of the correct answer
            const newAnsIndex = cleanOpts.indexOf(correctTextClean);
            const letters = ['A', 'B', 'C', 'D', 'E', 'F'];
            q.answer = letters[newAnsIndex];
            
            // Re-apply prefixes
            q.options = cleanOpts.map((o, idx) => `${letters[idx]}. ${o}`);
        });
    }
    
    // Reset state
    currentIndex = 0;
    userAnswers = {};
    checkedQuestions = {};
    timeSpentSeconds = 0;
    
    // Toggle screens
    switchScreen('quiz-screen');
    
    // Start timer
    timerText.innerText = "00:00";
    if (timerInterval) clearInterval(timerInterval);
    timerInterval = setInterval(() => {
        timeSpentSeconds++;
        timerText.innerText = formatTime(timeSpentSeconds);
    }, 1000);
    
    // Display first question
    displayQuestion();
}

function cleanOptionPrefix(opt) {
    return opt.replace(/^[A-F]\.\s*/, '').trim();
}

// Display Current Question
function displayQuestion() {
    const q = quizQuestions[currentIndex];
    
    // Update progress
    progressText.innerText = `Câu hỏi ${currentIndex + 1} / ${quizQuestions.length}`;
    const pct = ((currentIndex + 1) / quizQuestions.length) * 100;
    progressBar.style.width = `${pct}%`;
    
    // Clear container
    questionContainer.innerHTML = '';
    
    // Source file badge
    const badge = document.createElement('div');
    badge.className = 'source-badge';
    badge.innerText = `Nguồn: ${q.source}`;
    questionContainer.appendChild(badge);
    
    // Question text
    const qText = document.createElement('h2');
    qText.className = 'question-text';
    qText.innerText = q.question;
    questionContainer.appendChild(qText);
    
    // Options List
    const optsList = document.createElement('div');
    optsList.className = 'options-list';
    
    const isChecked = checkedQuestions[currentIndex] === true;
    
    q.options.forEach(opt => {
        const card = document.createElement('div');
        card.className = 'option-card';
        
        const letter = opt.charAt(0); // A, B, C, D
        const content = opt.substring(2).trim();
        
        if (userAnswers[currentIndex] === letter) {
            card.classList.add('selected');
        }
        
        if (isChecked) {
            card.classList.add('disabled');
            if (letter === q.answer) {
                card.classList.add('correct');
            } else if (userAnswers[currentIndex] === letter) {
                card.classList.add('incorrect');
            }
        }
        
        card.innerHTML = `
            <div class="option-marker">${letter}</div>
            <div class="option-content">${content}</div>
        `;
        
        if (!isChecked) {
            card.addEventListener('click', () => {
                selectOption(letter);
            });
        }
        
        optsList.appendChild(card);
    });
    
    questionContainer.appendChild(optsList);
    
    // Update nav/check buttons
    prevBtn.disabled = currentIndex === 0;
    
    if (isChecked) {
        checkBtn.innerHTML = '<i class="fa-solid fa-circle-check"></i> Đã kiểm tra';
        checkBtn.style.opacity = '0.6';
        checkBtn.style.pointerEvents = 'none';
    } else {
        checkBtn.innerHTML = '<i class="fa-solid fa-square-check"></i> Kiểm tra';
        checkBtn.style.opacity = '1';
        checkBtn.style.pointerEvents = 'auto';
    }
    
    if (currentIndex === quizQuestions.length - 1) {
        nextBtn.style.display = 'none';
        submitBtn.style.display = 'inline-flex';
    } else {
        nextBtn.style.display = 'inline-flex';
        submitBtn.style.display = 'none';
    }
}

// Select Option Action
function selectOption(letter) {
    userAnswers[currentIndex] = letter;
    
    // Re-render display to update selection active states
    const cards = document.querySelectorAll('.option-card');
    cards.forEach(c => {
        const marker = c.querySelector('.option-marker').innerText;
        if (marker === letter) {
            c.classList.add('selected');
        } else {
            c.classList.remove('selected');
        }
    });
}

// Navigation Actions
prevBtn.addEventListener('click', () => {
    if (currentIndex > 0) {
        currentIndex--;
        displayQuestion();
    }
});

checkBtn.addEventListener('click', () => {
    const userAns = userAnswers[currentIndex];
    if (!userAns) {
        alert('Vui lòng chọn một đáp án trước khi kiểm tra!');
        return;
    }
    checkedQuestions[currentIndex] = true;
    displayQuestion();
});

nextBtn.addEventListener('click', () => {
    if (currentIndex < quizQuestions.length - 1) {
        currentIndex++;
        displayQuestion();
    }
});

// Submit Quiz Action
submitBtn.addEventListener('click', () => {
    const unansweredCount = quizQuestions.length - Object.keys(userAnswers).length;
    if (unansweredCount > 0) {
        if (!confirm(`Bạn còn ${unansweredCount} câu hỏi chưa trả lời. Bạn vẫn muốn nộp bài?`)) {
            return;
        }
    }
    submitQuiz();
});

function submitQuiz() {
    // Stop timer
    clearInterval(timerInterval);
    
    // Calculate results
    let correct = 0;
    let incorrect = 0;
    let skipped = 0;
    
    quizQuestions.forEach((q, idx) => {
        const userAns = userAnswers[idx];
        if (!userAns) {
            skipped++;
        } else if (userAns === q.answer) {
            correct++;
        } else {
            incorrect++;
        }
    });
    
    // Update stats elements
    correctCountText.innerText = correct;
    incorrectCountText.innerText = incorrect;
    skippedCountText.innerText = skipped;
    timeSpentText.innerText = formatTime(timeSpentSeconds);
    
    const pct = quizQuestions.length > 0 ? Math.round((correct / quizQuestions.length) * 100) : 0;
    scorePercentText.innerText = `${pct}%`;
    scoreFractionText.innerText = `${correct} / ${quizQuestions.length}`;
    
    // Animate SVG Radial Donut Chart
    // circle radius is 50, stroke-dasharray is 2 * PI * r = 314
    const offset = 314.15 - (314.15 * pct) / 100;
    resultCircle.style.strokeDashoffset = offset;
    
    // Update Rating Text & Color
    let rating = "Cần Cố Gắng!";
    let ratingColor = "var(--color-danger)";
    if (pct >= 90) {
        rating = "Xuất Sắc!";
        ratingColor = "var(--color-success)";
    } else if (pct >= 80) {
        rating = "Giỏi!";
        ratingColor = "var(--color-success)";
    } else if (pct >= 65) {
        rating = "Khá!";
        ratingColor = "var(--color-primary)";
    } else if (pct >= 50) {
        rating = "Trung Bình!";
        ratingColor = "var(--text-muted)";
    }
    
    resultRatingText.innerText = rating;
    resultRatingText.style.color = ratingColor;
    resultCircle.style.stroke = ratingColor;
    
    // Render review list
    renderReview('all');
    
    // Toggle active filter button
    filterBtns.forEach(btn => btn.classList.remove('active'));
    document.querySelector('.filter-btn[data-filter="all"]').classList.add('active');
    
    // Transition Screen
    switchScreen('result-screen');
}

// Render Review List
function renderReview(filter = 'all') {
    reviewList.innerHTML = '';
    
    quizQuestions.forEach((q, idx) => {
        const userAns = userAnswers[idx];
        const isCorrect = userAns === q.answer;
        
        // Apply filter
        if (filter === 'correct' && !isCorrect) return;
        if (filter === 'wrong' && isCorrect) return;
        
        const card = document.createElement('div');
        card.className = `review-card ${isCorrect ? 'correct-q' : 'wrong-q'}`;
        
        // Header
        const header = document.createElement('div');
        header.className = 'review-card-header';
        header.innerHTML = `
            <span class="review-num">CÂU HỎI ${idx + 1} (Nguồn: ${q.source})</span>
            <span class="review-badge ${isCorrect ? 'correct' : 'wrong'}">
                ${isCorrect ? 'ĐÚNG' : (userAns ? 'SAI' : 'BỎ QUA')}
            </span>
        `;
        card.appendChild(header);
        
        // Question Text
        const qText = document.createElement('p');
        qText.className = 'review-q-text';
        qText.innerText = q.question;
        card.appendChild(qText);
        
        // Options list
        const optsList = document.createElement('div');
        optsList.className = 'review-options';
        
        q.options.forEach(opt => {
            const letter = opt.charAt(0);
            const content = opt.substring(2).trim();
            const optDiv = document.createElement('div');
            optDiv.className = 'review-opt';
            optDiv.innerText = opt;
            
            // Check status styling
            if (letter === q.answer) {
                optDiv.classList.add('correct-ans');
                optDiv.innerHTML = `${opt} <i class="fa-solid fa-circle-check opt-status-icon text-success"></i>`;
            } else if (userAns === letter) {
                optDiv.classList.add('user-selected');
                optDiv.innerHTML = `${opt} <i class="fa-solid fa-circle-xmark opt-status-icon text-danger"></i>`;
            }
            
            optsList.appendChild(optDiv);
        });
        
        card.appendChild(optsList);
        reviewList.appendChild(card);
    });
    
    if (reviewList.innerHTML === '') {
        reviewList.innerHTML = `<p class="text-muted text-center py-4">Không có câu hỏi nào thuộc bộ lọc này.</p>`;
    }
}

// Review filters click events
filterBtns.forEach(btn => {
    btn.addEventListener('click', (e) => {
        filterBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        const filter = btn.getAttribute('data-filter');
        renderReview(filter);
    });
});

// Restart Quiz Action
restartBtn.addEventListener('click', () => {
    switchScreen('home-screen');
});

// Helper to switch active screen
function switchScreen(screenId) {
    const screens = document.querySelectorAll('.screen');
    screens.forEach(s => {
        s.classList.remove('active');
    });
    
    const target = document.getElementById(screenId);
    target.classList.add('active');
    
    // If returning home, restore sidebar configs
    if (screenId === 'home-screen') {
        document.querySelector('.sidebar-menu').style.display = 'block';
    } else {
        // Hide config menu in sidebar when quiz is active to focus the user
        document.querySelector('.sidebar-menu').style.display = 'none';
    }
}

// Helper to format seconds to MM:SS
function formatTime(seconds) {
    const m = Math.floor(seconds / 60).toString().padStart(2, '0');
    const s = (seconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
}
