import { api, setToken } from "./api.js";
import { maskPhone } from "./masks.js";
import { safeReturnTo } from "./login-navigation.js";

const params = new URLSearchParams(window.location.search);
const returnTo = safeReturnTo(params.get("returnTo"));

if (returnTo === "agendamentos.html") {
  document.getElementById("returnHint").style.display = "block";
}

const form = document.getElementById("loginForm");
const errorEl = document.getElementById("formError");
const submitBtn = document.getElementById("submitBtn");
const phoneInput = document.getElementById("phone");

phoneInput.addEventListener("input", () => {
  phoneInput.value = maskPhone(phoneInput.value);
});

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  errorEl.style.display = "none";

  const name = document.getElementById("name").value;
  const digits = document.getElementById("phone").value.replace(/\D/g, "");

  if (digits.length < 10 || digits.length > 13) {
    errorEl.textContent = "Informe um telefone válido com DDD.";
    errorEl.style.display = "block";
    return;
  }

  submitBtn.disabled = true;
  submitBtn.textContent = "Entrando...";
  try {
    const { token } = await api.login(digits, name);
    setToken(token);
    window.location.href = returnTo;
  } catch (err) {
    errorEl.textContent = err.message;
    errorEl.style.display = "block";
    submitBtn.disabled = false;
    submitBtn.textContent = "Avançar";
  }
});
