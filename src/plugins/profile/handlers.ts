import type { PublicPrincipal } from "../../types";

export function getAgentSamProfile(principal: PublicPrincipal) {
  const profile: Record<string, string> = { id: principal.profileId };
  if (principal.displayName) profile.name = principal.displayName;
  if (principal.email) profile.email = principal.email;
  if (principal.nickname) profile.nickname = principal.nickname;
  return profile;
}
