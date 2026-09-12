/**
 * Helpers de interfaz compartidos: toasts, modal JSON y copiado al portapapeles.
 */
import { dom } from './dom.js';
import { escapeHtml } from './utils.js';

/** Muestra una notificación flotante temporal. */
export function showToast(message, type = 'info') {
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.innerHTML = `
    <span>${type === 'success' ? '✓' : (type === 'error' ? '✕' : 'ℹ')}</span>
    <span>${escapeHtml(message)}</span>
  `;
  dom.toastContainer.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(10px)';
    toast.style.transition = 'all 0.3s ease';
    setTimeout(() => toast.remove(), 300);
  }, 3500);
}

/** Abre el modal JSON con un título, subtítulo y datos serializables. */
export function openJsonModal(title, subtitle, data) {
  dom.modalTitle.textContent = title;
  dom.modalSubtitle.textContent = subtitle;
  dom.modalJsonContent.textContent = typeof data === 'string' ? data : JSON.stringify(data, null, 2);
  dom.detailModal.style.display = 'flex';
}

/** Cierra el modal JSON. */
export function closeModal() {
  dom.detailModal.style.display = 'none';
}

/** Copia un valor al portapapeles (expuesto global para los onclick inline). */
export function copyValue(val) {
  if (val === 'null' || val === 'undefined') val = '';
  navigator.clipboard.writeText(val).then(() => {
    showToast(`Copiado: "${val}"`, 'success');
  }).catch(() => {
    showToast('Error al copiar', 'error');
  });
}

window.copyValue = copyValue;
