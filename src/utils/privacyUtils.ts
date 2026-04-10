export const maskAmount = (amount: any, isPrivacyMode: boolean) => {
  if (!isPrivacyMode) return amount;
  return '***';
};

export const maskText = (text: string, isPrivacyMode: boolean) => {
  if (!isPrivacyMode || !text) return text;
  if (text.length <= 2) return text;
  return text.substring(0, 2) + '***';
};
