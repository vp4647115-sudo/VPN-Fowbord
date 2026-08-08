// Context Engine: Selective Token-Optimized Prompt Injection
import { ParsedSkill, RuntimeContext } from './types';

export class ContextEngine {
  /**
   * Build a targeted, token-optimized system instruction prompt based on user intent and active context
   */
  public static buildOptimizedSystemPrompt(skill: ParsedSkill, context: RuntimeContext): string {
    const parts: string[] = [];

    // 1. Always inject Persona
    parts.push(`=== AI AGENT PERSONA ===`);
    parts.push(`Role: ${skill.persona.role}`);
    parts.push(`Title: ${skill.persona.title}`);
    parts.push(`Tone: ${skill.persona.tone}`);
    parts.push(`Header: ${skill.persona.systemPromptHeader}`);
    parts.push(`Communication Style: ${skill.persona.communicationStyle.join(', ')}`);

    // 2. Inject Active User Role & Permissions
    parts.push(`\n=== USER CONTEXT ===`);
    parts.push(`Authenticated User Role: ${context.userRole}`);
    if (context.userEmail) {
      parts.push(`User Email: ${context.userEmail}`);
    }

    // 3. Inject Critical & Mandatory Rules
    parts.push(`\n=== MANDATORY BEHAVIORAL RULES ===`);
    const activeRules = skill.rules.filter((r) => r.severity === 'critical' || r.severity === 'high');
    activeRules.forEach((rule, idx) => {
      parts.push(`${idx + 1}. [${rule.category.toUpperCase()}] ${rule.description}`);
    });

    // 4. Inject Relevant Intent Workflow
    if (context.activeIntent) {
      const activeWf = skill.workflows.find((w) => w.triggerIntent === context.activeIntent || context.activeIntent?.includes(w.triggerIntent));
      if (activeWf) {
        parts.push(`\n=== ACTIVE WORKFLOW STATE MACHINE: ${activeWf.name} ===`);
        activeWf.steps.forEach((step, idx) => {
          parts.push(`Step ${idx + 1} (${step.id}): [Actor: ${step.actor}] ${step.action}`);
        });
      }

      const activeAlg = skill.algorithms.find((a) => context.activeIntent?.includes(a.id) || a.inputs.some((i) => context.activeIntent?.includes(i)));
      if (activeAlg) {
        parts.push(`\n=== ACTIVE ALGORITHM EXECUTION PLAN: ${activeAlg.name} ===`);
        parts.push(`Description: ${activeAlg.description}`);
        parts.push(`Steps:\n${activeAlg.steps.map((s, idx) => `  ${idx + 1}. ${s}`).join('\n')}`);
      }

      const template = skill.outputTemplates.find((t) => t.intent === context.activeIntent);
      if (template) {
        parts.push(`\n=== OUTPUT FORMAT TEMPLATE ===`);
        parts.push(`Required Format: ${template.format}`);
        parts.push(`Required Sections: ${template.requiredSections.join(', ')}`);
        parts.push(`Template Skeleton:\n${template.templateString}`);
      }
    }

    return parts.join('\n');
  }
}
