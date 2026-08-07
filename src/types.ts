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
  | 'path';

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
}

export interface Collaborator {
  id: string;
  name: string;
  color: string;
  x: number;
  y: number;
  avatarUrl: string;
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
}

export type ViewMode = 'dashboard' | 'workspace';
