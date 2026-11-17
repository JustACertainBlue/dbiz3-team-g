export function detectLeak(
  text: string
): ('email' | 'phone' | 'secret' | 'internal_url')[] {
  const leaks = new Set<'email' | 'phone' | 'secret' | 'internal_url'>();

  // 1. Email
  const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/;
  if (emailRegex.test(text)) {
    leaks.add('email');
  }

  // 2. Phone (Vietnamese)
  // +84 followed by 9-10 digits, or 0 followed by 9 digits
  // Not followed by . or đ or ₫ or digits
  const phonePlus84 = /\+84[\s.-]?[1-9](?:[\s.-]?\d){8,9}(?![\d.đ₫])/;
  const phoneZero = /(?<![\d.])0[1-9](?:[\s.-]?\d){8}(?![\d.đ₫])/;
  if (phonePlus84.test(text) || phoneZero.test(text)) {
    leaks.add('phone');
  }

  // 3. Secret
  const secretKeyRegex = /\bsk-[a-zA-Z0-9_-]{20,}\b/;
  const envKeyRegex = /\b[A-Z0-9_]{3,}_KEY\s*=/;
  if (
    secretKeyRegex.test(text) ||
    envKeyRegex.test(text) ||
    text.includes('SUPABASE_SERVICE_ROLE_KEY')
  ) {
    leaks.add('secret');
  }

  // 4. Internal URL
  const supabaseUrlRegex = /[a-zA-Z0-9_-]+\.supabase\.co/;
  const internalApiRegex = /\/api\/ait\//;
  if (supabaseUrlRegex.test(text) || internalApiRegex.test(text)) {
    leaks.add('internal_url');
  }

  return Array.from(leaks);
}

export function hasAffirmativeBookingClaim(text: string): boolean {
  return /(?<![\p{L}\p{N}])(?:đã\s+(?:được\s+)?(?:đặt|xác\s*nhận|chốt)(?:\s+(?:tour|lịch|chuyến))?|(?:tour|lịch|chuyến)\s+đã\s+(?:được\s+)?(?:đặt|xác\s*nhận|chốt)|your\s+tour\s+(?:is\s+)?(?:booked|confirmed))(?![\p{L}\p{N}])/iu
    .test(text)
}

function extractNumbers(text: string): number[] {
  const numbers: number[] = [];

  // 1. First find dates like 25/11
  const dateRegex = /\b(\d{1,2})\/(\d{1,2})\b/g;
  let match: RegExpExecArray | null;
  const replacedText = text.replace(dateRegex, (_, d, m) => {
    numbers.push(parseInt(d, 10), parseInt(m, 10));
    return ' ';
  });

  // 2. Find numbers with thousand dots (e.g. 300.000, 1.000.000)
  const thousandDotRegex = /\b\d{1,3}(?:\.\d{3})+\b/g;
  const remainingText = replacedText.replace(thousandDotRegex, (m) => {
    numbers.push(parseInt(m.replace(/\./g, ''), 10));
    return ' ';
  });

  // 3. Find normal integers
  const intRegex = /\b\d+\b/g;
  while ((match = intRegex.exec(remainingText)) !== null) {
    numbers.push(parseInt(match[0], 10));
  }

  return numbers;
}

export function postCheckMessage({
  turnType,
  message,
  allowedNumbers = [],
  knownNames = [],
  allowedNames = [],
  cardNames = [],
  fallback,
}: {
  turnType: string;
  message: string;
  allowedNumbers?: number[];
  knownNames?: string[];
  allowedNames?: string[];
  cardNames?: string[];
  fallback: string;
}): {
  ok: boolean;
  message: string;
  violations: ('number' | 'card_name' | 'name' | 'leak')[];
} {
  const violations: ('number' | 'card_name' | 'name' | 'leak' | 'booking_claim')[] = [];

  // Check 1: Numbers
  const numbersInMsg = extractNumbers(message);
  const allowedSet = new Set(allowedNumbers);
  for (const num of numbersInMsg) {
    if (!allowedSet.has(num)) {
      if (!violations.includes('number')) violations.push('number');
      break;
    }
  }

  const msgLower = message.toLowerCase();

  // Check 2: Card name (only for results turn)
  if (turnType === 'results') {
    for (const name of cardNames) {
      if (name && msgLower.includes(name.toLowerCase())) {
        if (!violations.includes('card_name')) violations.push('card_name');
        break;
      }
    }
  }

  if (hasAffirmativeBookingClaim(message)) {
    violations.push('booking_claim')
  }

  // Check 3: Known names not in allowedNames
  const allowedNamesLower = new Set(allowedNames.map((n) => n.toLowerCase()));
  for (const name of knownNames) {
    if (name && msgLower.includes(name.toLowerCase())) {
      if (!allowedNamesLower.has(name.toLowerCase())) {
        if (!violations.includes('name')) violations.push('name');
        break;
      }
    }
  }

  // Check 4: Leak
  const detectedLeaks = detectLeak(message);
  if (detectedLeaks.length > 0) {
    violations.push('leak');
  }

  if (violations.length > 0) {
    return {
      ok: false,
      message: fallback,
      violations,
    };
  }

  return {
    ok: true,
    message,
    violations: [],
  };
}
