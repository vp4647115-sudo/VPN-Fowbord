import { CanvasNode, Connector } from '../types';

export interface TemplateItem {
  id: string;
  title: string;
  description: string;
  tag: 'Architecture' | 'Flowchart' | 'Mind Map' | 'Agile' | 'Product';
  nodeCount: number;
  icon: string;
  color: string;
  nodes: CanvasNode[];
  connectors: Connector[];
}

export const TEMPLATES: TemplateItem[] = [
  {
    id: 'tmpl-microservices',
    title: 'Cloud Microservices Architecture',
    description: 'Production-ready cloud architecture with API Gateway, Auth, Database, and Cache nodes.',
    tag: 'Architecture',
    nodeCount: 6,
    icon: 'cloud_sync',
    color: 'bg-blue-500',
    nodes: [
      { id: 'tn-1', type: 'api-gateway', title: 'API Gateway', subtitle: 'SSL Term, Rate Limit & Routing', x: 180, y: 180, width: 200, height: 85, color: '#2563eb', borderColor: '#004ac6' },
      { id: 'tn-2', type: 'credentials', title: 'Auth Service', subtitle: 'OAuth2 / JWT Token Verifier', x: 440, y: 180, width: 190, height: 85, color: '#ffffff', borderColor: '#2563eb' },
      { id: 'tn-3', type: 'rectangle', title: 'User Service', subtitle: 'Profile & Account Logic', x: 700, y: 120, width: 180, height: 80, color: '#ffffff', borderColor: '#004ac6' },
      { id: 'tn-4', type: 'rectangle', title: 'Order Service', subtitle: 'Billing & Transaction Engine', x: 700, y: 260, width: 180, height: 80, color: '#ffffff', borderColor: '#004ac6' },
      { id: 'tn-5', type: 'database', title: 'PostgreSQL Primary', subtitle: 'Persistent Transaction Store', x: 950, y: 120, width: 190, height: 80, color: '#f8fafc', borderColor: '#004ac6' },
      { id: 'tn-6', type: 'database', title: 'Redis Cache Cluster', subtitle: 'In-Memory Key/Value Cache', x: 950, y: 260, width: 190, height: 80, color: '#fff7ed', borderColor: '#ea580c' },
    ],
    connectors: [
      { id: 'tc-1', fromId: 'tn-1', toId: 'tn-2', label: 'Authenticate', style: 'solid', color: '#004ac6' },
      { id: 'tc-2', fromId: 'tn-2', toId: 'tn-3', label: 'Route Validated', style: 'solid', color: '#004ac6' },
      { id: 'tc-3', fromId: 'tn-2', toId: 'tn-4', label: 'Route Validated', style: 'solid', color: '#004ac6' },
      { id: 'tc-4', fromId: 'tn-3', toId: 'tn-5', label: 'SQL Sync', style: 'solid', color: '#004ac6' },
      { id: 'tc-5', fromId: 'tn-4', toId: 'tn-6', label: 'Cache Query', style: 'dashed', color: '#ea580c' },
    ],
  },
  {
    id: 'tmpl-mindmap',
    title: 'Product Strategy Mind Map',
    description: 'Brainstorm core product vision, target market, feature pillars, and success metrics.',
    tag: 'Mind Map',
    nodeCount: 7,
    icon: 'psychology',
    color: 'bg-purple-500',
    nodes: [
      { id: 'mm-1', type: 'circle', title: 'Product Launch 2026', subtitle: 'Core Vision & Strategy', x: 500, y: 250, width: 180, height: 180, color: '#f3e8ff', borderColor: '#9333ea', fontWeight: 'bold' },
      { id: 'mm-2', type: 'sticky', title: 'Target Audience', subtitle: 'DevOps & Tech Leads', x: 220, y: 120, width: 170, height: 90, color: '#fef08a', borderColor: '#ca8a04' },
      { id: 'mm-3', type: 'sticky', title: 'Key Features', subtitle: 'Real-time Canvas & AI Agent', x: 220, y: 380, width: 170, height: 90, color: '#bbf7d0', borderColor: '#16a34a' },
      { id: 'mm-4', type: 'sticky', title: 'Growth Channels', subtitle: 'Product-led viral invites', x: 780, y: 120, width: 170, height: 90, color: '#fed7aa', borderColor: '#ea580c' },
      { id: 'mm-5', type: 'sticky', title: 'Success Metrics', subtitle: '100k WAU & 45% Retention', x: 780, y: 380, width: 170, height: 90, color: '#e0f2fe', borderColor: '#0284c7' },
    ],
    connectors: [
      { id: 'mc-1', fromId: 'mm-1', toId: 'mm-2', label: '', style: 'solid', color: '#ca8a04' },
      { id: 'mc-2', fromId: 'mm-1', toId: 'mm-3', label: '', style: 'solid', color: '#16a34a' },
      { id: 'mc-3', fromId: 'mm-1', toId: 'mm-4', label: '', style: 'solid', color: '#ea580c' },
      { id: 'mc-4', fromId: 'mm-1', toId: 'mm-5', label: '', style: 'solid', color: '#0284c7' },
    ],
  },
  {
    id: 'tmpl-kanban',
    title: 'Agile Sprint Kanban Board',
    description: 'Visual column workflow with interactive task cards for Backlog, In Progress, and Done.',
    tag: 'Agile',
    nodeCount: 8,
    icon: 'view_kanban',
    color: 'bg-emerald-500',
    nodes: [
      { id: 'kb-1', type: 'rectangle', title: '📋 BACKLOG', subtitle: '3 items pending', x: 150, y: 100, width: 220, height: 50, color: '#f1f5f9', borderColor: '#64748b', fontWeight: 'bold' },
      { id: 'kb-2', type: 'sticky', title: 'Task #101', subtitle: 'Set up Supabase tables', x: 150, y: 170, width: 220, height: 80, color: '#fef08a', borderColor: '#ca8a04' },
      { id: 'kb-3', type: 'sticky', title: 'Task #102', subtitle: 'Implement OAuth Google Login', x: 150, y: 270, width: 220, height: 80, color: '#fef08a', borderColor: '#ca8a04' },

      { id: 'kb-4', type: 'rectangle', title: '⚡ IN PROGRESS', subtitle: '2 items active', x: 420, y: 100, width: 220, height: 50, color: '#e0f2fe', borderColor: '#0284c7', fontWeight: 'bold' },
      { id: 'kb-5', type: 'sticky', title: 'Task #103', subtitle: 'Real-time multi-cursor sync', x: 420, y: 170, width: 220, height: 80, color: '#bae6fd', borderColor: '#0284c7' },

      { id: 'kb-6', type: 'rectangle', title: '✅ DONE', subtitle: '2 completed', x: 690, y: 100, width: 220, height: 50, color: '#dcfce7', borderColor: '#16a34a', fontWeight: 'bold' },
      { id: 'kb-7', type: 'sticky', title: 'Task #099', subtitle: 'Moveable Canvas Toolbar', x: 690, y: 170, width: 220, height: 80, color: '#bbf7d0', borderColor: '#16a34a' },
      { id: 'kb-8', type: 'sticky', title: 'Task #100', subtitle: 'Team Email Invite Modal', x: 690, y: 270, width: 220, height: 80, color: '#bbf7d0', borderColor: '#16a34a' },
    ],
    connectors: [],
  },
  {
    id: 'tmpl-userjourney',
    title: 'User Onboarding Flowchart',
    description: 'Decision tree mapping user landing, registration, email verification, and dashboard entry.',
    tag: 'Flowchart',
    nodeCount: 5,
    icon: 'alt_route',
    color: 'bg-amber-500',
    nodes: [
      { id: 'uj-1', type: 'oval', title: 'Landing Page', subtitle: 'User clicks Get Started', x: 150, y: 200, width: 160, height: 70, color: '#ffffff', borderColor: '#64748b' },
      { id: 'uj-2', type: 'credentials', title: 'Registration Form', subtitle: 'Email / Password entry', x: 360, y: 190, width: 190, height: 85, color: '#ffffff', borderColor: '#2563eb' },
      { id: 'uj-3', type: 'diamond', title: 'Valid Email?', subtitle: 'Check domain & format', x: 600, y: 180, width: 150, height: 100, color: '#ffdbcd', borderColor: '#ea580c' },
      { id: 'uj-4', type: 'rectangle', title: 'Send Magic Link', subtitle: 'Send confirmation email', x: 800, y: 120, width: 180, height: 75, color: '#e0f2fe', borderColor: '#0284c7' },
      { id: 'uj-5', type: 'rectangle', title: 'Dashboard Entry', subtitle: 'Welcome modal & tutorial', x: 800, y: 270, width: 180, height: 75, color: '#dcfce7', borderColor: '#16a34a' },
    ],
    connectors: [
      { id: 'uc-1', fromId: 'uj-1', toId: 'uj-2', label: 'Click', style: 'solid', color: '#64748b' },
      { id: 'uc-2', fromId: 'uj-2', toId: 'uj-3', label: 'Submit', style: 'solid', color: '#2563eb' },
      { id: 'uc-3', fromId: 'uj-3', toId: 'uj-4', label: 'Needs Verify', style: 'dashed', color: '#ea580c' },
      { id: 'uc-4', fromId: 'uj-3', toId: 'uj-5', label: 'Verified', style: 'solid', color: '#16a34a' },
    ],
  },
  {
    id: 'tmpl-retro',
    title: 'Sprint Retrospective Board',
    description: 'Collaborative team retro columns: What Went Well, What To Improve, Action Items.',
    tag: 'Agile',
    nodeCount: 7,
    icon: 'rate_review',
    color: 'bg-rose-500',
    nodes: [
      { id: 'rt-1', type: 'rectangle', title: '🎉 WHAT WENT WELL', subtitle: 'Wins & Achievements', x: 180, y: 120, width: 230, height: 50, color: '#dcfce7', borderColor: '#16a34a', fontWeight: 'bold' },
      { id: 'rt-2', type: 'sticky', title: 'Fast AI Diagram Engine', subtitle: 'Gemini generated diagrams in <2s!', x: 180, y: 190, width: 230, height: 90, color: '#bbf7d0', borderColor: '#16a34a' },

      { id: 'rt-3', type: 'rectangle', title: '🔧 WHAT TO IMPROVE', subtitle: 'Gaps & Pain points', x: 450, y: 120, width: 230, height: 50, color: '#fef3c7', borderColor: '#d97706', fontWeight: 'bold' },
      { id: 'rt-4', type: 'sticky', title: 'Mobile Canvas Zoom', subtitle: 'Pinch to zoom needs smoother touch handling', x: 450, y: 190, width: 230, height: 90, color: '#fef08a', borderColor: '#d97706' },

      { id: 'rt-5', type: 'rectangle', title: '🚀 ACTION ITEMS', subtitle: 'Next sprint commitments', x: 720, y: 120, width: 230, height: 50, color: '#e0f2fe', borderColor: '#0284c7', fontWeight: 'bold' },
      { id: 'rt-6', type: 'sticky', title: 'Action #1', subtitle: 'Add Supabase real-time sync table', x: 720, y: 190, width: 230, height: 90, color: '#bae6fd', borderColor: '#0284c7' },
      { id: 'rt-7', type: 'sticky', title: 'Action #2', subtitle: 'Automate team email invitations', x: 720, y: 300, width: 230, height: 90, color: '#bae6fd', borderColor: '#0284c7' },
    ],
    connectors: [],
  },
];
