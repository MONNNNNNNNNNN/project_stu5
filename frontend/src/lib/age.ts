export function ageInMonths(dateOfBirth: string | Date, on: string | Date): number {
  const dob = new Date(dateOfBirth).getTime();
  const at = new Date(on).getTime();
  return (at - dob) / (24 * 60 * 60 * 1000) / 30.4375;
}
