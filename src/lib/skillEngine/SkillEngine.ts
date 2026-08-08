// SkillEngine: Primary Operational Brain and Decision Pipeline Orchestrator for FlowBoard.ai
import { ParsedSkill, RuntimeContext, SkillEngineResponse, SkillRole } from './types';
import { SkillParser } from './SkillParser';
import { RuleEngine } from './RuleEngine';
import { PermissionEngine } from './PermissionEngine';
import { ContextEngine } from './ContextEngine';
import { WorkflowEngine } from './WorkflowEngine';
import { AlgorithmEngine } from './AlgorithmEngine';
import { ValidationLayer } from './ValidationLayer';

export class SkillEngine {
  private activeSkills: Map<string, ParsedSkill> = new Map();
  private defaultSkillId: string = 'flowboard-core';

  constructor() {
    // Initialize default core skill from AGENTS.md directives
    this.registerDefaultSkill();
  }

  /**
   * Register default enterprise skill
   */
  private registerDefaultSkill(): void {
    const defaultMarkdown = `# AGENTS.md — FlowBoard.ai Enterprise Agent Directives

> **Project Identity**: FlowBoard.ai — Enterprise Systems Architecture, Algorithm Design & AI Diagram Whiteboard Platform
> **Domain**: System Architecture, BPMN Workflows, Algorithm Design, Full-Stack SaaS

---

## 🏛️ 1. ARCHITECTURE & CODE CONVENTIONS
- **TypeScript Strict Mode**: Never use \`any\`. Define explicit discriminated unions and domain interfaces in \`src/types.ts\`.
- **Early Returns & Guard Clauses**: Validate inputs immediately and return fast before processing main logic.
- **Component Geometry**: Keep components single-purpose and under 250 lines.
- **Zero Console Errors**: Always wrap external API calls in try...catch blocks.

---

## 🔐 2. AUTHENTICATION & SECURITY STANDARDS
- **Primary Auth Engine**: Supabase Authentication with email verification and password validation.
- **Secondary Auth Engine**: Firebase Auth.
- **OAuth & Google Login**: Provide Google OAuth login with graceful fallback.
- **Verification Flow**: Require 6-digit verification code step.

---

## 🎨 3. UI / UX & DESIGN SYSTEM
- **Dark Luxury Aesthetic**: Deep slate canvas (\`#0a0a0c\`, \`#121215\`), glassmorphism cards, vivid electric blue accents (\`#3b82f6\`).
- **Brand Typography**: Bold uppercase tracking for headers (\`FLOWBOARD\` — \`FLOW\` in blue, \`BOARD\` in white/dark slate).
- **Accessibility**: WCAG 2.1 AA contrast compliance, minimum 44px touch targets.
`;

    const parsed = SkillParser.parse(defaultMarkdown, 'flowboard-core', 'FlowBoard Enterprise Architecture');
    this.activeSkills.set(parsed.id, parsed);
  }

  /**
   * Register or update a dynamic Skill
   */
  public registerSkill(skillMarkdown: string, skillId: string, skillName: string): ParsedSkill {
    const parsed = SkillParser.parse(skillMarkdown, skillId, skillName);
    this.activeSkills.set(parsed.id, parsed);
    return parsed;
  }

  /**
   * Get loaded skills
   */
  public getSkill(skillId?: string): ParsedSkill {
    const id = skillId || this.defaultSkillId;
    const skill = this.activeSkills.get(id);
    if (!skill) {
      return Array.from(this.activeSkills.values())[0];
    }
    return skill;
  }

  /**
   * List all registered skills
   */
  public listSkills(): ParsedSkill[] {
    return Array.from(this.activeSkills.values());
  }

  /**
   * Detect user intent from input message
   */
  public detectIntent(userMessage: string): string {
    const msg = userMessage.toLowerCase();
    if (msg.includes('diagram') || msg.includes('architecture') || msg.includes('node') || msg.includes('flowchart') || msg.includes('database schema')) {
      return 'generate_diagram';
    }
    if (msg.includes('design') || msg.includes('system') || msg.includes('microservice') || msg.includes('c4') || msg.includes('adr')) {
      return 'design_architecture';
    }
    if (msg.includes('workflow') || msg.includes('process') || msg.includes('approval') || msg.includes('bpm')) {
      return 'design_workflow';
    }
    if (msg.includes('algorithm') || msg.includes('complexity') || msg.includes('sort') || msg.includes('big-o')) {
      return 'algorithm_execution';
    }
    return 'general_architecture_query';
  }

  /**
   * Primary Operational Pipeline Execution
   */
  public processPipeline(userMessage: string, context: Partial<RuntimeContext>, skillId?: string): {
    optimizedPrompt: string;
    intent: string;
    workflowExecution?: ReturnType<typeof WorkflowEngine.executeStep>;
    algorithmExecution?: ReturnType<typeof AlgorithmEngine.executePlan>;
    permissionCheck: { allowed: boolean; reason?: string };
    skill: ParsedSkill;
  } {
    const skill = this.getSkill(skillId);
    const intent = context.activeIntent || this.detectIntent(userMessage);

    const fullContext: RuntimeContext = {
      userRole: context.userRole || 'Editor',
      userEmail: context.userEmail || 'user@flowboard.app',
      activeIntent: intent,
      conversationHistory: context.conversationHistory || [],
      extractedInputs: context.extractedInputs || { message: userMessage },
    };

    // 1. Permission Gate
    const permissionCheck = PermissionEngine.isActionAllowed(fullContext.userRole, intent, skill);

    // 2. Workflow Match & Advancement
    let workflowExecution;
    const matchedWf = WorkflowEngine.matchWorkflow(intent, skill);
    if (matchedWf) {
      workflowExecution = WorkflowEngine.executeStep(matchedWf, context.currentStepId, fullContext.userRole, skill);
    }

    // 3. Algorithm Match
    let algorithmExecution;
    const matchedAlg = AlgorithmEngine.getAlgorithm(intent, skill);
    if (matchedAlg) {
      algorithmExecution = AlgorithmEngine.executePlan(matchedAlg, fullContext.extractedInputs || {});
    }

    // 4. Build Token-Optimized System Context Prompt
    const optimizedPrompt = ContextEngine.buildOptimizedSystemPrompt(skill, fullContext);

    return {
      optimizedPrompt,
      intent,
      workflowExecution,
      algorithmExecution,
      permissionCheck,
      skill,
    };
  }

  /**
   * Validate post-generation draft response
   */
  public validateGeneratedOutput(draftContent: string, intent: string, userRole: SkillRole = 'Editor', skillId?: string) {
    const skill = this.getSkill(skillId);
    const context: RuntimeContext = {
      userRole,
      activeIntent: intent,
      conversationHistory: [],
    };
    return ValidationLayer.validateResponse(draftContent, skill, context);
  }
}

// Global Singleton Instance
export const globalSkillEngine = new SkillEngine();
