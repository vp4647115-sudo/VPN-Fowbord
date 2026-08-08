// Validation Layer: Post-Flight Response Inspection & Hallucination Guardrails
import { ParsedSkill, ValidationResult, RuntimeContext } from './types';
import { RuleEngine } from './RuleEngine';

export class ValidationLayer {
  /**
   * Validate generated draft response against skill templates, persona guidelines, and rules
   */
  public static validateResponse(
    draftContent: string,
    skill: ParsedSkill,
    context: RuntimeContext
  ): ValidationResult {
    // 1. Run RuleEngine validation
    const ruleResult = RuleEngine.validateContent(draftContent, skill);
    const violations = [...ruleResult.violations];
    const suggestions = [...ruleResult.remediationSuggestions];

    // 2. Check Output Template required sections if active intent has template
    if (context.activeIntent) {
      const template = skill.outputTemplates.find((t) => t.intent === context.activeIntent);
      if (template) {
        template.requiredSections.forEach((section) => {
          if (!draftContent.toLowerCase().includes(section.toLowerCase())) {
            violations.push({
              ruleId: 'tpl-section-missing',
              reason: `Response missing required section '${section}' specified in output template for intent '${context.activeIntent}'.`,
              severity: 'medium',
            });
            suggestions.push(`Include section '${section}' in response markdown.`);
          }
        });
      }
    }

    // 3. Hallucination Guardrails & Empty Check
    if (!draftContent || draftContent.trim().length < 10) {
      violations.push({
        ruleId: 'empty-response',
        reason: 'Generated content is empty or incomplete.',
        severity: 'critical',
      });
      suggestions.push('Regenerate response ensuring complete content generation.');
    }

    const isValid = violations.filter((v) => v.severity === 'critical').length === 0 && ruleResult.score >= 70;

    return {
      isValid,
      score: Math.max(0, ruleResult.score - (violations.length - ruleResult.violations.length) * 10),
      violations,
      remediationSuggestions: Array.from(new Set(suggestions)),
    };
  }
}
