const express = require("express")
const mongoose = require("mongoose")
const session = require("express-session")
const nodemailer = require("nodemailer")
const bcrypt = require("bcryptjs")
const cors = require("cors")
const path = require('path') // Add this at the top
require("dotenv").config()

const app = express()

// Middleware
app.use(express.json())
app.use(express.static(path.join(__dirname, 'public'))) 
app.use(express.static(__dirname))
app.use(express.urlencoded({ extended: true }))
app.use(express.static("."))
app.use(cors({
  origin: "http://localhost:3000",
  credentials: true
}))
app.use(
  session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: { secure: false },
  }),
)

// MongoDB Connection
mongoose
  .connect(process.env.MONGODB_URI)
  .then(() => console.log("Connected to MongoDB"))
  .catch((err) => console.error("MongoDB connection error:", err))

// Schemas
const questionSchema = new mongoose.Schema({
  block: String,
  question: String,
  correctAnswer: String,
  incorrectOptions: [String],
  difficulty: { type: String, enum: ["easy", "medium", "hard"] },
})

const quizSchema = new mongoose.Schema({
  title: String,
  selectedBlocks: [String],
  questions: [questionSchema],
  difficultyLevel: { type: String, enum: ["easy", "medium", "hard"] },
  createdBy: String,
  createdAt: { type: Date, default: Date.now },
})

const candidateSchema = new mongoose.Schema({
  email: String,
  quizId: { type: mongoose.Schema.Types.ObjectId, ref: "Quiz" },
  hasSubmitted: { type: Boolean, default: false },
  submittedAt: Date,
  responses: Map,
  score: Number,
  startedAt: Date,
})

const Question = mongoose.model("Question", questionSchema)
const Quiz = mongoose.model("Quiz", quizSchema)
const Candidate = mongoose.model("Candidate", candidateSchema)

// Email transporter
const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST,
  port: process.env.EMAIL_PORT,
  secure: false,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
})


const sampleQuestions = [
  {
    block: "JavaScript Basics",
    question: "What is a closure in JavaScript?",
    correctAnswer: "A function with access to outer scope variables",
    incorrectOptions: [
      "A global variable",
      "An object method",
      "A loop structure",
      "A conditional statement",
      "An array method",
    ],
    difficulty: "medium",
  },
  {
    block: "JavaScript Basics",
    question: "Which method is used to add an element to the end of an array?",
    correctAnswer: "push()",
    incorrectOptions: ["pop()", "shift()", "unshift()", "splice()", "concat()"],
    difficulty: "easy",
  },
  {
    block: "Node.js",
    question: "What is the purpose of package.json?",
    correctAnswer: "To manage project dependencies and metadata",
    incorrectOptions: [
      "To store database connections",
      "To configure server settings",
      "To define HTML structure",
      "To manage CSS styles",
      "To handle user authentication",
    ],
    difficulty: "easy",
  },
  {
    block: "React",
    question: "What is JSX?",
    correctAnswer: "JavaScript XML syntax extension",
    incorrectOptions: [
      "A database query language",
      "A CSS framework",
      "A server-side language",
      "A testing library",
      "A package manager",
    ],
    difficulty: "medium",
  },
  {
    block: "MongoDB",
    question: "What type of database is MongoDB?",
    correctAnswer: "NoSQL document database",
    incorrectOptions: [
      "Relational database",
      "Graph database",
      "Key-value store",
      "Column-family database",
      "In-memory database",
    ],
    difficulty: "easy",
  },
  {
    block: "Express.js",
    question: "What is middleware in Express.js?",
    correctAnswer: "Functions that execute during request-response cycle",
    incorrectOptions: [
      "Database connection methods",
      "HTML template engines",
      "CSS preprocessing tools",
      "File upload handlers",
      "Authentication tokens",
    ],
    difficulty: "medium",
  },
  {
    block: "HTML/CSS",
    question: "What does CSS stand for?",
    correctAnswer: "Cascading Style Sheets",
    incorrectOptions: [
      "Computer Style Sheets",
      "Creative Style Sheets",
      "Colorful Style Sheets",
      "Common Style Sheets",
      "Complex Style Sheets",
    ],
    difficulty: "easy",
  },
  {
    block: "Git",
    question: "What command is used to create a new branch in Git?",
    correctAnswer: "git checkout -b",
    incorrectOptions: ["git branch new", "git create branch", "git new-branch", "git make branch", "git add branch"],
    difficulty: "medium",
  },
  {
    block: "Algorithms",
    question: "What is the time complexity of binary search?",
    correctAnswer: "O(log n)",
    incorrectOptions: ["O(n)", "O(n²)", "O(1)", "O(n log n)", "O(2^n)"],
    difficulty: "hard",
  },
  {
    block: "System Design",
    question: "What is load balancing?",
    correctAnswer: "Distributing incoming requests across multiple servers",
    incorrectOptions: [
      "Storing data in multiple databases",
      "Compressing file sizes",
      "Optimizing database queries",
      "Caching frequently used data",
      "Encrypting sensitive information",
    ],
    difficulty: "hard",
  },
]

// Initialize sample data
async function initializeData() {
  try {
    const questionCount = await Question.countDocuments()
    if (questionCount === 0) {
      await Question.insertMany(sampleQuestions)
      console.log("Sample questions inserted")
    }
  } catch (error) {
    console.error("Error initializing data:", error)
  }
}

initializeData()

// Routes
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "index.html"))
})

app.get("/admin", (req, res) => {
  res.sendFile(path.join(__dirname, "admin.html"))
})
// Update this route in server.js
app.get("/quiz/:quizId", (req, res) => {
  res.sendFile(path.join(__dirname, "quiz.html"))
})

// Admin login
app.post("/api/admin/login", async (req, res) => {
  const { email, password } = req.body

  if (email === process.env.ADMIN_EMAIL && password === process.env.ADMIN_PASSWORD) {
    req.session.isAdmin = true
    res.json({ success: true })
  } else {
    res.status(401).json({ success: false, message: "Invalid credentials" })
  }
})

// Add this route to server.js
app.post("/api/quiz/:quizId/send-score", async (req, res) => {
  try {
    const { candidateEmail, score, totalQuestions, percentage } = req.body;
    
    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: candidateEmail,
      subject: "Your Quiz Results",
      html: `
        <h2>Your Quiz Results</h2>
        <p>You scored ${score} out of ${totalQuestions} (${percentage}%)</p>
        <p>Thank you for completing the quiz!</p>
      `,
    };

    await transporter.sendMail(mailOptions);
    res.json({ success: true });
  } catch (error) {
    console.error("Error sending score email:", error);
    res.status(500).json({ error: error.message });
  }
});

// Get available blocks
app.get("/api/blocks", async (req, res) => {
  try {
    const blocks = await Question.distinct("block")
    res.json(blocks)
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// Create quiz
app.post("/api/quiz/create", async (req, res) => {
  try {
    const { selectedBlocks, difficultyLevel } = req.body

    // Get questions based on difficulty distribution
    const questions = await getQuestionsForDifficulty(selectedBlocks, difficultyLevel)

    const quiz = new Quiz({
      title: `Quiz - ${selectedBlocks.join(", ")}`,
      selectedBlocks,
      questions: shuffleArray(questions),
      difficultyLevel,
      createdBy: "admin",
    })

    await quiz.save()
    res.json({ success: true, quizId: quiz._id })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// Get quiz for candidate
app.get("/api/quiz/:quizId", async (req, res) => {
  try {
    const { quizId } = req.params
    const { email } = req.query

    const quiz = await Quiz.findById(quizId)
    if (!quiz) {
      return res.status(404).json({ error: "Quiz not found" })
    }

    // Check if candidate already exists
    let candidate = await Candidate.findOne({ email, quizId })
    if (!candidate) {
      candidate = new Candidate({ email, quizId })
      await candidate.save()
    }

    if (candidate.hasSubmitted) {
      return res.status(400).json({ error: "Quiz already submitted" })
    }

    // Prepare questions with 4 options each
    const questionsForCandidate = quiz.questions.map((q) => {
      const allOptions = [q.correctAnswer, ...q.incorrectOptions]
      const shuffledOptions = shuffleArray(allOptions).slice(0, 4)

      // Ensure correct answer is always included
      if (!shuffledOptions.includes(q.correctAnswer)) {
        shuffledOptions[Math.floor(Math.random() * 4)] = q.correctAnswer
      }

      return {
        _id: q._id,
        question: q.question,
        options: shuffleArray(shuffledOptions),
      }
    })

    res.json({
      quiz: {
        title: quiz.title,
        questions: questionsForCandidate,
      },
      candidateId: candidate._id,
    })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// Submit quiz
app.post("/api/quiz/:quizId/submit", async (req, res) => {
  try {
    const { quizId } = req.params
    const { candidateId, responses } = req.body

    const quiz = await Quiz.findById(quizId)
    const candidate = await Candidate.findById(candidateId)

    if (!quiz || !candidate) {
      return res.status(404).json({ error: "Quiz or candidate not found" })
    }

    // Calculate score
    let score = 0
    const totalQuestions = quiz.questions.length

    quiz.questions.forEach((question) => {
      const candidateAnswer = responses[question._id.toString()]
      if (candidateAnswer === question.correctAnswer) {
        score++
      }
    })

    // Update candidate
    candidate.responses = responses
    candidate.hasSubmitted = true
    candidate.submittedAt = new Date()
    candidate.score = score
    await candidate.save()

    res.json({
      success: true,
      score,
      totalQuestions,
      percentage: Math.round((score / totalQuestions) * 100),
    })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// Send quiz to candidates
app.post("/api/quiz/:quizId/send", async (req, res) => {
  try {
    const { quizId } = req.params
    const { emails } = req.body

    const quiz = await Quiz.findById(quizId)
    if (!quiz) {
      return res.status(404).json({ error: "Quiz not found" })
    }

    const quizUrl = `${req.protocol}://${req.get("host")}/quiz/${quizId}`

    for (const email of emails) {
      const mailOptions = {
        from: process.env.EMAIL_USER,
        to: email,
        subject: "Interview Quiz Invitation",
        html: `
          <h2>You've been invited to take an interview quiz</h2>
          <p>Please click the link below to start your quiz:</p>
          <a href="${quizUrl}?email=${encodeURIComponent(email)}" style="background: #007bff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Start Quiz</a>
          <p><strong>Important:</strong> Once you start the quiz, you must complete it within the time limit.</p>
        `,
      }

      await transporter.sendMail(mailOptions)
    }

    res.json({ success: true, message: `Quiz sent to ${emails.length} candidates` })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// Helper functions
async function getQuestionsForDifficulty(blocks, difficulty) {
  const allQuestions = await Question.find({ block: { $in: blocks } })

  const easyQuestions = allQuestions.filter((q) => q.difficulty === "easy")
  const mediumQuestions = allQuestions.filter((q) => q.difficulty === "medium")
  const hardQuestions = allQuestions.filter((q) => q.difficulty === "hard")

  let selectedQuestions = []

  switch (difficulty) {
    case "easy":
      selectedQuestions = [
        ...shuffleArray(easyQuestions).slice(0, 5),
        ...shuffleArray(mediumQuestions).slice(0, 3),
        ...shuffleArray(hardQuestions).slice(0, 2),
      ]
      break
    case "medium":
      selectedQuestions = [
        ...shuffleArray(easyQuestions).slice(0, 3),
        ...shuffleArray(mediumQuestions).slice(0, 5),
        ...shuffleArray(hardQuestions).slice(0, 2),
      ]
      break
    case "hard":
      selectedQuestions = [
        ...shuffleArray(easyQuestions).slice(0, 2),
        ...shuffleArray(mediumQuestions).slice(0, 3),
        ...shuffleArray(hardQuestions).slice(0, 5),
      ]
      break
  }

  return selectedQuestions.slice(0, 10) // Limit to 10 questions
}

function shuffleArray(array) {
  const shuffled = [...array]
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
  }
  return shuffled
}

const PORT = process.env.PORT || 3000
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`)
})