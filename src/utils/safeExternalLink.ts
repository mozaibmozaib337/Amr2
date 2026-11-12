/**
 * Formats an Egyptian or international phone number cleanly for WhatsApp wa.me links
 * and opens URLs safely via an anchor element without calling window.open.
 */
export function formatWhatsAppPhone(rawPhone?: string): string {
  if (!rawPhone) return '';
  let digits = rawPhone.replace(/\D/g, '');
  if (!digits) return '';
  if (digits.startsWith('00')) {
    digits = digits.slice(2);
  }
  // Egyptian local mobile e.g. 010xxxxxxxx -> 2010xxxxxxxx
  if (digits.startsWith('0') && digits.length === 11) {
    return `2${digits}`;
  }
  // Already starts with 20
  if (digits.startsWith('20') && digits.length >= 12) {
    return digits;
  }
  // Missing leading 0 e.g. 10xxxxxxxx
  if (digits.length === 10 && digits.startsWith('1')) {
    return `20${digits}`;
  }
  return digits;
}

export function buildWhatsAppUrl(rawPhone: string | undefined, message: string): string {
  const formatted = formatWhatsAppPhone(rawPhone);
  const encoded = encodeURIComponent(message);
  if (!formatted) {
    return `https://wa.me/?text=${encoded}`;
  }
  return `https://wa.me/${formatted}?text=${encoded}`;
}

export function openExternalSafe(url: string): void {
  if (typeof document === 'undefined' || !url) return;
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.target = '_blank';
  anchor.rel = 'noopener noreferrer';
  anchor.style.display = 'none';
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
}
