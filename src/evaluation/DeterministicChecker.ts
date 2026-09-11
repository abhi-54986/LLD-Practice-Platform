import { DeterministicChecks } from "./IEvaluator.js";

const requiredSections = [
  "Requirements Understanding",
  "Classes & Responsibilities",
  "Relationships",
  "Trade-offs & Assumptions",
] as const;

export class DeterministicChecker {
  check(text: string): DeterministicChecks {
    const normalizedText = text.toLowerCase();
    const sectionPresent = (section: string) => normalizedText.includes(`## ${section.toLowerCase()}`);

    return {
      hasRequirementsSection: sectionPresent(requiredSections[0]),
      hasClassListSection: sectionPresent(requiredSections[1]),
      hasResponsibilitiesSection: sectionPresent(requiredSections[2]),
      hasTradeoffsSection: sectionPresent(requiredSections[3]),
      minLengthMet: text.trim().split(/\s+/).filter(Boolean).length >= 150,
    };
  }

  getFailureReason(checks: DeterministicChecks): string {
    const failedSection = [
      [checks.hasRequirementsSection, "Requirements Understanding"],
      [checks.hasClassListSection, "Classes & Responsibilities"],
      [checks.hasResponsibilitiesSection, "Relationships"],
      [checks.hasTradeoffsSection, "Trade-offs & Assumptions"],
    ].find(([passed]) => !passed);

    if (failedSection) {
      return `Missing section: ${failedSection[1]}`;
    }
    return "Submission is shorter than the required 150 words";
  }
}