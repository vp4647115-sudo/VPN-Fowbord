// Skill Engine Type Definitions for FlowBoard.ai Enterprise AI Engine

export type SkillRole = 'Guest' | 'Student' | 'Teacher' | 'Parent' | 'Viewer' | 'Editor' | 'Admin' | 'Principal' | 'HOD' | 'Owner';

export interface SkillPersona {
  role: string;
  title: string;
  expertise: string[];
  tone: string;
  communicationStyle: string[];
  systemPromptHeader: string;
}

export interface SkillRule {
  id: string;
  category: 'mandatory' | 'prohibited' | 'formatting' | 'security';
  description: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  pattern?: string;
}

export interface SkillConstraint {
  key: string;
  value: string;
  description: string;
}

export interface WorkflowStep {
  id: string;
  name: string;
  actor: string;
  action: string;
  nextStepId?: string;
  requiresPermission?: SkillRole;
  errorFallback?: string;
}

export interface SkillWorkflow {
  id: string;
  name: string;
  triggerIntent: string;
  initialStepId: string;
  steps: WorkflowStep[];
}

export interface DecisionNode {
  id: string;
  condition: string;
  ifTrueStepId: string;
  ifFalseStepId: string;
}

export interface SkillAlgorithm {
  id: string;
  name: string;
  description: string;
  timeComplexity?: string;
  spaceComplexity?: string;
  inputs: string[];
  outputs: string[];
  steps: string[];
  decisionNodes?: DecisionNode[];
}

export interface PermissionRule {
  role: SkillRole;
  allowedActions: string[];
  prohibitedActions: string[];
}

export interface OutputTemplate {
  intent: string;
  format: 'markdown' | 'json' | 'mermaid' | 'table' | 'text';
  templateString: string;
  requiredSections: string[];
}

export interface ParsedSkill {
  id: string;
  name: string;
  version: string;
  description: string;
  author: string;
  persona: SkillPersona;
  rules: SkillRule[];
  constraints: SkillConstraint[];
  workflows: SkillWorkflow[];
  algorithms: SkillAlgorithm[];
  permissions: PermissionRule[];
  outputTemplates: OutputTemplate[];
  rawMarkdown: string;
  loadedAt: string;
}

export interface RuntimeContext {
  userRole: SkillRole;
  userEmail?: string;
  activeIntent?: string;
  conversationHistory: { role: 'user' | 'assistant' | 'system'; content: string }[];
  activeWorkflowId?: string;
  currentStepId?: string;
  extractedInputs?: Record<string, string>;
}

export interface ValidationResult {
  isValid: boolean;
  score: number; // 0 to 100
  violations: { ruleId: string; reason: string; severity: string }[];
  remediationSuggestions: string[];
}

export interface SkillEngineTelemetry {
  loadedSkillId: string;
  activeWorkflow?: string;
  intentIdentified: string;
  appliedRulesCount: number;
  permissionGranted: boolean;
  tokenCountOptimized: number;
  executionTimeMs: number;
  validationResult: ValidationResult;
  stepTrace: string[];
}

export interface SkillEngineResponse {
  content: string;
  telemetry: SkillEngineTelemetry;
  structuredOutput?: Record<string, unknown>;
}
