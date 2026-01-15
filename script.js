// script.js - Quiz Application Logic
document.addEventListener('DOMContentLoaded', () => {
    // ========== DOM ELEMENTS ==========
    const landingScreen = document.getElementById('landing');
    const quizScreen = document.getElementById('quiz-screen');
    const resultsScreen = document.getElementById('results-screen');
    const quizCodeInput = document.getElementById('quizCode');
    const startBtn = document.getElementById('startBtn');
    const quizTitle = document.getElementById('quiz-title');
    const questionCounter = document.getElementById('question-counter');
    const timerDisplay = document.getElementById('timer');
    const progressBar = document.getElementById('progress');
    const questionText = document.getElementById('question-text');
    const optionsContainer = document.getElementById('options-container');
    const prevBtn = document.getElementById('prevBtn');
    const nextBtn = document.getElementById('nextBtn');
    const submitBtn = document.getElementById('submitBtn');
    const scoreText = document.getElementById('score');
    const totalQuestions = document.getElementById('total');
    const percentage = document.getElementById('percentage');
    const reviewContainer = document.getElementById('review-container');
    const restartBtn = document.getElementById('restartBtn');

    // ========== QUIZ STATE ==========
    let currentQuiz = null;
    let currentQuestionIndex = 0;
    let userAnswers = [];
    let timeLeft = 0;
    let timerInterval = null;

    // ========== EVENT LISTENERS ==========
    startBtn.addEventListener('click', startQuizHandler);
    prevBtn.addEventListener('click', showPreviousQuestion);
    nextBtn.addEventListener('click', showNextQuestion);
    submitBtn.addEventListener('click', submitQuiz);
    restartBtn.addEventListener('click', restartQuiz);
    quizCodeInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') startBtn.click();
    });

    // ========== MAIN FUNCTIONS ==========
    
    // Start Quiz Button Handler
    async function startQuizHandler() {
        const code = quizCodeInput.value.trim().toUpperCase();
        if (!code) {
            alert('Please enter a quiz code.');
            return;
        }
        await loadQuiz(code);
    }

    // Load Quiz JSON File
    async function loadQuiz(code) {
        try {
            showLoading(true);
            
            // Try different possible file paths
            const paths = [
                `quizzes/${code}.json`,  // Primary path - quizzes folder
                `/${code}.json`,         // Root folder fallback
                `data/${code}.json`,     // Data folder fallback
                `${code}.json`           // Current directory
            ];

            let response;
            for (const path of paths) {
                try {
                    response = await fetch(path);
                    if (response.ok) {
                        console.log(`Found quiz at: ${path}`);
                        break;
                    }
                } catch (error) {
                    console.log(`Failed to load from: ${path}`);
                    continue;
                }
            }

            if (!response || !response.ok) {
                throw new Error(`Quiz "${code}" not found. Check the quiz code or contact your teacher.`);
            }

            currentQuiz = await response.json();
            initializeQuiz();
            
        } catch (error) {
            alert(`Error: ${error.message}`);
            console.error('Quiz loading error:', error);
        } finally {
            showLoading(false);
        }
    }

    // Initialize Quiz
    function initializeQuiz() {
        // Switch to quiz screen
        landingScreen.style.display = 'none';
        quizScreen.style.display = 'block';
        resultsScreen.style.display = 'none';

        // Set quiz title
        quizTitle.textContent = currentQuiz.quizTitle || `Quiz: ${currentQuiz.quizCode}`;
        
        // Initialize state
        timeLeft = currentQuiz.timeLimit || 600; // Default 10 minutes
        userAnswers = new Array(currentQuiz.questions.length).fill(null);
        currentQuestionIndex = 0;

        // Start timer
        startTimer();
        
        // Show first question
        displayQuestion(0);
    }

    // Timer Functions
    function startTimer() {
        updateTimerDisplay();
        timerInterval = setInterval(() => {
            timeLeft--;
            updateTimerDisplay();
            if (timeLeft <= 0) {
                clearInterval(timerInterval);
                submitQuiz();
            }
        }, 1000);
    }

    function updateTimerDisplay() {
        const minutes = Math.floor(timeLeft / 60);
        const seconds = timeLeft % 60;
        timerDisplay.textContent = `Time: ${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        
        // Warning when less than 1 minute
        if (timeLeft < 60) {
            timerDisplay.style.color = '#dc3545';
            timerDisplay.style.fontWeight = 'bold';
        }
    }

    // Display Question
    function displayQuestion(index) {
        currentQuestionIndex = index;
        const question = currentQuiz.questions[index];

        // Update question counter
        questionCounter.textContent = `Question ${index + 1} of ${currentQuiz.questions.length}`;
        
        // Update progress bar
        const progress = ((index + 1) / currentQuiz.questions.length) * 100;
        progressBar.style.width = `${progress}%`;

        // Display question text
        questionText.textContent = question.question;

        // Clear and create options
        optionsContainer.innerHTML = '';
        question.options.forEach((option, i) => {
            const optionElement = document.createElement('div');
            optionElement.className = 'option';
            if (userAnswers[index] === i) {
                optionElement.classList.add('selected');
            }
            optionElement.textContent = `${String.fromCharCode(65 + i)}) ${option}`; // A), B), etc.
            optionElement.addEventListener('click', () => selectOption(i));
            optionsContainer.appendChild(optionElement);
        });

        // Update navigation buttons
        prevBtn.disabled = index === 0;
        nextBtn.disabled = false;
        
        const isLastQuestion = index === currentQuiz.questions.length - 1;
        submitBtn.style.display = isLastQuestion ? 'inline-block' : 'none';
        nextBtn.textContent = isLastQuestion ? 'Review Answers' : 'Next Question';
    }

    // Select Option
    function selectOption(optionIndex) {
        userAnswers[currentQuestionIndex] = optionIndex;
        
        // Update UI
        const options = document.querySelectorAll('.option');
        options.forEach((opt, i) => {
            opt.classList.toggle('selected', i === optionIndex);
        });
    }

    // Navigation
    function showPreviousQuestion() {
        if (currentQuestionIndex > 0) {
            displayQuestion(currentQuestionIndex - 1);
        }
    }

    function showNextQuestion() {
        if (currentQuestionIndex < currentQuiz.questions.length - 1) {
            displayQuestion(currentQuestionIndex + 1);
        } else {
            submitQuiz();
        }
    }

    // Submit Quiz
    function submitQuiz() {
        clearInterval(timerInterval);
        
        // Calculate score
        let score = 0;
        currentQuiz.questions.forEach((question, index) => {
            if (userAnswers[index] === question.correct) {
                score++;
            }
        });

        // Show results screen
        quizScreen.style.display = 'none';
        resultsScreen.style.display = 'block';

        // Display results
        scoreText.textContent = score;
        totalQuestions.textContent = currentQuiz.questions.length;
        const percent = Math.round((score / currentQuiz.questions.length) * 100);
        percentage.textContent = `${percent}%`;

        // Display review
        displayReview(score, percent);
    }

    // Display Review
    function displayReview(score, percent) {
        reviewContainer.innerHTML = '';
        
        currentQuiz.questions.forEach((question, index) => {
            const reviewItem = document.createElement('div');
            const isCorrect = userAnswers[index] === question.correct;
            
            reviewItem.className = `review-item ${isCorrect ? 'correct' : 'incorrect'}`;
            
            const userAnswer = userAnswers[index] !== null 
                ? question.options[userAnswers[index]] 
                : 'Not answered';
            const correctAnswer = question.options[question.correct];
            
            reviewItem.innerHTML = `
                <div class="review-header">
                    <strong>Question ${index + 1}:</strong> ${question.question}
                </div>
                <div class="review-body">
                    <div>Your answer: <span class="${isCorrect ? 'correct-answer' : 'incorrect-answer'}">${userAnswer}</span></div>
                    ${!isCorrect ? `<div>Correct answer: <span class="correct-answer">${correctAnswer}</span></div>` : ''}
                    ${question.explanation ? `<div class="explanation">💡 ${question.explanation}</div>` : ''}
                </div>
            `;
            
            reviewContainer.appendChild(reviewItem);
        });
    }

    // Restart Quiz
    function restartQuiz() {
        resultsScreen.style.display = 'none';
        landingScreen.style.display = 'block';
        quizCodeInput.value = '';
        quizCodeInput.focus();
        
        // Reset state
        currentQuiz = null;
        userAnswers = [];
        currentQuestionIndex = 0;
        
        // Reset timer display
        timerDisplay.style.color = '';
        timerDisplay.style.fontWeight = '';
    }

    // Loading State
    function showLoading(loading) {
        if (loading) {
            startBtn.textContent = 'Loading...';
            startBtn.disabled = true;
        } else {
            startBtn.textContent = 'Start Quiz';
            startBtn.disabled = false;
        }
    }

    // Initialize app
    console.log('Quiz app initialized successfully');
});