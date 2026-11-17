function removeVietnameseAccents(str: string): string {
  return str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'd');
}

export function routeByRules(
  text: string
): { intent: string; confidence: number } | null {
  if (typeof text !== 'string') return null;

  // 1. Clean zero-width characters (U+200B–U+200F, U+2060, U+FEFF)
  let cleaned = text.replace(/[\u200B-\u200F\u2060\uFEFF]/g, '').trim();
  if (!cleaned) return null;

  const lower = cleaned.toLowerCase();
  const unaccented = removeVietnameseAccents(lower);

  // De-obfuscate single-letter punctuation (e.g. i.g.n.o.r.e or i-g-n-o-r-e) on unaccented text
  const deobfuscated = unaccented.replace(/([a-z])[.\-_]+(?=[a-z])/gi, '$1');

  // 2. Protect legitimate phrases before pattern matching
  // Apply replacements on unaccented text to make matching consistent
  const protectPhrases = (input: string): string => {
    return input
      .replace(/\bhuong\s+dan\s+vien\b/g, '__tour_guide__')
      .replace(/\btour\s+guide\b/g, '__tour_guide__')
      .replace(/\btu\s+dan\s+doan\b/g, '__self_lead__')
      .replace(/\btu\s+dan\b/g, '__self_lead__')
      .replace(
        /\b(?:agency|dai\s+ly)\s+(?:cua\s+minh|cua\s+toi|chung\s+toi|ben\s+minh|ben\s+em|minh)\b/g,
        '__own_agency__'
      )
      .replace(/\b(?:my|our)\s+agency\b/g, '__own_agency__')
      .replace(
        /\b(?:quy\s+tac|chinh\s+sach|quy\s+dinh)\s+huy\s+tour\b/g,
        '__cancellation_policy__'
      )
      .replace(/\bcancellation\s+policy\b/g, '__cancellation_policy__')
      .replace(/\b(?:xe\s+)?(?:dua\s+don|don\s+tra|don\s+tai)\b/g, '__shuttle__')
      .replace(/\bxe\s+don\b/g, '__shuttle__')
      .replace(/\s+/g, ' ');
  };

  const safe = protectPhrases(unaccented);
  const safeDeobf = protectPhrases(deobfuscated);

  const testTargets = [safe, safeDeobf];
  const matchesAny = (regex: RegExp) => testTargets.some((t) => regex.test(t));

  // -------------------------------------------------------------
  // GROUP 1: INJECTION & PROMPT LEAKS (restricted_request)
  // -------------------------------------------------------------
  const injectionRegexes = [
    // EN: Action verb + Target object (e.g. ignore previous instructions, disregard rules)
    /\b(?:ignore|disregard|forget|override|bypass|skip|drop|cancel|abandon)\b.*?\b(?:instructions?|rules?|guidelines?|prompts?|constraints?|policies)\b/i,
    // EN: Target object + Passive verb (e.g. rules must be bypassed)
    /\b(?:instructions?|rules?|guidelines?|prompts?)\b.*?\b(?:ignored|disregarded|forgotten|bypassed|overridden)\b/i,
    // VI: Action verb + Target object (bỏ qua, quên, phớt lờ, không cần theo, đừng theo)
    /\b(?:bo\s+qua|quen(?:\s+het)?|phot\s+lo|khong\s+can\s+theo|dung\s+theo|khong\s+tuan\s+theo|huy\s+bo)\b.*?\b(?:huong\s+dan|chi\s+dan|chi\s+thi|quy\s+tac|quy\s+dinh|luat|lenh|cau\s+lenh)\b/i,
    // Modifiers + Target (e.g. previous instructions, chỉ dẫn trước đó)
    /\b(?:previous|earlier|prior|initial|original|above)\s+(?:all\s+)?(?:instructions?|rules?|guidelines?|prompts?)\b/i,
    /\b(?:huong\s+dan|chi\s+dan|chi\s+thi|quy\s+tac|quy\s+dinh|lenh)\s+(?:truoc(?:\s+do)?|o\s+tren|ban\s+dau|cu)\b/i,
    // Jailbreak / Persona adoption / Dev mode
    /\b(?:act\s+as|dong\s+vai|pretend\s+to\s+be|tro\s+thanh)\b.*?\b(?:dan\b|unrestricted|developer\s+mode|dev\s+mode|khong\s+bi\s+gioi\s+han|khong\s+con\s+gioi\s+han)/i,
    /\bdeveloper\s+mode\b/i,
    /\bjailbreak\b/i,
    /\bdo\s+anything\s+now\b/i,
    /\bnew\s+instructions\s*:/i,
    // Prompt leak
    /\b(?:show|reveal|display|output|print|repeat|in\s+ra|cho\s+(?:minh|toi)?\s+xem|xem|lap\s+lai)\b.*?\b(?:system\s*prompt|prompt\s+he\s+thong|hidden\s+prompt|initial\s+instructions?|huong\s+dan(?:\s+he\s+thong|\s+cua\s+ban)?|first\s+sentence|cau\s+dau\s+tien|cau\s+hinh\s+(?:cua\s+ban|he\s+thong))\b/i,
    /\bsystem\s+prompt\b/i,
    /\bprompt\s+he\s+thong\b/i,
    /\brepeat\s+them\s+verbatim\b/i,
    /\bwhat\s+were\s+your\s+initial\s+instructions\b/i,
  ];

  // -------------------------------------------------------------
  // GROUP 2: PRIVILEGE ESCALATION (restricted_request)
  // -------------------------------------------------------------
  const privilegeRegexes = [
    // Self claiming privileged role (admin, dev, system owner, staff)
    /\b(?:toi\s+la|em\s+la|minh\s+la|anh\s+la|chi\s+la|day\s+la|i\s+am|im|i'm|this\s+is)\b.*?\b(?:admin|administrator|quan\s+tri(?:\s+vien)?|developer|dev\b|system\s+owner|chu\s+he\s+thong|staff|superadmin|root\b)/i,
    // Requesting/demanding elevated permissions
    /\b(?:cap|grant|mo|unlock|enable|bat|give\s+me|cho\s+toi)\b.*?\b(?:quyen\s+admin|admin\s+rights|admin\s+access|quyen\s+quan\s+tri|full\s+access|developer\s+mode|che\s+do\s+dac\s+biet)\b/i,
    /\b(?:promote\s+to\s+admin|set\s+admin|cap\s+quyen\s+admin)\b/i,
  ];

  // -------------------------------------------------------------
  // GROUP 3: ASKING FOR OTHER AGENCY'S DATA (restricted_request)
  // -------------------------------------------------------------
  const crossAgencyRegexes = [
    // List/data of other agencies
    /\b(?:danh\s+sach|thong\s+tin|du\s+lieu|data|list)\b.*?\b(?:agency\s+khac|dai\s+ly\s+khac|other\s+agenc(?:y|ies))\b/i,
    /\b(?:agency\s+khac|dai\s+ly\s+khac|all\s+other\s+agencies)\b.*?\b(?:yeu\s+cau|request|dat\s+tour|booking)\b/i,
    // Specific named agency + action (e.g. Agency Thanh Bình đang đặt tour gì)
    /\b(?:travel\s+)?agency\s+([a-z0-9_\s]{2,30})\s+(?:dang|da|vua)\s+(?:hoi|dat|tim|quan\s+tam|yeu\s+cau|book|dat\s+tour)\b/i,
  ];

  for (const regex of [
    ...injectionRegexes,
    ...privilegeRegexes,
    ...crossAgencyRegexes,
  ]) {
    if (matchesAny(regex)) {
      return { intent: 'restricted_request', confidence: 0.95 };
    }
  }

  // -------------------------------------------------------------
  // GROUP 4: OUT OF SCOPE (out_of_scope)
  // -------------------------------------------------------------
  const outOfScopeRegexes = [
    // Weather
    /\b(?:thoi\s+tiet|weather|du\s+bao\s+thoi\s+tiet|troi\s+co\s+mua\s+khong|nhiet\s+do\s+hom\s+nay)\b/i,
    // Finance / Crypto / Gold / Stocks
    /\b(?:co\s+phieu|chung\s+khoan|stock|stocks|shares|trai\s+phieu)\b/i,
    /\b(?:bitcoin|btc\b|eth\b|ethereum|crypto|tien\s+dien\s+tu|tien\s+ao)\b/i,
    /\b(?:gia\s+vang|vang\s+sjc|vang\s+9999|gold\s+price)\b/i,
    /\b(?:ty\s+gia|exchange\s+rate)\b/i,
    // Programming / Coding
    /\b(?:viet|write|tao|giai|huong\s+dan|fix|debug)\b.*?\b(?:code|doan\s+code|script|function|ham\b|thuat\s+toan|algorithm)\b/i,
    /\b(?:python|javascript|typescript|java\b|c\+\+|c#|golang|rust\b|php\b|sql\b|html\b|css\b)\b/i,
    /\b(?:doan\s+code|sample\s+code|source\s+code|viet\s+code|lap\s+trinh)\b/i,
    /\b(?:sap\s+xep\s+mang|bubble\s+sort|quick\s+sort|binary\s+search)\b/i,
    // Sports / World Cup
    /\b(?:tin\s+tuc|news)\b.*?\b(?:bong\s+da|the\s+thao|world\s*cup|ngoai\s+hang\s+anh|champions\s+league|thoi\s+su|chinh\s+tri)\b/i,
    /\b(?:ai\s+se\s+thang|ket\s+qua|ty\s+so)\b.*?\b(?:world\s*cup|bong\s+da|tran\s+dau|euro\b)/i,
    /\bworld\s*cup\b/i,
    /\btin\s+tuc\s+(?:bong\s+da|moi\s+nhat)\b/i,
    // Cooking recipes
    /\b(?:cong\s+thuc|cach|recipe|how\s+to\s+cook)\s+(?:nau|lam|che\s+bien|pha\s+che)\s+(?:pho|bun|banh|com|lau|mon|thit|ca|ga)\b/i,
    /\b(?:cong\s+thuc\s+nau|cooking\s+recipe)\b/i,
  ];

  for (const regex of outOfScopeRegexes) {
    if (matchesAny(regex)) {
      return { intent: 'out_of_scope', confidence: 0.95 };
    }
  }

  const mealServiceRequest =
    /\b(?:nha\s+hang|quan\s+an|cho\s+an|dia\s+diem\s+an|dich\s+vu\s+an\s+uong|an\s+(?:sang|trua|toi)|dat\s+ban|restaurant|place\s+to\s+eat|meal\s+service|lunch|dinner)\b/i;
  const culinaryExperienceRequest =
    /\b(?:trai\s+nghiem|hoat\s+dong)\b.{0,40}\b(?:am\s+thuc|culinary|food\s+tasting|thuong\s+thuc|nem\s+thu|lop\s+nau\s+an|cooking\s+class)\b|\b(?:am\s+thuc|culinary|food\s+tasting|thuong\s+thuc|nem\s+thu|lop\s+nau\s+an|cooking\s+class)\b.{0,40}\b(?:trai\s+nghiem|hoat\s+dong)\b/i;
  const asksAboutSelectedExperience =
    /\b(?:cai\s+so\s+\d+|(?:hoat\s+dong|trai\s+nghiem|tour)\s+(?:nay|so\s+\d+))\b/i.test(safe)
    && /\b(?:co|bao\s+gom|kem)\b.{0,24}\b(?:an\s+(?:sang|trua|toi)|lunch|dinner)\b/i.test(safe);
  const asksForMealVenue =
    /\b(?:nha\s+hang|quan\s+an|cho\s+an|dia\s+diem\s+an|dat\s+ban|restaurant|place\s+to\s+eat)\b/i.test(safe);
  if (
    matchesAny(mealServiceRequest)
    && !matchesAny(culinaryExperienceRequest)
    && !(asksAboutSelectedExperience && !asksForMealVenue)
  ) {
    return { intent: 'out_of_scope', confidence: 0.95 };
  }

  // -------------------------------------------------------------
  // SMALLTALK & MULTI-INTENT CHECK
  // -------------------------------------------------------------
  // Only when the ENTIRE message is pure greeting/thanks
  const smalltalkRegex =
    /^(?:cam\s+on(?:\s+(?:ban|nhieu|nhe|ban\s+nhieu\s+nhe|nha))?|xin\s+chao|hello|hi|thanks|thank\s+you)[!.?~]*$/i;
  if (smalltalkRegex.test(safe)) {
    return { intent: 'smalltalk', confidence: 0.95 };
  }

  // Multi-intent: starts with greeting/thanks but has subsequent business intent
  if (/^(?:cam\s+on|xin\s+chao|hello|hi|thanks)\b/i.test(safe)) {
    if (
      /(?:doi\s+ngay|doi\s+sang|giam\s+gia|re\s+hon|them|bot|chi\s+goi\s+y)/i.test(
        safe
      )
    ) {
      return { intent: 'refine_results', confidence: 0.85 };
    }
  }

  return null;
}
