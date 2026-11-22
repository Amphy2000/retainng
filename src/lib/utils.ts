export function formatNgn(amount: number | string | undefined | null): string {
  const val = Number(amount) || 0;
  return new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency: 'NGN',
    maximumFractionDigits: 0,
  }).format(val);
}

export function formatDate(dateString?: string): string {
  if (!dateString) return 'Never';
  try {
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return dateString;
    return d.toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return dateString;
  }
}

export function formatRelativeTime(dateString?: string): string {
  if (!dateString) return 'No visits yet';
  try {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
    if (diffDays < 365) return `${Math.floor(diffDays / 30)} months ago`;
    return `${Math.floor(diffDays / 365)} years ago`;
  } catch {
    return dateString;
  }
}

export function cleanNigerianPhone(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  if (digits.startsWith('234') && digits.length === 13) {
    return `+${digits.substring(0, 3)} ${digits.substring(3, 6)} ${digits.substring(6, 9)} ${digits.substring(9)}`;
  }
  if (digits.startsWith('0') && digits.length === 11) {
    return `+234 ${digits.substring(1, 4)} ${digits.substring(4, 7)} ${digits.substring(7)}`;
  }
  return phone;
}

export function getWhatsAppUrl(phone: string, message: string): string {
  const digits = phone.replace(/\D/g, '');
  let intlPhone = digits;
  if (digits.startsWith('0') && digits.length === 11) {
    intlPhone = `234${digits.substring(1)}`;
  }
  return `https://wa.me/${intlPhone}?text=${encodeURIComponent(message)}`;
}

export function parsePaymentAlert(rawText: string): { amount?: number; name?: string } {
  if (!rawText) return {};

  let amount: number | undefined;
  const amtMatch =
    rawText.match(/(?:NGN|₦|Amt:?|Amount:?|Credit:?)\s*([0-9,]+(?:\.[0-9]{2})?)/i) ||
    rawText.match(/([0-9]{1,3}(?:,[0-9]{3})+|\b[1-9][0-9]{2,6}\b)(?:\.[0-9]{2})?/);

  if (amtMatch) {
    const cleaned = amtMatch[1].replace(/,/g, '');
    const num = Number(cleaned);
    if (!isNaN(num) && num > 0) {
      amount = Math.round(num);
    }
  }

  let name: string | undefined;
  const nameMatch = rawText.match(
    /(?:from|sender|by|payer:?|trf\s+from)\s+([A-Za-z\s]{2,30}?)(?:\s+(?:via|to|on|ref|with|trf|desc|\/|-)|$)/i
  );

  if (nameMatch) {
    const candidate = nameMatch[1].trim();
    if (!/^(opay|moniepoint|palmpay|kuda|gtbank|bank|transfer|pos)$/i.test(candidate)) {
      name = candidate
        .toLowerCase()
        .split(' ')
        .filter(Boolean)
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
        .join(' ');
    }
  }

  return { amount, name };
}
