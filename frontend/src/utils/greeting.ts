export const getFirstName = (fullName?: string): string => {
  if (!fullName) return "there";
  return fullName.trim().split(" ")[0];
};

export const getGreeting = (name?: string): string => {
  const hour = new Date().getHours();
  const firstName = getFirstName(name);
  if (hour < 12) return `Good morning, ${firstName}`;
  if (hour < 17) return `Good afternoon, ${firstName}`;
  return `Good evening, ${firstName}`;
};
