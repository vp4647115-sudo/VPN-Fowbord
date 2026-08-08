// Workflow Engine: State Machine Execution for Skill Workflows
import { ParsedSkill, SkillWorkflow, WorkflowStep, RuntimeContext, SkillRole } from './types';
import { PermissionEngine } from './PermissionEngine';

export class WorkflowEngine {
  /**
   * Determine matching workflow for intent
   */
  public static matchWorkflow(intent: string, skill: ParsedSkill): SkillWorkflow | null {
    const cleanIntent = intent.toLowerCase().trim();
    return (
      skill.workflows.find(
        (w) =>
          w.triggerIntent.toLowerCase() === cleanIntent ||
          cleanIntent.includes(w.triggerIntent.toLowerCase()) ||
          w.name.toLowerCase().includes(cleanIntent)
      ) || null
    );
  }

  /**
   * Advance workflow to next step with permission validation
   */
  public static executeStep(
    workflow: SkillWorkflow,
    currentStepId: string | undefined,
    userRole: SkillRole,
    skill: ParsedSkill
  ): { currentStep: WorkflowStep; nextStepId?: string; error?: string } {
    const stepId = currentStepId || workflow.initialStepId;
    const step = workflow.steps.find((s) => s.id === stepId) || workflow.steps[0];

    // Check step permission requirement
    if (step.requiresPermission) {
      const permCheck = PermissionEngine.isActionAllowed(userRole, step.action, skill);
      if (!permCheck.allowed) {
        return {
          currentStep: step,
          error: `Workflow step '${step.name}' blocked: ${permCheck.reason || 'Insufficient permission'}`,
        };
      }
    }

    return {
      currentStep: step,
      nextStepId: step.nextStepId,
    };
  }
}
