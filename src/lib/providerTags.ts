export function providerTags(p: { isFreelancer?: boolean; isStudioOwner?: boolean; type?: string }): string[] {
  const tags: string[] = [];
  if (p.isFreelancer) tags.push("Freelancer");
  if (p.isStudioOwner) tags.push("Studio");
  // Fallback for records that don't carry the flags yet
  if (tags.length === 0 && p.type) tags.push(p.type);
  return tags;
}