export function applyProfilePatch(profile: any, patch: any): any {
  const result = structuredClone(profile ?? {});

  if (!result.hard_constraints) {
    result.hard_constraints = {};
  }
  if (!result.matching_attributes) {
    result.matching_attributes = [];
  }

  if (patch?.hard_constraints && typeof patch.hard_constraints === 'object') {
    for (const [key, value] of Object.entries(patch.hard_constraints)) {
      if (value === null) {
        delete result.hard_constraints[key];
      } else {
        result.hard_constraints[key] = structuredClone(value);
      }
    }
  }

  if (Array.isArray(patch?.matching_attributes)) {
    for (const attr of patch.matching_attributes) {
      const idx = result.matching_attributes.findIndex(
        (a: any) => a.type === attr.type && a.value === attr.value
      );
      if (idx >= 0) {
        result.matching_attributes[idx] = {
          ...result.matching_attributes[idx],
          polarity: attr.polarity,
        };
      } else {
        result.matching_attributes.push(structuredClone(attr));
      }
    }
  }

  if (Array.isArray(patch?.remove_attributes)) {
    result.matching_attributes = result.matching_attributes.filter(
      (a: any) =>
        !patch.remove_attributes.some(
          (rem: any) => rem.type === a.type && rem.value === a.value
        )
    );
  }

  if (patch?.preference_weights !== undefined) {
    result.preference_weights = structuredClone(patch.preference_weights);
  }
  if (patch?.visitor_profile !== undefined) {
    result.visitor_profile = patch.visitor_profile;
  }

  return result;
}
