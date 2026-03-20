// --- DATABASE SETUP ---
const sheetId = '1va4l56PUx1sydhiJGiz9cHRgJaxTTlLJIxwqeKCYhFQ';
const sheetUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv`;

let allQuestions = [];
let groupedSubjects = {};

// --- QUIZ VARIABLES ---
let currentQuizQuestions = [];
let currentQuestionIndex = 0;
let userAnswers = []; 
let timerInterval;
let timeLeft = 0;
let currentSubject = "";
let finalCalculatedScore = 0;

// --- 1. INITIAL LOAD & LOGIN ---
window.onload = () => {
    const savedName = localStorage.getItem('studentName');
    if (savedName) {
        document.getElementById('displayStudentName').innerText = savedName;
        document.getElementById('userProfile').classList.remove('hidden');
        switchScreen('loginScreen', 'dashboardScreen');
        fetchQuestions();
    }
};

function loginStudent() {
    const name = document.getElementById('studentName').value.trim();
    if (name.length > 2) {
        localStorage.setItem('studentName', name);
        document.getElementById('displayStudentName').innerText = name;
        document.getElementById('userProfile').classList.remove('hidden');
        switchScreen('loginScreen', 'dashboardScreen');
        fetchQuestions();
    } else {
        alert("Please enter your full name.");
    }
}

function switchScreen(hideId, showId) {
    document.getElementById(hideId).classList.add('hidden');
    document.getElementById(hideId).classList.remove('active');
    document.getElementById(showId).classList.remove('hidden');
    document.getElementById(showId).classList.add('active');
}

// --- 2. FETCH DATA FROM GOOGLE SHEETS ---
function fetchQuestions() {
    Papa.parse(sheetUrl, {
        download: true,
        header: true,
        complete: function(results) {
            allQuestions = results.data;
            processTests();
        },
        error: function(error) {
            console.error("Error:", error);
            document.getElementById('testList').innerHTML = "<p style='color:red;'>Error loading data. Check Sheet sharing settings.</p>";
        }
    });
}

// --- 3. PROCESS TESTS & TIME LOCK ---
function processTests() {
    groupedSubjects = {};
    allQuestions.forEach(q => {
        if(q.Subject && q.Subject.trim() !== "") {
            if(!groupedSubjects[q.Subject]) {
                groupedSubjects[q.Subject] = [];
            }
            groupedSubjects[q.Subject].push(q);
        }
    });

    const testContainer = document.getElementById('testList');
    testContainer.innerHTML = "";

    Object.keys(groupedSubjects).forEach(subjectName => {
        const div = document.createElement('div');
        div.className = 'test-item';
        div.innerText = `${subjectName} (${groupedSubjects[subjectName].length} Qs)`;
        div.onclick = () => checkTimeLockAndStart(subjectName);
        testContainer.appendChild(div);
    });
}

function checkTimeLockAndStart(subjectName) {
    const dateMatch = subjectName.match(/(\d{2}-\d{2}-\d{2})\s*\((\d{1,2})\)/);
    
    if (dateMatch) {
        const dateStr = dateMatch[1]; 
        const hourStr = dateMatch[2]; 
        
        const parts = dateStr.split('-');
        const testDate = new Date(`20${parts[2]}-${parts[1]}-${parts[0]}T${hourStr.padStart(2, '0')}:00:00`);
        const now = new Date();

        if (now < testDate) {
            alert(`🔒 This test is locked!\nIt will open on: ${dateStr} at ${hourStr}:00`);
            return;
        }
    }
    startQuiz(subjectName);
}

// --- 4. START QUIZ & TIMER ---
function startQuiz(subjectName) {
    currentSubject = subjectName;
    currentQuizQuestions = groupedSubjects[subjectName];
    currentQuestionIndex = 0;
    
    userAnswers = new Array(currentQuizQuestions.length).fill(null).map(() => ({ 
        selected: null, 
        status: 'skipped' 
    }));
    
    switchScreen('dashboardScreen', 'quizScreen');
    renderPalette();
    
    // 1 minute per question timer
    timeLeft = currentQuizQuestions.length * 60; 
    
    timerInterval = setInterval(() => {
        if (timeLeft <= 0) {
            clearInterval(timerInterval);
            submitQuiz(); 
        } else {
            let minutes = Math.floor(timeLeft / 60);
            let seconds = timeLeft % 60;
            document.getElementById('timer').innerText = `⏱ ${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
            timeLeft--;
        }
    }, 1000);
    
    loadQuestion(0);
}

// --- 5. LOAD QUESTION & OPTIONS ---
function loadQuestion(index) {
    currentQuestionIndex = index;
    const q = currentQuizQuestions[index];
    
    document.getElementById('questionText').innerText = `Q${index + 1}. ${q.Question}`;
    
    const imgContainer = document.getElementById('questionImageContainer');
    if (q['Image URL'] && q['Image URL'].trim() !== "") {
        imgContainer.innerHTML = `<img src="${q['Image URL']}" style="max-width: 100%; border-radius: 8px; margin-bottom: 15px;" alt="Question Image">`;
    } else {
        imgContainer.innerHTML = "";
    }

    const optionsContainer = document.getElementById('optionsContainer');
    optionsContainer.innerHTML = "";
    
    const options = ['A', 'B', 'C', 'D'];
    options.forEach(opt => {
        const optionText = q[`Option ${opt}`];
        if (optionText && optionText.trim() !== "") {
            const btn = document.createElement('button');
            const isSelected = userAnswers[index].selected === opt;
            
            btn.style.background = isSelected ? 'var(--accent-color)' : 'white';
            btn.style.color = isSelected ? 'white' : 'black';
            btn.style.border = isSelected ? 'none' : '1px solid #cbd5e1';
            
            btn.innerText = `${opt}. ${optionText}`;
            btn.onclick = () => selectOption(opt);
            optionsContainer.appendChild(btn);
        }
    });

    renderPalette();
}

function selectOption(opt) {
    userAnswers[currentQuestionIndex].selected = opt;
    userAnswers[currentQuestionIndex].status = 'answered';
    loadQuestion(currentQuestionIndex); 
}

function markForReview() {
    userAnswers[currentQuestionIndex].status = 'reviewed';
    nextQuestion();
}

function nextQuestion() {
    if (currentQuestionIndex < currentQuizQuestions.length - 1) {
        loadQuestion(currentQuestionIndex + 1);
    } else {
        alert("This is the last question. Click 'Submit Test' at the top when you are ready.");
    }
}

// --- 6. QUESTION PALETTE ---
function renderPalette() {
    const palette = document.getElementById('questionPalette');
    palette.innerHTML = "";
    
    userAnswers.forEach((ans, index) => {
        const btn = document.createElement('div');
        btn.className = "palette-btn";
        btn.innerText = index + 1;
        
        if (index === currentQuestionIndex) {
            btn.classList.add('palette-current');
        } else if (ans.status === 'answered') {
            btn.classList.add('palette-answered');
        } else if (ans.status === 'reviewed') {
            btn.classList.add('palette-reviewed');
        }
        
        btn.onclick = () => loadQuestion(index);
        palette.appendChild(btn);
    });
}

// --- 7. SUBMIT & RESULTS ---
function submitQuiz() {
    if(confirm("Are you sure you want to submit the test?")) {
        clearInterval(timerInterval);
        switchScreen('quizScreen', 'resultScreen');
        calculateScore();
    }
}

function calculateScore() {
    finalCalculatedScore = 0;
    const reviewContent = document.getElementById('reviewContent');
    reviewContent.innerHTML = "";

    currentQuizQuestions.forEach((q, index) => {
        const userAns = userAnswers[index].selected;
        const correctAns = q['Correct Answer'] ? q['Correct Answer'].trim().toUpperCase() : "";
        
        const isCorrect = userAns === correctAns;
        if (isCorrect) finalCalculatedScore++;

        reviewContent.innerHTML += `
            <div style="margin-bottom: 20px; padding-bottom: 15px; border-bottom: 1px solid #e2e8f0; text-align: left;">
                <p style="font-weight: 600; margin-bottom: 8px;">Q${index + 1}: ${q.Question}</p>
                <p style="color: ${isCorrect ? 'var(--answered)' : 'var(--skipped)'}; margin-bottom: 4px;">
                    ✖ Your Answer: ${userAns || 'Not Attempted'}
                </p>
                <p style="color: var(--answered); font-weight: 500; margin-bottom: 8px;">
                    ✔ Correct Answer: ${correctAns}
                </p>
                ${q.Explanation ? `<p style="font-size: 0.9em; color: #64748b; background: #f8fafc; padding: 10px; border-radius: 6px;">💡 <b>Explanation:</b> ${q.Explanation}</p>` : ''}
            </div>
        `;
    });

    document.getElementById('finalScore').innerText = finalCalculatedScore;
    document.getElementById('totalMarks').innerText = currentQuizQuestions.length;
    document.getElementById('reviewBox').classList.remove('hidden');
}

// --- 8. SEND DATA TO GOOGLE FORM ---
function submitToGoogleForm() {
    const studentName = localStorage.getItem('studentName');
    const scoreText = `${finalCalculatedScore} / ${currentQuizQuestions.length}`;
    
    const formUrl = "https://docs.google.com/forms/d/1sfa06q1CP8PEn7BAH5Rp0yQ-3FlcEHO6GexkIdg5ym0/viewform";
    
    alert(`Your Name: ${studentName}\nYour Score: ${scoreText}\n\nPlease fill these details in the form that opens now.`);
    window.open(formUrl, '_blank');
                                       }
        
