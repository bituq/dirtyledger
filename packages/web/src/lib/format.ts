const regionNames = new Intl.DisplayNames(["en"], { type: "region" });

export function countryName(code: string | null): string | null {
  if (!code) return null;
  try {
    return regionNames.of(code.toUpperCase()) ?? code;
  } catch {
    return code;
  }
}

const dateFormat = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "long",
  year: "numeric",
});

export function formatDate(iso: string | null): string | null {
  if (!iso) return null;
  const parsed = new Date(`${iso}T00:00:00Z`);
  if (Number.isNaN(parsed.getTime())) return iso;
  return dateFormat.format(parsed);
}

export const ENTITY_TYPE_LABELS: Record<string, string> = {
  company: "Company",
  organization: "Organization",
  state_body: "State body",
};

export function violationTrackerUrl(name: string): string {
  return `https://violationtracker.goodjobsfirst.org/?company_op=starts&company=${encodeURIComponent(name)}`;
}

export function openSanctionsUrl(name: string): string {
  return `https://www.opensanctions.org/search/?q=${encodeURIComponent(name)}`;
}
