// Rule Engine: Evaluates rules, security guidelines, formatting constraints, and prohibited patterns
import { ParsedSkill, SkillRule, ValidationResult } from './types';

export class RuleEngine {
  /**
   * Evaluate draft content against all loaded Skill rules
   */
  public static validateContent(content: string, skill: ParsedSkill): ValidationResult {
    const violations: { ruleId: string; reason: string; severity: string }[] = [];
    const suggestions: string[] = [];

    let penaltyPoints = 0;

    skill.rules.forEach((rule) => {
      // 1. Prohibited Keyword/Pattern Checks
      if (rule.category === 'prohibited') {
        const prohibitedWords = ['any', 'eval(', 'exec(', 'drop table', 'delete workspace', 'sudo ', 'rm -rf'];
        for (const word of prohibitedWords) {
          if (content.toLowerCase().includes(word) && !content.toLowerCase().includes('never use `any`')) {
            violations.push({
              ruleId: rule.id,
              reason: `Prohibited term or pattern detected: '${word}'`,
              severity: 'critical',
            });
            penaltyPoints += 25;
            suggestions.push(`Remove prohibited pattern '${word}' and replace with clean type-safe alternative.`);
            break;
          }
        }
      }

      // 2. Mandatory Rules Check
      if (rule.category === 'mandatory') {
        if (rule.description.toLowerCase().includes('strict mode') || rule.description.toLowerCase().includes('never use any')) {
          if (/\bany\b/.test(content) && !content.includes('TypeScript Strict Mode') && !content.includes(': unknown')) {
            violations.push({
              ruleId: rule.id,
              reason: 'TypeScript strict mode rule violated: untyped or explicit `any` detected.',
              severity: 'high',
            });
            penaltyPoints += 15;
            suggestions.push('Replace `any` types with explicit domain interfaces or discriminated unions.');
          }
        }
      }

      // 3. Security Rules
      if (rule.category === 'security') {
        if (content.includes('process.env.GEMINI_API_KEY') && content.includes('export const apiKey =')) {
          violations.push({
            ruleId: rule.id,
            reason: 'Security violation: API key exposure in client bundle detected.',
            severity: 'critical',
          });
          penaltyPoints += 30;
          suggestions.push('Keep Gemini API keys server-side only in Express/server.ts.');
        }
      }
    });

    const score = Math.max(0, 100 - penaltyPoints);
    const isValid = violations.filter((v) => v.severity === 'critical').length === 0 && score >= 70;

    return {
      isValid,
      score,
      violations,
      remediationSuggestions: Array.from(new Set(suggestions)),
    };
  }
}
