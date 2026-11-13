import { api } from "../core/Api.js";
import { session } from "../core/Session.js";
import { avatarMarkup, avatarUrl, forgetAvatar, prepareAvatar } from "../core/Avatar.js";
import { esc } from "../core/Format.js";
import { icon } from "../ui/Icons.js";
import { modal, toast } from "../ui/Components.js";

/** "Tu cuenta": the profile photo (upload, take one on a phone, or remove it) and the account summary. */
export async function openAccountDialog() {
  const user = session.user;
  const url = await avatarUrl(user);
  await modal({
    title: "Tu cuenta",
    body: `<div class="account-dialog">
        <div class="account-photo" data-photo>${avatarMarkup(user, url, "avatar-xl")}</div>
        <div><strong>${esc(user?.fullName || "")}</strong><p class="muted">${esc(user?.email || "")}</p>
          <p class="muted small">${user?.role === "ADMIN" ? "Administrador" : "Usuario"} · ${user?.plan === "PREMIUM" ? "Premium" : "Plan gratuito"}</p></div>
      </div>
      ${user?.demo ? `<p class="banner banner-info">${icon("info")}<span>Esta cuenta de demostración es compartida, así que su foto no se puede cambiar. Crea tu propia cuenta para tener la tuya.</span></p>` : `
      <div class="row account-actions">
        <button type="button" class="btn btn-primary" data-pick>${icon("camera")}<span>${url ? "Cambiar foto" : "Subir foto"}</span></button>
        <input type="file" accept="image/jpeg,image/png,image/webp" hidden data-file aria-label="Elegir foto de perfil">
        <button type="button" class="btn btn-ghost" data-remove ${url ? "" : "hidden"}>${icon("trash")}Quitar foto</button>
      </div>
      <p class="muted small">Se usa el centro de la foto en cuadrado. Se guarda reducida y sin datos como la ubicación, y solo tú la ves.</p>`}
      <a class="btn btn-ghost btn-sm account-settings-link" href="#/settings" data-close>${icon("settings")}Configuración de la cuenta</a>`,
    actions: [{ label: "Cerrar", className: "btn-ghost", value: null }],
    onMount: (node, close) => {
      node.querySelector('[href="#/settings"]').addEventListener("click", () => close(null));
      const photo = node.querySelector("[data-photo]");
      const file = node.querySelector("[data-file]");
      const remove = node.querySelector("[data-remove]");
      const pick = node.querySelector("[data-pick]");
      // On a phone the system offers the gallery or the camera.
      pick?.addEventListener("click", () => file.click());
      const show = async (updated) => {
        session.updateUser(updated);
        const newUrl = await avatarUrl(updated);
        photo.innerHTML = avatarMarkup(updated, newUrl, "avatar-xl");
        if (remove) remove.hidden = !newUrl;
        if (pick) pick.querySelector("span").textContent = newUrl ? "Cambiar foto" : "Subir foto";
      };
      file?.addEventListener("change", async () => {
        const chosen = file.files[0];
        file.value = "";
        if (!chosen) return;
        photo.classList.add("busy");
        pick.disabled = true;
        try {
          const form = new FormData();
          form.append("file", await prepareAvatar(chosen), "foto.jpg");
          await show(await api.upload("/users/me/avatar", form, "PUT"));
          toast("Foto de perfil actualizada.", "ok");
        } catch (error) {
          toast(error.message, "error");
        } finally {
          photo.classList.remove("busy");
          pick.disabled = false;
        }
      });
      remove?.addEventListener("click", async () => {
        remove.disabled = true;
        try {
          forgetAvatar();
          await show(await api.delete("/users/me/avatar"));
          toast("Foto de perfil quitada.", "ok");
        } catch (error) {
          toast(error.message, "error");
        } finally {
          remove.disabled = false;
        }
      });
    },
  });
}
