document.addEventListener("DOMContentLoaded", () => {
  // Initialize variables
  const urlParams = new URLSearchParams(window.location.search);
  let quizId = window.location.pathname.split('/').pop();
  const candidateEmail = urlParams.get("email");

  if (!quizId || !candidateEmail) {
    alert("Invalid quiz link");
    window.location.href = "/";
    return;
  }

  // Debug button click
  const enterBtn = document.getElementById("enterQuizBtn");
  console.log("Button works!");
  if (enterBtn) {
    enterBtn.addEventListener("click", function(e) {
      console.log("Yes button clicked - debug");
      e.preventDefault();
      startInstructions();
    });
  } else {
    console.error("Yes button not found in DOM");
  }
  let quizData = null
  let currentQuestionIndex = 0
  const responses = {}
  let candidateId = null
  let quizTimer = null
  let instructionTimer = null


  // Get quiz ID and email from URL
  // const pathParts = window.location.pathname.split('/').filter(part => part.trim() !== '');
  // quizId = pathParts[pathParts.length - 1];
  candidateEmail = urlParams.get("email");

  if (!quizId || !candidateEmail) {
    alert("Invalid quiz link. Please check the URL and try again.");
    window.location.href = "/"; // Redirect to home if invalid
    return;
  }

  // Event listeners

  document.getElementById("cancelQuizBtn").addEventListener("click", () => window.close())
  document.getElementById("prevBtn").addEventListener("click", previousQuestion)
  document.getElementById("nextBtn").addEventListener("click", nextQuestion)
  document.getElementById("submitQuizBtn").addEventListener("click", showSubmitConfirmation)
  document.getElementById("confirmSubmitBtn").addEventListener("click", submitQuiz)
  document.getElementById("cancelSubmitBtn").addEventListener("click", hideSubmitConfirmation)
  document.getElementById("autoSubmitBtn").addEventListener("click", submitQuiz)

  function startInstructions() {
    document.getElementById("entryPopup").style.display = "none"
    document.getElementById("instructionsPage").style.display = "block"

    // Start 5-minute instruction timer
    let instructionTime = 0.1 * 60 // 5 minutes in seconds
    instructionTimer = setInterval(() => {
      const minutes = Math.floor(instructionTime / 60)
      const seconds = instructionTime % 60
      document.getElementById("instructionTimer").textContent =
        `${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`

      instructionTime--

      if (instructionTime < 0) {
        clearInterval(instructionTimer)
        startQuiz()
      }
    }, 1000)
  }

  async function startQuiz() {
    document.getElementById("instructionsPage").style.display = "none";
    document.getElementById("loading").style.display = "block"; // Show loading indicator
  
    try {
      const response = await fetch(`/api/quiz/${quizId}?email=${encodeURIComponent(candidateEmail)}`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (data.error) {
        throw new Error(data.error);
      }
  
      quizData = data.quiz;
      candidateId = data.candidateId;
      initializeQuiz();
    } catch (error) {
      console.error("Quiz loading error:", error);
      alert(`Failed to load quiz: ${error.message}`);
      window.location.href = "/"; // Redirect on error
    } finally {
      document.getElementById("loading").style.display = "none";
    }
  }

// Update timer functions to clear properly
function startQuizTimer(duration) {
  clearInterval(quizTimer); // Clear any existing timer
  let quizTime = duration;
  
  quizTimer = setInterval(() => {
    const minutes = Math.floor(quizTime / 60);
    const seconds = quizTime % 60;
    document.getElementById("quizTimer").textContent = 
      `${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;

    if (--quizTime < 0) {
      clearInterval(quizTimer);
      showAutoSubmitPopup();
    }
  }, 1000);
}
// Update in quiz.js
function updateQuestionNavigation() {
  const navItems = document.querySelectorAll(".question-nav-item");
  navItems.forEach((item, index) => {
    item.classList.remove("current", "answered", "visited");
    
    if (index === currentQuestionIndex) {
      item.classList.add("current");
    } else if (responses[quizData.questions[index]._id]) {
      item.classList.add("answered");
    } else if (index < currentQuestionIndex) {
      item.classList.add("visited");
    }
  });
}

  function initializeQuiz() {
    document.getElementById("quizInterface").style.display = "block"
    document.getElementById("quizTitle").textContent = quizData.title

    // Initialize question navigation
    const questionNav = document.getElementById("questionNav")
    questionNav.innerHTML = ""

    for (let i = 0; i < quizData.questions.length; i++) {
      const navItem = document.createElement("div")
      navItem.className = "question-nav-item"
      navItem.textContent = i + 1
      navItem.addEventListener("click", () => goToQuestion(i))
      questionNav.appendChild(navItem)
    }

    // Start quiz timer (30 minutes)
    let quizTime = 1 * 60 // 30 minutes in seconds
    quizTimer = setInterval(() => {
      const minutes = Math.floor(quizTime / 60)
      const seconds = quizTime % 60
      document.getElementById("quizTimer").textContent =
        `${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`

      quizTime--

      if (quizTime < 0) {
        clearInterval(quizTimer)
        showAutoSubmitPopup()
      }
    }, 1000)

    displayQuestion(0)
  }

  function displayQuestion(index) {
    currentQuestionIndex = index
    const question = quizData.questions[index]

    document.getElementById("questionNumber").textContent = `Question ${index + 1} of ${quizData.questions.length}`
    document.getElementById("questionText").textContent = question.question

    // Display options
    const optionsContainer = document.getElementById("optionsContainer")
    optionsContainer.innerHTML = ""

    question.options.forEach((option, optionIndex) => {
      const optionDiv = document.createElement("div")
      optionDiv.className = "option"

      const isSelected = responses[question._id] === option
      if (isSelected) {
        optionDiv.classList.add("selected")
      }

      optionDiv.innerHTML = `
                <input type="radio" name="question_${question._id}" value="${option}" ${isSelected ? "checked" : ""}>
                <span>${option}</span>
            `

      optionDiv.addEventListener("click", () => selectOption(question._id, option, optionDiv))
      optionsContainer.appendChild(optionDiv)
    })

    // Update navigation buttons
    document.getElementById("prevBtn").disabled = index === 0
    document.getElementById("nextBtn").disabled = index === quizData.questions.length - 1

    // Update question navigation
    updateQuestionNavigation()
  }

  function selectOption(questionId, option, optionElement) {
    // Remove previous selection
    document.querySelectorAll(".option").forEach((opt) => opt.classList.remove("selected"))

    // Add selection to clicked option
    optionElement.classList.add("selected")

    // Update radio button
    const radio = optionElement.querySelector('input[type="radio"]')
    radio.checked = true

    // Store response
    responses[questionId] = option

    // Update navigation
    updateQuestionNavigation()
  }

  function updateQuestionNavigation() {
    const navItems = document.querySelectorAll(".question-nav-item")
    navItems.forEach((item, index) => {
      item.classList.remove("current", "answered")

      if (index === currentQuestionIndex) {
        item.classList.add("current")
      }

      const questionId = quizData.questions[index]._id
      if (responses[questionId]) {
        item.classList.add("answered")
      }
    })
  }

  function goToQuestion(index) {
    displayQuestion(index)
  }

  function previousQuestion() {
    if (currentQuestionIndex > 0) {
      displayQuestion(currentQuestionIndex - 1)
    }
  }

  function nextQuestion() {
    if (currentQuestionIndex < quizData.questions.length - 1) {
      displayQuestion(currentQuestionIndex + 1)
    }
  }

  function showSubmitConfirmation() {
    document.getElementById("submitPopup").style.display = "block"
  }

  function hideSubmitConfirmation() {
    document.getElementById("submitPopup").style.display = "none"
  }

  function showAutoSubmitPopup() {
    const popup = document.getElementById("autoSubmitPopup");
    if (popup) {
      popup.style.display = "flex"; // Changed to flex to center content
      // Auto-submit after 5 seconds if user doesn't click
      setTimeout(submitQuiz, 5000);
    }
  }

// Update the showAutoSubmitPopup function in quiz.js
function showAutoSubmitPopup() {
  const popup = document.getElementById("autoSubmitPopup");
  if (popup) {
    popup.style.display = "flex"; // Changed to flex to center content
    // Auto-submit after 5 seconds if user doesn't click
    setTimeout(submitQuiz, 5000);
  }
}

// Update the submitQuiz function to ensure it works from the popup
async function submitQuiz() {
  try {
    // Clear timers
    if (quizTimer) clearInterval(quizTimer);
    if (instructionTimer) clearInterval(instructionTimer);

    // Hide any popups
    document.getElementById("autoSubmitPopup").style.display = "none";
    document.getElementById("submitPopup").style.display = "none";

    // Show loading indicator
    document.getElementById("loading").style.display = "flex";

    const response = await fetch(`/api/quiz/${quizId}/submit`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        candidateId,
        responses,
      }),
    });

    const data = await response.json();

    if (data.success) {
      showCongratulations(data);
      // Send score via email
      await sendScoreEmail(data);
    } else {
      alert("Error submitting quiz: " + (data.error || "Unknown error"));
    }
  } catch (error) {
    console.error("Submission error:", error);
    alert("Error submitting quiz: " + error.message);
  } finally {
    document.getElementById("loading").style.display = "none";
  }
}

// Add this new function to send score email
async function sendScoreEmail(scoreData) {
  try {
    const response = await fetch(`/api/quiz/${quizId}/send-score`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        candidateEmail,
        score: scoreData.score,
        totalQuestions: scoreData.totalQuestions,
        percentage: scoreData.percentage
      }),
    });
    
    const result = await response.json();
    if (!result.success) {
      console.error("Failed to send score email:", result.error);
    }
  } catch (error) {
    console.error("Error sending score email:", error);
  }
}

  function showCongratulations(scoreData) {
    // Hide all other sections
    document.getElementById("quizInterface").style.display = "none"
    document.getElementById("submitPopup").style.display = "none"
    document.getElementById("autoSubmitPopup").style.display = "none"

    // Show congratulations
    document.getElementById("congratulationsPage").style.display = "block"

    // Display score
    // const scoreDisplay = document.getElementById("scoreDisplay")
    // scoreDisplay.innerHTML = `
    //         <h3>Your Score</h3>
    //         <div class="score">${scoreData.score}/${scoreData.totalQuestions}</div>
    //         <p>Percentage: ${scoreData.percentage}%</p>
    //     `
  }

  // Prevent page refresh/close during quiz
  window.addEventListener("beforeunload", (e) => {
    if (quizData && !document.getElementById("congratulationsPage").style.display) {
      e.preventDefault()
      e.returnValue = ""
    }
  })
})
// Save progress in session storage
function saveProgress() {
  sessionStorage.setItem(`quizProgress_${quizId}`, JSON.stringify({
    responses,
    currentQuestionIndex,
    timeRemaining: getTimeRemaining()
  }));
}

// Load progress if available
function loadProgress() {
  const saved = sessionStorage.getItem(`quizProgress_${quizId}`);
  if (saved) {
    const progress = JSON.parse(saved);
    Object.assign(responses, progress.responses);
    currentQuestionIndex = progress.currentQuestionIndex;
    return progress.timeRemaining;
  }
  return null;
}