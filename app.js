// Google Sheet CSV Export Link (Apni sheet ID idhar update karein)
const sheetId = '1va4l56PUx1sydhiJGiz9cHRgJaxTTlLJIxwqeKCYhFQ';
const sheetUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv`;

let allQuestions = [];
let groupedSubjects = {};

// 1. Initial Logic: Check Login State
window.onload = () => {
    const savedName = localStorage.getItem('studentName');
    if (savedName) {
        document.getElementById('displayStudentName').innerText = savedName;
        document.getElementById('userProfile').classList.remove('hidden');
        switchScreen('loginScreen', 'dashboardScreen');
        fetchQuestions(); // Load data from Google Sheets
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

// 2. Fetch Data from Google Sheets
function fetchQuestions() {
    Papa.parse(sheetUrl, {
        download: true,
        header: true, // Uses first row as keys (Question, Option A, etc.)
        complete: function(results) {
            allQuestions = results.data;
            processTests();
        },
        error: function(error) {
            console.error("Error fetching data:", error);
            document.getElementById('testList').innerHTML = "<p>Error loading tests. Check internet connection.</p>";
        }
    });
}

// 3. Process Categories & Dynamic Time Lock
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
        div.innerText = subjectName + ` (${groupedSubjects[subjectName].length} Qs)`;
        
        div.onclick = () => checkTimeLockAndStart(subjectName);
        testContainer.appendChild(div);
    });
}

function checkTimeLockAndStart(subjectName) {
    // Regex to find dates like "21-03-26 (9)" inside the subject string
    const dateMatch = subjectName.match(/(\d{2}-\d{2}-\d{2})\s*\((\d{1,2})\)/);
    
    if (dateMatch) {
        const dateStr = dateMatch[1]; // "21-03-26"
        const hourStr = dateMatch[2]; // "9"
        
        // Convert "DD-MM-YY" to a valid Date format for checking
        const parts = dateStr.split('-');
        const testDate = new Date(`20${parts[2]}-${parts[1]}-${parts[0]}T${hourStr.padStart(2, '0')}:00:00`);
        const now = new Date();

        if (now < testDate) {
            alert(`🔒 This test is locked!\nIt will open on: ${dateStr} at ${hourStr}:00`);
            return;
        }
    }
    
    // If not locked or no date format found, start quiz
    startQuiz(subjectName);
}

function startQuiz(subjectName) {
    alert("Starting Test: " + subjectName + "\n(Quiz engine module will load here)");
    switchScreen('dashboardScreen', 'quizScreen');
    // I will provide the Quiz Engine (Timer, Palette, Images) in the next step!
}
