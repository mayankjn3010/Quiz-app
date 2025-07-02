document.addEventListener("DOMContentLoaded", () => {
  const loginForm = document.getElementById("loginForm")
  const errorMessage = document.getElementById("error-message")

  loginForm.addEventListener("submit", async (e) => {
    e.preventDefault()

    const email = document.getElementById("email").value
    const password = document.getElementById("password").value

    try {
      const response = await fetch("/api/admin/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, password }),
      })

      const data = await response.json()

      if (data.success) {
        window.location.href = "/admin"
      } else {
        errorMessage.textContent = data.message || "Invalid credentials"
        errorMessage.style.display = "block"
      }
    } catch (error) {
      errorMessage.textContent = "Login failed. Please try again."
      errorMessage.style.display = "block"
    }
  })
})
