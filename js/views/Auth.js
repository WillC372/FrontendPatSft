import { api, ApiError } from "../core/Api.js";
import { session } from "../core/Session.js";
import { icon, logo } from "../ui/Icons.js";
import { showFieldErrors, toast, withBusy } from "../ui/Components.js";
import { animateWater } from "../ui/Water.js";
import { esc } from "../core/Format.js";

function layout(card) {
  return `
    <div class="auth">
      <section class="auth-hero" aria-hidden="true">
        <canvas data-waves></canvas>
        <div class="auth-hero-content">
          ${logo()}
          <p class="auth-hero-title">AquaSense <span>AI</span></p>
          <p>Monitorea · Analiza · Cuida</p>
          <div class="auth-hero-features">
            <div>${icon("drop")}Mide</div><div>${icon("brain")}Analiza</div><div>${icon("shield")}Cuida</div>
          </div>
        </div>
      </section>
      <main class="auth-panel"><div class="card glow auth-card">${card}</div></main>
    </div>`;
}

function inputField({ name, label, type = "text", iconName, autocomplete, placeholder, toggle = false }) {
  return `<div class="field">
      <label for="f-${name}">${label}</label>
      <div class="input-wrap">${icon(iconName)}
        <input class="input" id="f-${name}" name="${name}" type="${type}" autocomplete="${autocomplete}" placeholder="${placeholder}" required>
        ${toggle ? `<button type="button" class="input-action" data-toggle-password aria-label="Mostrar contraseña">${icon("eye")}</button>` : ""}
      </div>
      <div class="field-error" data-error-for="${name}"></div>
    </div>`;
}

function bindPasswordToggles(root) {
  root.querySelectorAll("[data-toggle-password]").forEach((button) => {
    button.addEventListener("click", () => {
      const input = button.parentElement.querySelector("input");
      const show = input.type === "password";
      input.type = show ? "text" : "password";
      button.innerHTML = icon(show ? "eyeOff" : "eye");
      button.setAttribute("aria-label", show ? "Ocultar contraseña" : "Mostrar contraseña");
    });
  });
}

function mount(root, card, onSubmit, afterMount) {
  root.innerHTML = layout(card);
  const stop = animateWater(root.querySelector("[data-waves]"), { layers: 4, bubbles: 40, height: 0.42 });
  bindPasswordToggles(root);
  const form = root.querySelector("form");
  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const data = Object.fromEntries(new FormData(form));
    const button = form.querySelector("button[type=submit]");
    showFieldErrors(form);
    try {
      await withBusy(button, () => onSubmit(data, form));
    } catch (error) {
      if (error instanceof ApiError && Object.keys(error.fields).length) showFieldErrors(form, error.fields);
      toast(error.message, "error");
    }
  });
  form.querySelector("input")?.focus();
  afterMount?.(root);
  return stop;
}

export const loginView = {
  name: "login", title: "Iniciar sesión", layout: "auth",
  render(root, ctx) {
    return mount(root, `
      <h1>Iniciar sesión</h1><p class="card-sub">Accede a tu cuenta para continuar</p>
      <form class="auth-form" novalidate>
        ${inputField({ name: "email", label: "Correo electrónico", type: "email", iconName: "user", autocomplete: "email", placeholder: "tu@correo.com" })}
        ${inputField({ name: "password", label: "Contraseña", type: "password", iconName: "lock", autocomplete: "current-password", placeholder: "Tu contraseña", toggle: true })}
        <div class="auth-links">
          <label class="check"><input type="checkbox" name="rememberMe">Recordarme</label>
          <a href="#/forgot-password">¿Olvidaste tu contraseña?</a>
        </div>
        <button class="btn btn-primary btn-block btn-pill" type="submit">Entrar ${icon("arrowRight")}</button>
      </form>
      <section class="demo-access" data-demo hidden>
        <div class="demo-title"><span>Acceso de demostración</span></div>
        <div class="demo-buttons" data-demo-buttons></div>
        <p class="demo-creds" data-demo-creds></p>
      </section>
      <p class="auth-foot">¿No tienes cuenta? <a href="#/register">Regístrate aquí</a></p>`,
    async (data) => {
      const remember = data.rememberMe === "on";
      const auth = await api.post("/auth/login", { email: data.email, password: data.password, rememberMe: remember });
      session.save(auth, remember);
      toast(`Bienvenido, ${auth.user.fullName.split(" ")[0]}.`, "ok");
      if (auth.notice) toast(auth.notice, "warn", 10000);
      ctx.router.go("dashboard");
    }, showDemoAccounts);
  },
};

const DEMO_ICON = { USER: "user", PREMIUM: "star", ADMIN: "shield" };

// One button per role of the case study. They are real accounts of the database with public credentials and limits
// (they cannot be deleted or pay, and the administrator can only look); the button fills the form and logs in.
async function showDemoAccounts(root) {
  let accounts = [];
  try { accounts = await api.get("/auth/demo-accounts"); } catch { return; }
  const box = root.querySelector("[data-demo]");
  if (!box || !accounts.length) return;
  box.querySelector("[data-demo-buttons]").innerHTML = accounts.map((a) => `<button type="button" class="demo-btn" data-demo-key="${esc(a.key)}" title="${esc(a.description)}">
      ${icon(DEMO_ICON[a.key] || "user")}<span><strong>${esc(a.label)}</strong><small>${esc(a.email)}</small></span></button>`).join("");
  box.querySelector("[data-demo-creds]").textContent = `Contraseña de las cuentas de demostración: ${accounts[0].password}`;
  box.hidden = false;
  const form = root.querySelector("form");
  box.addEventListener("click", (event) => {
    const button = event.target.closest("[data-demo-key]");
    if (!button) return;
    const account = accounts.find((a) => a.key === button.dataset.demoKey);
    form.elements.email.value = account.email;
    form.elements.password.value = account.password;
    form.elements.rememberMe.checked = false;
    form.requestSubmit();
  });
}

export const registerView = {
  name: "register", title: "Crear cuenta", layout: "auth",
  render(root, ctx) {
    return mount(root, `
      <h1>Crear cuenta</h1><p class="card-sub">Empieza a monitorear la calidad de tu agua</p>
      <form class="auth-form" novalidate>
        ${inputField({ name: "fullName", label: "Nombre completo", iconName: "user", autocomplete: "name", placeholder: "Tu nombre" })}
        ${inputField({ name: "email", label: "Correo electrónico", type: "email", iconName: "mail", autocomplete: "email", placeholder: "tu@correo.com" })}
        ${inputField({ name: "password", label: "Contraseña", type: "password", iconName: "lock", autocomplete: "new-password", placeholder: "Mínimo 8 caracteres, letras y números", toggle: true })}
        ${inputField({ name: "confirm", label: "Confirmar contraseña", type: "password", iconName: "lock", autocomplete: "new-password", placeholder: "Repite la contraseña", toggle: true })}
        <button class="btn btn-primary btn-block btn-pill" type="submit">Crear cuenta ${icon("arrowRight")}</button>
      </form>
      <p class="auth-foot">¿Ya tienes cuenta? <a href="#/login">Inicia sesión</a></p>`,
    async (data, form) => {
      if (data.password !== data.confirm) {
        showFieldErrors(form, { confirm: "Las contraseñas no coinciden." });
        throw new Error("Revisa los campos marcados.");
      }
      const auth = await api.post("/auth/register", { fullName: data.fullName, email: data.email, password: data.password });
      session.save(auth, false);
      toast("Cuenta creada. ¡Bienvenido a AquaSense AI!", "ok");
      if (auth.notice) toast(auth.notice, "warn", 10000);
      ctx.router.go("dashboard");
    });
  },
};

export const forgotView = {
  name: "forgot-password", title: "Recuperar contraseña", layout: "auth",
  render(root) {
    return mount(root, `
      <h1>Recuperar contraseña</h1><p class="card-sub">Te enviaremos un enlace para restablecerla</p>
      <form class="auth-form" novalidate>
        ${inputField({ name: "email", label: "Correo electrónico", type: "email", iconName: "mail", autocomplete: "email", placeholder: "tu@correo.com" })}
        <button class="btn btn-primary btn-block btn-pill" type="submit">Enviar enlace ${icon("send")}</button>
        <div data-result></div>
      </form>
      <p class="auth-foot"><a href="#/login">Volver a iniciar sesión</a></p>`,
    async (data, form) => {
      const result = form.querySelector("[data-result]");
      try {
        const response = await api.post("/auth/forgot-password", { email: data.email });
        result.innerHTML = `<div class="banner banner-info">${icon("mail")}<p>${esc(response.message)}</p></div>`;
      } catch (error) {
        if (error instanceof ApiError && error.status === 503) {
          result.innerHTML = `<div class="banner banner-warn">${icon("alert")}<p>${esc(error.message)}</p></div>`;
          return;
        }
        throw error;
      }
    });
  },
};

export const resetView = {
  name: "reset-password", title: "Restablecer contraseña", layout: "auth",
  render(root, ctx) {
    const token = ctx.route.query.token;
    if (!token) {
      root.innerHTML = layout(`<h1>Enlace inválido</h1><p class="card-sub">El enlace no contiene un token. Solicita uno nuevo.</p>
        <a class="btn btn-primary btn-block" href="#/forgot-password">Solicitar enlace</a>`);
      return animateWater(root.querySelector("[data-waves]"));
    }
    return mount(root, `
      <h1>Nueva contraseña</h1><p class="card-sub">Elige una contraseña segura</p>
      <form class="auth-form" novalidate>
        ${inputField({ name: "newPassword", label: "Nueva contraseña", type: "password", iconName: "lock", autocomplete: "new-password", placeholder: "Mínimo 8 caracteres, letras y números", toggle: true })}
        <button class="btn btn-primary btn-block btn-pill" type="submit">Guardar contraseña</button>
      </form>`,
    async (data) => {
      const response = await api.post("/auth/reset-password", { token, newPassword: data.newPassword });
      session.clear();
      toast(response.message, "ok");
      ctx.router.go("login");
    });
  },
};

/** Confirmation of the administrator role from the link sent to the ADMIN_EMAIL address. */
export const verifyAdminView = {
  name: "verify-admin", title: "Confirmar administrador", layout: "auth",
  render(root, ctx) {
    const token = ctx.route.query.token;
    if (!token) {
      root.innerHTML = layout(`<h1>Enlace inválido</h1><p class="card-sub">El enlace no contiene un código. Inicia sesión para recibir uno nuevo.</p>
        <a class="btn btn-primary btn-block" href="#/login">Iniciar sesión</a>`);
      return animateWater(root.querySelector("[data-waves]"));
    }
    return mount(root, `
      <h1>Confirmar administrador</h1><p class="card-sub">Activa los permisos de administrador de esta cuenta</p>
      <form class="auth-form" novalidate>
        <p class="muted" style="font-size:14px">Confirma solo si tú creaste la cuenta con este correo. Después tendrás que iniciar sesión de nuevo.</p>
        <button class="btn btn-primary btn-block btn-pill" type="submit">${icon("shield")}Confirmar</button>
        <div data-result></div>
      </form>
      <p class="auth-foot"><a href="#/login">Ir a iniciar sesión</a></p>`,
    async (data, form) => {
      const response = await api.post("/auth/verify-admin", { token });
      session.clear();
      form.querySelector("[data-result]").innerHTML = `<div class="banner banner-info">${icon("check")}<p>${esc(response.message)}</p></div>`;
      form.querySelector("button[type=submit]").remove();
    });
  },
};
