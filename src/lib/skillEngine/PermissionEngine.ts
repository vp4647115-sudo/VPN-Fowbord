// Permission Engine: Evaluates Role-Based Execution Policies
import { ParsedSkill, SkillRole } from './types';

export class PermissionEngine {
  /**
   * Check if a given action is allowed for a user role
   */
  public static isActionAllowed(role: SkillRole, action: string, skill: ParsedSkill): { allowed: boolean; reason?: string } {
    const permissionRule = skill.permissions.find((p) => p.role === role);

    if (!permissionRule) {
      // Default fallback
      if (role === 'Guest' || role === 'Student' || role === 'Viewer') {
        const allowedReadonly = ['view_diagram', 'read_documentation', 'export_png', 'query_ai'];
        if (allowedReadonly.includes(action)) {
          return { allowed: true };
        }
        return { allowed: false, reason: `Role '${role}' lacks write/admin privileges for action '${action}'.` };
      }
      return { allowed: true };
    }

    // Check prohibited list
    if (permissionRule.prohibitedActions.includes(action)) {
      return {
        allowed: false,
        reason: `Action '${action}' is explicitly prohibited for role '${role}'.`,
      };
    }

    // Check allowed list
    if (permissionRule.allowedActions.includes('*') || permissionRule.allowedActions.includes(action)) {
      return { allowed: true };
    }

    // Wildcard permissions for Admin/Owner/Principal
    if (role === 'Owner' || role === 'Admin' || role === 'Principal') {
      return { allowed: true };
    }

    return {
      allowed: false,
      reason: `Role '${role}' does not possess required permission claim for '${action}'.`,
    };
  }
}
