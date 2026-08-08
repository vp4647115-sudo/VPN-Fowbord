// Skill Parser: Transforms raw markdown skill files into structured AST and operational instruction trees
import { ParsedSkill, SkillPersona, SkillRule, SkillConstraint, SkillWorkflow, SkillAlgorithm, PermissionRule, OutputTemplate, SkillRole } from './types';

export class SkillParser {
  /**
   * Parse a raw Markdown skill string into a fully typed ParsedSkill object
   */
  public static parse(rawMarkdown: string, skillId: string = 'flowboard-core', skillName: string = 'FlowBoard Enterprise Architect'): ParsedSkill {
    const lines = rawMarkdown.split('\n');

    const persona: SkillPersona = {
      role: 'Principal AI Software Architect & System Designer',
      title: 'Enterprise AI Systems Engineer',
      expertise: ['System Architecture', 'BPMN Workflows', 'Algorithm Design', 'Full-Stack SaaS', 'Gemini AI', 'Security & RLS'],
      tone: 'Professional, direct, authoritative, design-focused',
      communicationStyle: ['Action-oriented', 'First-principles reasoning', 'Diagram-rich', 'Zero fluff'],
      systemPromptHeader: 'You are a Principal AI Systems Architect with 20+ years of distributed software engineering experience.',
    };

    const rules: SkillRule[] = [];
    const constraints: SkillConstraint[] = [];
    const workflows: SkillWorkflow[] = [];
    const algorithms: SkillAlgorithm[] = [];
    const permissions: PermissionRule[] = [];
    const outputTemplates: OutputTemplate[] = [];

    let currentSection = '';
    let currentSubsection = '';

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();

      if (line.startsWith('# ')) {
        currentSection = line.replace('# ', '').trim();
      } else if (line.startsWith('## ')) {
        currentSubsection = line.replace('## ', '').trim();
      }

      // Parse Persona clues
      if (line.toLowerCase().includes('identity') || line.toLowerCase().includes('project identity')) {
        persona.title = line.split(':')[1]?.trim() || persona.title;
      }
      if (line.toLowerCase().includes('domain:')) {
        persona.expertise = line.split(':')[1]?.split(',').map((s) => s.trim()) || persona.expertise;
      }

      // Parse Rules
      if (line.startsWith('- **') || line.startsWith('* **')) {
        const titleMatch = line.match(/\*\*(.*?)\*\*/);
        if (titleMatch) {
          const ruleTitle = titleMatch[1];
          const ruleBody = line.replace(/\*\*(.*?)\*\*/, '').replace(/^[-\*\s:]+/, '').trim();
          
          const category = line.toLowerCase().includes('security') || line.toLowerCase().includes('auth')
            ? 'security'
            : line.toLowerCase().includes('prohibited') || line.toLowerCase().includes('never')
            ? 'prohibited'
            : line.toLowerCase().includes('must') || line.toLowerCase().includes('always')
            ? 'mandatory'
            : 'formatting';

          rules.push({
            id: `rule-${rules.length + 1}`,
            category,
            description: `${ruleTitle}: ${ruleBody}`,
            severity: category === 'security' || category === 'prohibited' ? 'critical' : 'high',
          });
        }
      }

      // Parse Constraints
      if (line.includes(':') && (currentSubsection.toLowerCase().includes('convention') || currentSubsection.toLowerCase().includes('token'))) {
        const parts = line.split(':');
        if (parts.length >= 2 && parts[0].replace(/[^a-zA-Z0-9\s]/g, '').trim()) {
          constraints.push({
            key: parts[0].replace(/[^a-zA-Z0-9\s_]/g, '').trim(),
            value: parts.slice(1).join(':').trim(),
            description: `Constraint from section ${currentSubsection}`,
          });
        }
      }
    }

    // Populate standard FlowBoard & ERP default Workflows if none parsed
    workflows.push({
      id: 'wf-diagram-synthesis',
      name: 'AI Diagram Synthesis Workflow',
      triggerIntent: 'generate_diagram',
      initialStepId: 'step-1-parse-prompt',
      steps: [
        { id: 'step-1-parse-prompt', name: 'Parse Requirements', actor: 'AI Engine', action: 'Extract nodes, types, and connections from prompt', nextStepId: 'step-2-validate-permissions' },
        { id: 'step-2-validate-permissions', name: 'Validate Permissions', actor: 'Permission Engine', action: 'Verify user has Editor or Owner role', requiresPermission: 'Editor', nextStepId: 'step-3-layout-nodes' },
        { id: 'step-3-layout-nodes', name: 'Grid Layout Simulation', actor: 'Algorithm Engine', action: 'Compute x/y coordinates and connection arrows', nextStepId: 'step-4-format-json' },
        { id: 'step-4-format-json', name: 'Format Output', actor: 'Output Formatter', action: 'Render strict FlowBoard JSON structure' },
      ],
    });

    workflows.push({
      id: 'wf-system-architecture-design',
      name: 'Enterprise System Architecture Design Workflow',
      triggerIntent: 'design_architecture',
      initialStepId: 'step-1-first-principles',
      steps: [
        { id: 'step-1-first-principles', name: 'First-Principles Reasoning', actor: 'Reasoning Engine', action: 'Decompose compute, memory, storage, and network constraints', nextStepId: 'step-2-select-patterns' },
        { id: 'step-2-select-patterns', name: 'Pattern Selection', actor: 'Architecture Engine', action: 'Select Monolith vs Microservices vs Event-Driven', nextStepId: 'step-3-generate-diagram' },
        { id: 'step-3-generate-diagram', name: 'Generate C4 Diagram', actor: 'Mermaid Synthesizer', action: 'Produce C4 Level 1 & Level 2 Mermaid diagrams', nextStepId: 'step-4-adrs-and-checklists' },
        { id: 'step-4-adrs-and-checklists', name: 'Generate ADRs & Verification Checklist', actor: 'Documentation Engine', action: 'Format ADR markdown and pre-flight quality gates' },
      ],
    });

    // Populate standard Algorithms
    algorithms.push({
      id: 'alg-grid-layout',
      name: 'Grid Node Layout Coordinate Simulation',
      description: 'Calculates non-overlapping (x, y) coordinates for whiteboard nodes based on sequential dependencies',
      inputs: ['nodeList', 'canvasWidth', 'canvasHeight'],
      outputs: ['positionedNodeList'],
      steps: [
        'Group nodes into sequential rank tiers based on dependency connectors',
        'Assign tier X coordinate = tierIndex * 280 + 150',
        'Assign tier Y coordinate = nodeIndexInTier * 160 + 120',
        'Check collision bounds and apply +40px offset if overlap detected',
        'Return positioned node array with updated x, y properties',
      ],
    });

    algorithms.push({
      id: 'alg-big-o-complexity',
      name: 'Complexity Analysis & Optimization Estimator',
      description: 'Calculates time and space complexity for proposed algorithms and database queries',
      inputs: ['algorithmSteps', 'datasetSize'],
      outputs: ['bigONotation', 'isAcceptable'],
      steps: [
        'Count nested loops and recursive stack depth',
        'Identify data structures used (Hash map O(1), Binary Search Tree O(log n), Nested Array Scan O(n^2))',
        'Verify if time complexity exceeds O(n log n)',
        'If complexity > O(n log n), trigger warning and suggest indexing or map-reduce optimization',
      ],
    });

    // Default Role Permissions Matrix
    const defaultRoles: SkillRole[] = ['Guest', 'Student', 'Teacher', 'Parent', 'Viewer', 'Editor', 'Admin', 'Principal', 'HOD', 'Owner'];
    defaultRoles.forEach((role) => {
      const isReadonly = role === 'Guest' || role === 'Student' || role === 'Viewer';
      permissions.push({
        role,
        allowedActions: isReadonly
          ? ['view_diagram', 'read_documentation', 'export_png', 'query_ai']
          : ['view_diagram', 'create_diagram', 'edit_diagram', 'generate_diagram', 'design_architecture', 'design_workflow', 'algorithm_execution', 'delete_diagram', 'invite_team', 'manage_settings', 'query_ai', 'execute_workflow'],
        prohibitedActions: isReadonly
          ? ['delete_workspace', 'manage_billing', 'drop_database', 'modify_security_rules']
          : role === 'Owner' || role === 'Admin' || role === 'Principal'
          ? []
          : ['delete_workspace', 'modify_security_rules'],
      });
    });

    // Default Output Templates
    outputTemplates.push({
      intent: 'design_architecture',
      format: 'markdown',
      templateString: `# 🏛️ Enterprise Architecture Specification\n\n## 1. System Overview\n## 2. Component Diagram (Mermaid)\n## 3. Data Flow & Security Controls\n## 4. Architecture Decision Records (ADR)\n## 5. Quality Gate Verification Checklist`,
      requiredSections: ['System Overview', 'Component Diagram', 'Data Flow', 'Architecture Decision Records'],
    });

    outputTemplates.push({
      intent: 'generate_diagram',
      format: 'json',
      templateString: `{\n  "title": "",\n  "description": "",\n  "nodes": [],\n  "connectors": []\n}`,
      requiredSections: ['title', 'nodes', 'connectors'],
    });

    return {
      id: skillId,
      name: skillName,
      version: '2.0.0',
      description: 'FlowBoard Enterprise Systems Architecture & Skill Engine Primary Behavior Controller',
      author: 'FlowBoard AI Engineering',
      persona,
      rules,
      constraints,
      workflows,
      algorithms,
      permissions,
      outputTemplates,
      rawMarkdown,
      loadedAt: new Date().toISOString(),
    };
  }
}
