export type NodeType =
  | 'rectangle'
  | 'normal-shape'
  | 'text'
  | 'oval'
  | 'circle'
  | 'diamond'
  | 'triangle'
  | 'star'
  | 'database'
  | 'table'
  | 'api-gateway'
  | 'credentials'
  | 'sticky'
  | 'cloud'
  | 'path'
  | 'task'
  | 'idea'
  | 'decision'
  | 'person'
  | 'team'
  | 'service'
  | 'document'
  | 'file'
  | 'website'
  | 'event'
  | 'milestone'
  | 'project'
  | 'bug'
  | 'risk'
  | 'ai-agent'
  | 'condition'
  | 'input'
  | 'output';

export type TaskStatus = 'Backlog' | 'Todo' | 'In Progress' | 'Review' | 'Blocked' | 'Done';
export type TaskPriority = 'Low' | 'Medium' | 'High' | 'Urgent';
export type BoardMode = 'canvas' | 'board' | 'timeline' | 'table' | 'calendar' | 'analytics' | 'presentation';
export type AiAgentType = 'architect' | 'planner' | 'qa' | 'research' | 'documentation' | 'project-manager';

export interface Point {
  x: number;
  y: number;
}

export interface TableColumn {
  name: string;
  type: string;
  isPk?: boolean;
}

export interface CanvasNode {
  id: string;
  type: NodeType;
  title: string;
  subtitle?: string;
  content?: string;
  x: number;
  y: number;
  width?: number;
  height?: number;
  color?: string;
  borderColor?: string;
  strokeWidth?: number;
  strokeStyle?: 'solid' | 'dashed' | 'dotted';
  fontSize?: 'sm' | 'base' | 'lg' | 'xl' | '2xl' | '3xl' | '4xl' | '5xl' | string;
  fontWeight?: 'normal' | 'semibold' | 'bold';
  textAlign?: 'left' | 'center' | 'right';
  opacity?: number;
  // Execution & Task Properties
  status?: TaskStatus;
  priority?: TaskPriority;
  assignee?: string;
  dueDate?: string;
  startDate?: string;
  estimate?: string;
  tags?: string[];
  dependencies?: string[]; // IDs of nodes this node depends on
  isBlocked?: boolean;
  blockReason?: string;
  // Table schema columns
  columns?: TableColumn[];
  // Freehand path points
  points?: Point[];
  strokeColor?: string;
}

export interface Connector {
  id: string;
  fromId: string;
  toId: string;
  label?: string;
  style?: 'solid' | 'dashed' | 'active';
  color?: string;
  relationshipType?: 'blocks' | 'depends' | 'data-flow' | 'trigger' | 'related';
}

export interface CommentItem {
  id: string;
  nodeId: string;
  author: string;
  avatarUrl?: string;
  time: string;
  text: string;
}

export interface ChatMessage {
  id: string;
  author: string;
  avatarUrl?: string;
  time: string;
  text: string;
  isAi?: boolean;
  agentType?: AiAgentType;
}

export interface Collaborator {
  id: string;
  name: string;
  color: string;
  x: number;
  y: number;
  avatarUrl: string;
}

export interface KnowledgeDoc {
  id: string;
  title: string;
  type: 'pdf' | 'doc' | 'notes' | 'spec' | 'url';
  content: string;
  updatedAt: string;
  tags?: string[];
}

export interface QuickCaptureItem {
  id: string;
  type: 'idea' | 'task' | 'bug' | 'note' | 'link';
  title: string;
  details?: string;
  createdAt: string;
  convertedToNodeId?: string;
}

export interface Project {
  id: string;
  title: string;
  description: string;
  updatedAt: string;
  updatedLabel: string;
  category: 'My Projects' | 'Shared with me' | 'Templates' | 'Trash';
  thumbnail?: string;
  userId?: string;
  nodes: CanvasNode[];
  connectors: Connector[];
  comments: CommentItem[];
  chat: ChatMessage[];
  knowledgeDocs?: KnowledgeDoc[];
  quickCaptures?: QuickCaptureItem[];
  currentMode?: BoardMode;
}

export type ViewMode = 'dashboard' | 'workspace';

export interface UserProfileData {
  firstName: string;
  phoneNumber: string;
  email: string;
  location: string;
  otherDetails: string;
  updatedAt?: string;
  isProfileCompleted?: boolean;
}

