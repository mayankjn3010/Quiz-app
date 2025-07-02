document.addEventListener("DOMContentLoaded", () => {
  let selectedBlocks = []
  let selectedEmails = []
  let currentQuizId = null

  // Load available blocks
  loadBlocks()

  // Event listeners
  document.getElementById("logoutBtn").addEventListener("click", logout)
  document.getElementById("createQuizBtn").addEventListener("click", createQuiz)
  document.getElementById("sendQuizBtn").addEventListener("click", showSendQuizSection)
  document.getElementById("addEmailBtn").addEventListener("click", addEmail)
  document.getElementById("sendToSelectedBtn").addEventListener("click", sendQuizToSelected)

  async function loadBlocks() {
    try {
      const response = await fetch("/api/blocks")
      const blocks = await response.json()

      const blocksGrid = document.getElementById("blocksGrid")
      blocksGrid.innerHTML = ""

      blocks.forEach((block) => {
        const blockCard = document.createElement("div")
        blockCard.className = "block-card"
        blockCard.textContent = block
        blockCard.addEventListener("click", () => toggleBlock(block, blockCard))
        blocksGrid.appendChild(blockCard)
      })
    } catch (error) {
      console.error("Error loading blocks:", error)
    }
  }

  
  function toggleBlock(block, element) {
    if (selectedBlocks.includes(block)) {
      selectedBlocks = selectedBlocks.filter((b) => b !== block)
      element.classList.remove("selected")
    } else {
      if (selectedBlocks.length < 4) {
        selectedBlocks.push(block)
        element.classList.add("selected")
      } else {
        alert("You can select maximum 4 blocks")
        return
      }
    }

    const createBtn = document.getElementById("createQuizBtn")
    createBtn.disabled = selectedBlocks.length < 3
  }

  async function createQuiz() {
    const difficulty = document.getElementById("difficulty").value

    showLoading(true)

    try {
      const response = await fetch("/api/quiz/create", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          selectedBlocks,
          difficultyLevel: difficulty,
        }),
      })

      const data = await response.json()

      if (data.success) {
        currentQuizId = data.quizId
        showQuizCreated()
      } else {
        alert("Error creating quiz: " + data.error)
      }
    } catch (error) {
      alert("Error creating quiz: " + error.message)
    } finally {
      showLoading(false)
    }
  }

  function showQuizCreated() {
    document.getElementById("blockSelection").style.display = "none"
    document.getElementById("quizCreated").style.display = "block"

    const selectedBlocksDiv = document.getElementById("selectedBlocks")
    selectedBlocksDiv.innerHTML = `
            <h3>Selected Topics:</h3>
            <ul>
                ${selectedBlocks.map((block) => `<li>${block}</li>`).join("")}
            </ul>
        `
  }

  function showSendQuizSection() {
    document.getElementById("quizCreated").style.display = "none"
    document.getElementById("sendQuizSection").style.display = "block"
  }

  function addEmail() {
    const emailInput = document.getElementById("candidateEmail")
    const email = emailInput.value.trim()

    if (!email) {
      alert("Please enter an email address")
      return
    }

    if (!isValidEmail(email)) {
      alert("Please enter a valid email address")
      return
    }

    if (selectedEmails.includes(email)) {
      alert("Email already added")
      return
    }

    selectedEmails.push(email)
    emailInput.value = ""
    updateEmailList()
  }

  function updateEmailList() {
    const emailListItems = document.getElementById("emailListItems")
    emailListItems.innerHTML = ""

    selectedEmails.forEach((email, index) => {
      const li = document.createElement("li")
      li.innerHTML = `
                <span>${email}</span>
                <button class="remove-email" onclick="removeEmail(${index})">Remove</button>
            `
      emailListItems.appendChild(li)
    })

    const sendBtn = document.getElementById("sendToSelectedBtn")
    sendBtn.disabled = selectedEmails.length === 0
  }

  window.removeEmail = (index) => {
    selectedEmails.splice(index, 1)
    updateEmailList()
  }

  async function sendQuizToSelected() {
    if (selectedEmails.length === 0) {
      alert("Please add at least one email address")
      return
    }

    showLoading(true)

    try {
      const response = await fetch(`/api/quiz/${currentQuizId}/send`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          emails: selectedEmails,
        }),
      })

      const data = await response.json()

      if (data.success) {
        alert(data.message)
        // Reset form
        selectedBlocks = []
        selectedEmails = []
        currentQuizId = null
        resetForm()
      } else {
        alert("Error sending quiz: " + data.error)
      }
    } catch (error) {
      alert("Error sending quiz: " + error.message)
    } finally {
      showLoading(false)
    }
  }

  function resetForm() {
    document.getElementById("blockSelection").style.display = "block"
    document.getElementById("quizCreated").style.display = "none"
    document.getElementById("sendQuizSection").style.display = "none"

    // Reset block selection
    document.querySelectorAll(".block-card").forEach((card) => {
      card.classList.remove("selected")
    })

    document.getElementById("createQuizBtn").disabled = true
    document.getElementById("emailListItems").innerHTML = ""
    document.getElementById("sendToSelectedBtn").disabled = true
  }

  function isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return emailRegex.test(email)
  }

  function showLoading(show) {
    document.getElementById("loading").style.display = show ? "block" : "none"
  }

  function logout() {
    window.location.href = "/"
  }
})
