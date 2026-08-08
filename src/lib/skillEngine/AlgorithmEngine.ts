// Algorithm Engine: Callable Execution Plans and Complexity Evaluator
import { ParsedSkill, SkillAlgorithm } from './types';

export class AlgorithmEngine {
  /**
   * Retrieve algorithm by ID or intent
   */
  public static getAlgorithm(algorithmIdOrIntent: string, skill: ParsedSkill): SkillAlgorithm | null {
    const key = algorithmIdOrIntent.toLowerCase().trim();
    return (
      skill.algorithms.find(
        (a) =>
          a.id.toLowerCase() === key ||
          a.name.toLowerCase().includes(key) ||
          key.includes(a.id.toLowerCase())
      ) || null
    );
  }

  /**
   * Run algorithm steps trace
   */
  public static executePlan(algorithm: SkillAlgorithm, inputs: Record<string, string>): { stepsExecuted: string[]; outputSummary: string } {
    const stepsExecuted: string[] = [];

    algorithm.steps.forEach((step, idx) => {
      let resolvedStep = step;
      Object.entries(inputs).forEach(([k, v]) => {
        resolvedStep = resolvedStep.replace(new RegExp(`\\b${k}\\b`, 'g'), v);
      });
      stepsExecuted.push(`Step ${idx + 1}: ${resolvedStep}`);
    });

    return {
      stepsExecuted,
      outputSummary: `Executed algorithm '${algorithm.name}' producing expected outputs: [${algorithm.outputs.join(', ')}]`,
    };
  }
}
