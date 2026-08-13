import React, { useState, useRef, useEffect } from 'react';
import { CanvasNode, Connector, CommentItem, Project, Point, NodeType } from '../types';
import { exportProjectToPng, exportProjectToSvg, exportProjectToJson } from '../lib/exportUtils';
import { PromptInput } from './ui/ai-chat-input';
import { getApiUrl } from '../lib/api';

interface CanvasWorkspaceProps {
  project: Project;
  onUpdateProject: (updated: Partial<Project>) => void;
  gridStyle?: 'dot' | 'line' | 'blank';
}

type ActiveTool = 'select' | 'pan' | 'draw' | 'shape-draw' | 'connect';

// Color swatches for fill
const COLOR_SWATCHES = [
  { label: 'White', bg: '#ffffff', border: '#c3c6d7', text: '#191c1e' },
  { label: 'Primary Blue', bg: '#e0f2fe', border: '#0284c7', text: '#0369a1' },
  { label: 'Accent Dark Blue', bg: '#2563eb', border: '#004ac6', text: '#ffffff' },
  { label: 'Coral Warm', bg: '#ffdbcd', border: '#943700', text: '#943700' },
  { label: 'Emerald Green', bg: '#dcfce7', border: '#15803d', text: '#14532d' },
  { label: 'Amber Yellow', bg: '#fef3c7', border: '#d97706', text: '#78350f' },
  { label: 'Purple Lavender', bg: '#f3e8ff', border: '#7e22ce', text: '#581c87' },
  { label: 'Charcoal Dark', bg: '#1e293b', border: '#0f172a', text: '#f8fafc' },
  { label: 'Transparent', bg: 'transparent', border: '#94a3b8', text: '#1e293b' },
];

const STROKE_COLORS = [
  '#004ac6',
  '#2563eb',
  '#943700',
  '#15803d',
  '#d97706',
  '#7e22ce',
  '#0f172a',
  '#ffffff',
];

// Helper to determine if a color hex is dark for high-contrast text calculation
const isDarkColor = (colorStr?: string): boolean => {
  if (!colorStr || colorStr === 'transparent' || colorStr === 'white') return false;
  const hex = colorStr.replace('#', '').trim().toLowerCase();
  if (['ffffff', 'f8fafc', 'f1f5f9', 'e0f2fe', 'dcfce7', 'fef3c7', 'f3e8ff', 'ffdbcd', 'fef08a', 'bbf7d0', 'fed7aa'].includes(hex)) {
    return false;
  }
  if (['000000', '0a0a0c', '121215', '1e293b', '0f172a', '2563eb', '004ac6', '18181b', '1e1e24', '000'].includes(hex)) {
    return true;
  }
  if (hex.length === 6) {
    const r = parseInt(hex.substring(0, 2), 16);
    const g = parseInt(hex.substring(2, 4), 16);
    const b = parseInt(hex.substring(4, 6), 16);
    const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
    return luminance < 0.55;
  }
  return false;
};

// Sanitizes AI-generated node colors to enforce theme directives and high contrast
const sanitizeAiNodeColor = (rawColor: string | undefined, nodeType: string): { bg: string; border: string } => {
  const norm = (rawColor || '').trim().toLowerCase();
  if (!rawColor || norm === '#000' || norm === '#000000' || norm === '#0a0a0c' || norm === '#121215' || norm === '#18181b') {
    if (nodeType === 'database') return { bg: '#fff7ed', border: '#ea580c' };
    if (nodeType === 'api-gateway') return { bg: '#ffffff', border: '#2563eb' };
    if (nodeType === 'credentials') return { bg: '#ffffff', border: '#16a34a' };
    if (nodeType === 'sticky') return { bg: '#fef3c7', border: '#d97706' };
    if (nodeType === 'star') return { bg: '#fef3c7', border: '#d97706' };
    if (nodeType === 'cloud') return { bg: '#e0f2fe', border: '#0284c7' };
    if (nodeType === 'oval' || nodeType === 'circle') return { bg: '#f3e8ff', border: '#9333ea' };
    return { bg: '#ffffff', border: '#004ac6' };
  }
  return { bg: rawColor, border: '#004ac6' };
};

// Helper to convert font size setting into pixel number
const getFontPx = (fontSize?: string | number): number => {
  if (typeof fontSize === 'number') return fontSize;
  if (!fontSize) return 14;
  if (fontSize === 'xs') return 11;
  if (fontSize === 'sm') return 12;
  if (fontSize === 'base' || fontSize === 'md') return 14;
  if (fontSize === 'lg') return 16;
  if (fontSize === 'xl') return 18;
  if (fontSize === '2xl') return 22;
  const parsed = parseInt(fontSize, 10);
  return isNaN(parsed) ? 14 : parsed;
};

// Calculates optimal shape dimensions and text bounds to ensure text NEVER overflows or leaks out of shapes
const computeNodeBounds = (node: CanvasNode): { w: number; h: number; titleFontPx: number; subFontPx: number } => {
  const titleText = node.title || '';
  const subText = node.subtitle || '';

  const baseTitleFont = getFontPx(node.fontSize);
  const baseSubFont = Math.max(10, Math.round(baseTitleFont * 0.72));

  // Determine estimated text line requirements
  const titleWords = titleText.split(/\s+/).filter(Boolean);
  const subWords = subText.split(/\s+/).filter(Boolean);

  const maxTitleWordLength = titleWords.length > 0 ? Math.max(...titleWords.map(w => w.length)) : 0;
  const maxSubWordLength = subWords.length > 0 ? Math.max(...subWords.map(w => w.length)) : 0;
  const maxWordLen = Math.max(maxTitleWordLength, maxSubWordLength);

  // Minimum required inner width for max single word
  const minWordWidth = Math.max(65, maxWordLen * baseTitleFont * 0.65);

  // Estimated text block dimensions at ideal line wrapping
  const approxTitleLines = Math.max(1, Math.ceil(titleText.length / 16));
  const approxSubLines = subText ? Math.max(1, Math.ceil(subText.length / 20)) : 0;

  const rawTextWidth = Math.max(
    minWordWidth,
    Math.min(280, Math.max(titleText.length * baseTitleFont * 0.52, subText.length * baseSubFont * 0.52))
  );
  const rawTextHeight = (approxTitleLines * baseTitleFont * 1.25) + (approxSubLines * baseSubFont * 1.25) + 12;

  // Geometry expansion factors for each shape so text stays 100% inside the geometric boundary
  let expansionW = 1.25;
  let expansionH = 1.35;
  let minDefaultW = 180;
  let minDefaultH = 85;

  switch (node.type) {
    case 'circle':
    case 'oval':
      expansionW = 1.55;
      expansionH = 1.55;
      minDefaultW = 145;
      minDefaultH = 135;
      break;
    case 'diamond':
      expansionW = 1.95;
      expansionH = 2.0;
      minDefaultW = 195;
      minDefaultH = 115;
      break;
    case 'star':
      expansionW = 2.25;
      expansionH = 2.25;
      minDefaultW = 195;
      minDefaultH = 195;
      break;
    case 'triangle':
      expansionW = 1.85;
      expansionH = 2.0;
      minDefaultW = 185;
      minDefaultH = 135;
      break;
    case 'cloud':
      expansionW = 1.6;
      expansionH = 1.6;
      minDefaultW = 190;
      minDefaultH = 115;
      break;
    case 'database':
      expansionW = 1.35;
      expansionH = 1.55;
      minDefaultW = 180;
      minDefaultH = 105;
      break;
    case 'table':
      minDefaultW = 240;
      minDefaultH = 180;
      break;
    case 'api-gateway':
    case 'credentials':
      minDefaultW = 200;
      minDefaultH = 95;
      break;
    default:
      minDefaultW = 180;
      minDefaultH = 85;
      break;
  }

  const calculatedW = Math.ceil(Math.max(minDefaultW, rawTextWidth * expansionW));
  const calculatedH = Math.ceil(Math.max(minDefaultH, rawTextHeight * expansionH));

  // Use user-provided width/height if present, but guarantee it never shrinks below the calculated safe bounds for text
  const finalW = node.width ? Math.max(node.width, calculatedW) : calculatedW;
  const finalH = node.height ? Math.max(node.height, calculatedH) : calculatedH;

  // Auto-adjust font size down if node height/width is tight
  let finalTitleFont = baseTitleFont;
  let finalSubFont = baseSubFont;

  if (finalW < rawTextWidth * expansionW * 0.85 || finalH < rawTextHeight * expansionH * 0.85) {
    finalTitleFont = Math.max(11, Math.round(baseTitleFont * 0.85));
    finalSubFont = Math.max(9, Math.round(baseSubFont * 0.85));
  }

  return {
    w: finalW,
    h: finalH,
    titleFontPx: finalTitleFont,
    subFontPx: finalSubFont,
  };
};

export const CanvasWorkspace: React.FC<CanvasWorkspaceProps> = ({
  project,
  onUpdateProject,
  gridStyle = 'dot',
}) => {
  // Tool & Navigation state
  const [activeTool, setActiveTool] = useState<ActiveTool>('select');
  const [selectedShapeType, setSelectedShapeType] = useState<NodeType>('rectangle');
  const [showShapePicker, setShowShapePicker] = useState(false);
  const [showExportMenu, setShowExportMenu] = useState(false);

  // Selection state
  const [selectedNodeIds, setSelectedNodeIds] = useState<string[]>([]);
  const [selectedConnectorId, setSelectedConnectorId] = useState<string | null>(null);

  // AI Tool & Generation State
  const [isAiGenerating, setIsAiGenerating] = useState(false);
  const [showAiTool, setShowAiTool] = useState(true);
  const [aiNotice, setAiNotice] = useState<string | null>(null);

  const handleAiSubmit = async (
    promptText: string,
    meta: { model: string; effort: string; attachments: File[] }
  ) => {
    if (!promptText.trim()) return;
    setIsAiGenerating(true);
    setAiNotice(`Generating diagram with ${meta.model}...`);

    try {
      const res = await fetch(getApiUrl('/api/ai/generate-diagram'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: promptText,
          model: meta.model,
          effort: meta.effort,
          diagramType: 'Architecture and Flow',
          visualStyle: 'Professional SaaS'
        }),
      });

      let data: any = {};
      const resText = await res.text();
      if (resText) {
        try {
          data = JSON.parse(resText);
        } catch (e) {
          console.warn('Response was not valid JSON:', resText);
          data = { success: false, error: 'Server returned an invalid response format' };
        }
      } else {
        data = { success: false, error: 'Empty response received from server' };
      }

      if (data.success && data.diagram) {
        const { nodes: newNodes, connectors: newConnectors, title: newTitle } = data.diagram;
        
        // Calculate offset position for new nodes so they don't overlap
        const existingMaxX = project.nodes.length > 0 ? Math.max(...project.nodes.map((n) => n.x + (n.width || 180))) : 100;
        const startX = project.nodes.length > 0 ? existingMaxX + 150 : 200;

        const createdNodes: CanvasNode[] = (newNodes || []).map((n: any, idx: number) => {
          const sanitized = sanitizeAiNodeColor(n.color, n.type);
          return {
            id: n.id || `ai-node-${Date.now()}-${idx}`,
            type: (n.type as NodeType) || 'rectangle',
            title: n.title || 'AI Service',
            subtitle: n.subtitle || '',
            x: (n.x || 200) + (project.nodes.length > 0 ? startX - 200 : 0),
            y: (n.y || 150),
            color: sanitized.bg,
            borderColor: n.borderColor && n.borderColor !== '#000000' && n.borderColor !== '#0a0a0c' ? n.borderColor : sanitized.border,
            width: n.type === 'table' ? 240 : 190,
            height: n.type === 'table' ? 200 : 85,
            columns: n.columns || (n.type === 'table' ? [
              { name: 'id', type: 'UUID', isPk: true },
              { name: 'name', type: 'VARCHAR(100)' },
              { name: 'created_at', type: 'TIMESTAMP' }
            ] : undefined),
          };
        });

        const createdConnectors: Connector[] = (newConnectors || []).map((c: any, idx: number) => ({
          id: c.id || `ai-conn-${Date.now()}-${idx}`,
          fromId: c.fromId,
          toId: c.toId,
          label: c.label || '',
          style: c.style || 'solid',
          color: c.color || '#004ac6',
        }));

        onUpdateProject({
          title: project.title === 'Untitled FlowBoard' && newTitle ? newTitle : project.title,
          nodes: [...project.nodes, ...createdNodes],
          connectors: [...project.connectors, ...createdConnectors],
        });

        setAiNotice(`✨ Created ${createdNodes.length} nodes & ${createdConnectors.length} connections!`);
        setTimeout(() => setAiNotice(null), 5000);
      } else {
        setAiNotice(`AI Error: ${data.error || 'Failed to generate diagram'}`);
        setTimeout(() => setAiNotice(null), 5000);
      }
    } catch (err: any) {
      console.error('AI Generation error:', err);
      const errMsg = err?.message || 'Network error occurred while generating diagram.';
      setAiNotice(`AI Error: ${errMsg}`);
      setTimeout(() => setAiNotice(null), 5000);
    } finally {
      setIsAiGenerating(false);
    }
  };

  // Moveable Toolbar State
  const [toolbarPos, setToolbarPos] = useState<{ x: number; y: number } | null>(null);
  const [isDraggingToolbar, setIsDraggingToolbar] = useState(false);

  const startToolbarDrag = (clientX: number, clientY: number, target: HTMLElement) => {
    const navElem = target.closest('nav');
    if (!navElem) return;
    const rect = navElem.getBoundingClientRect();
    const startX = clientX;
    const startY = clientY;
    const initialX = rect.left;
    const initialY = rect.top;

    setIsDraggingToolbar(true);

    const handleMove = (moveX: number, moveY: number) => {
      const deltaX = moveX - startX;
      const deltaY = moveY - startY;
      const newX = Math.max(10, Math.min(window.innerWidth - 80, initialX + deltaX));
      const newY = Math.max(70, Math.min(window.innerHeight - 300, initialY + deltaY));
      setToolbarPos({ x: newX, y: newY });
    };

    const handleMouseMove = (moveEvent: MouseEvent) => {
      if (moveEvent.buttons === 0) {
        handleDragEnd();
        return;
      }
      moveEvent.preventDefault();
      handleMove(moveEvent.clientX, moveEvent.clientY);
    };

    const handleTouchMove = (touchEvent: TouchEvent) => {
      if (touchEvent.touches.length > 0) {
        touchEvent.preventDefault();
        handleMove(touchEvent.touches[0].clientX, touchEvent.touches[0].clientY);
      } else {
        handleDragEnd();
      }
    };

    const handleDragEnd = () => {
      setIsDraggingToolbar(false);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleDragEnd);
      window.removeEventListener('pointerup', handleDragEnd);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleDragEnd);
      window.removeEventListener('touchcancel', handleDragEnd);
      window.removeEventListener('blur', handleDragEnd);
    };

    window.addEventListener('mousemove', handleMouseMove, { passive: false });
    window.addEventListener('mouseup', handleDragEnd);
    window.addEventListener('pointerup', handleDragEnd);
    window.addEventListener('touchmove', handleTouchMove, { passive: false });
    window.addEventListener('touchend', handleDragEnd);
    window.addEventListener('touchcancel', handleDragEnd);
    window.addEventListener('blur', handleDragEnd);
  };

  const handleToolbarDragStart = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    startToolbarDrag(e.clientX, e.clientY, e.currentTarget as HTMLElement);
  };

  const handleToolbarTouchStart = (e: React.TouchEvent) => {
    e.stopPropagation();
    if (e.touches.length > 0) {
      startToolbarDrag(e.touches[0].clientX, e.touches[0].clientY, e.currentTarget as HTMLElement);
    }
  };

  // Pan & Zoom state
  const [zoom, setZoom] = useState<number>(1);
  const [pan, setPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isSpacePressed, setIsSpacePressed] = useState(false);

  // Freehand Pen Drawing State
  const [penColor, setPenColor] = useState<string>('#004ac6');
  const [penWidth, setPenWidth] = useState<number>(4);
  const [isDrawing, setIsDrawing] = useState<boolean>(false);
  const [currentPathPoints, setCurrentPathPoints] = useState<Point[]>([]);

  // Drag-to-Draw Shape State
  const [isDrawingShape, setIsDrawingShape] = useState<boolean>(false);
  const [shapeDrawStart, setShapeDrawStart] = useState<Point | null>(null);
  const [shapeDrawCurrent, setShapeDrawCurrent] = useState<Point | null>(null);

  // Box Drag Selection State
  const [isBoxSelecting, setIsBoxSelecting] = useState<boolean>(false);
  const [selectionBoxStart, setSelectionBoxStart] = useState<Point | null>(null);
  const [selectionBoxCurrent, setSelectionBoxCurrent] = useState<Point | null>(null);

  // Dragging Node State
  const [draggingNodeId, setDraggingNodeId] = useState<string | null>(null);
  const [dragOffsets, setDragOffsets] = useState<Record<string, { x: number; y: number }>>({});

  // Connection Line State
  const [connectingFromId, setConnectingFromId] = useState<string | null>(null);
  const [mouseCanvasPos, setMouseCanvasPos] = useState<Point>({ x: 0, y: 0 });

  // Comment Thread State
  const [activeThreadNodeId, setActiveThreadNodeId] = useState<string | null>(null);
  const [replyInput, setReplyInput] = useState('');

  const containerRef = useRef<HTMLDivElement>(null);

  // Helper: Convert screen coords to canvas internal coords
  const screenToCanvasCoords = (clientX: number, clientY: number): Point => {
    if (!containerRef.current) return { x: clientX, y: clientY };
    const rect = containerRef.current.getBoundingClientRect();
    return {
      x: (clientX - rect.left - pan.x) / zoom,
      y: (clientY - rect.top - pan.y) / zoom,
    };
  };

  // Keyboard Shortcuts (Space for Pan, Delete/Backspace for removal, Esc to clear)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }
      if (e.code === 'Space' && !isSpacePressed) {
        setIsSpacePressed(true);
      }
      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (selectedNodeIds.length > 0) {
          handleBatchDeleteSelected();
        } else if (selectedConnectorId) {
          handleDeleteConnector(selectedConnectorId);
        }
      }
      if (e.key === 'Escape') {
        setSelectedNodeIds([]);
        setSelectedConnectorId(null);
        setConnectingFromId(null);
        setActiveThreadNodeId(null);
        setShowShapePicker(false);
        setShowExportMenu(false);
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        setIsSpacePressed(false);
        setIsPanning(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [isSpacePressed, selectedNodeIds, selectedConnectorId]);

  // Reset active interaction states when switching tools to prevent stuck dragging/drawing states
  useEffect(() => {
    setIsDrawing(false);
    setCurrentPathPoints([]);
    setIsDrawingShape(false);
    setShapeDrawStart(null);
    setShapeDrawCurrent(null);
    setIsBoxSelecting(false);
    setSelectionBoxStart(null);
    setSelectionBoxCurrent(null);
    setDraggingNodeId(null);
    setConnectingFromId(null);
    setIsPanning(false);
    if (activeTool !== 'shape-draw') {
      setShowShapePicker(false);
    }
  }, [activeTool]);

  // Multi-touch Pinch-Zoom Ref
  const touchPinchRef = useRef<{
    initialDist: number;
    initialZoom: number;
    initialPan: Point;
    center: Point;
  } | null>(null);

  // Wheel Zoom / Pan Event Handler with non-passive event listener
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      if (e.ctrlKey || e.metaKey) {
        // Zoom centered on mouse cursor
        const zoomFactor = e.deltaY < 0 ? 1.08 : 0.92;
        setZoom((prevZoom) => {
          const newZoom = Math.min(Math.max(0.2, prevZoom * zoomFactor), 4);
          const rect = container.getBoundingClientRect();
          const mousePos = {
            x: (e.clientX - rect.left - pan.x) / prevZoom,
            y: (e.clientY - rect.top - pan.y) / prevZoom,
          };
          const newPanX = e.clientX - rect.left - mousePos.x * newZoom;
          const newPanY = e.clientY - rect.top - mousePos.y * newZoom;
          setPan({ x: newPanX, y: newPanY });
          return newZoom;
        });
      } else {
        // Scroll to Pan
        setPan((prev) => ({
          x: prev.x - e.deltaX,
          y: prev.y - e.deltaY,
        }));
      }
    };

    container.addEventListener('wheel', onWheel, { passive: false });
    return () => {
      container.removeEventListener('wheel', onWheel);
    };
  }, [pan, zoom]);

  // Touch Handlers for Mobile / Tablet Support (Single Finger & Multi-Touch Pinch/Pan)
  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      const t1 = e.touches[0];
      const t2 = e.touches[1];
      const dist = Math.hypot(t1.clientX - t2.clientX, t1.clientY - t2.clientY);
      const center = {
        x: (t1.clientX + t2.clientX) / 2,
        y: (t1.clientY + t2.clientY) / 2,
      };
      touchPinchRef.current = {
        initialDist: dist,
        initialZoom: zoom,
        initialPan: { ...pan },
        center,
      };
    } else if (e.touches.length === 1) {
      touchPinchRef.current = null;
      const touch = e.touches[0];
      const mouseEvt = {
        clientX: touch.clientX,
        clientY: touch.clientY,
        button: 0,
        shiftKey: e.shiftKey,
        target: e.target,
        stopPropagation: () => e.stopPropagation(),
        preventDefault: () => e.preventDefault(),
      } as unknown as React.MouseEvent;
      handleCanvasMouseDown(mouseEvt);
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (e.touches.length === 2 && touchPinchRef.current) {
      e.preventDefault();
      const t1 = e.touches[0];
      const t2 = e.touches[1];
      const dist = Math.hypot(t1.clientX - t2.clientX, t1.clientY - t2.clientY);
      const center = {
        x: (t1.clientX + t2.clientX) / 2,
        y: (t1.clientY + t2.clientY) / 2,
      };
      const { initialDist, initialZoom, initialPan, center: initCenter } = touchPinchRef.current;
      if (initialDist > 0) {
        const scale = dist / initialDist;
        const newZoom = Math.min(Math.max(0.2, initialZoom * scale), 4);
        const dx = center.x - initCenter.x;
        const dy = center.y - initCenter.y;

        if (containerRef.current) {
          const rect = containerRef.current.getBoundingClientRect();
          const canvasPt = {
            x: (initCenter.x - rect.left - initialPan.x) / initialZoom,
            y: (initCenter.y - rect.top - initialPan.y) / initialZoom,
          };
          const newPanX = initCenter.x - rect.left - canvasPt.x * newZoom + dx;
          const newPanY = initCenter.y - rect.top - canvasPt.y * newZoom + dy;
          setZoom(newZoom);
          setPan({ x: newPanX, y: newPanY });
        }
      }
    } else if (e.touches.length === 1) {
      const touch = e.touches[0];
      const mouseEvt = {
        clientX: touch.clientX,
        clientY: touch.clientY,
        shiftKey: e.shiftKey,
        target: e.target,
        stopPropagation: () => e.stopPropagation(),
        preventDefault: () => e.preventDefault(),
      } as unknown as React.MouseEvent;
      handleCanvasMouseMove(mouseEvt);
    }
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (e.touches.length < 2) {
      touchPinchRef.current = null;
    }
    handleCanvasMouseUp();
  };

  const handleNodeTouchStart = (e: React.TouchEvent, node: CanvasNode) => {
    if (e.touches.length === 1) {
      const touch = e.touches[0];
      const mouseEvt = {
        clientX: touch.clientX,
        clientY: touch.clientY,
        button: 0,
        shiftKey: e.shiftKey,
        target: e.target,
        stopPropagation: () => e.stopPropagation(),
        preventDefault: () => e.preventDefault(),
      } as unknown as React.MouseEvent;
      handleNodeMouseDown(mouseEvt, node);
    }
  };

  // Canvas Mouse Down
  const handleCanvasMouseDown = (e: React.MouseEvent) => {
    const canvasPt = screenToCanvasCoords(e.clientX, e.clientY);

    const isBg =
      (e.target as HTMLElement).id === 'board-canvas' ||
      (e.target as HTMLElement).tagName === 'svg' ||
      (e.target as HTMLElement).id === 'canvas-container';

    if (activeTool === 'pan' || isSpacePressed || e.button === 1) {
      setIsPanning(true);
      setPanStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
      return;
    }

    if (activeTool === 'draw') {
      setIsDrawing(true);
      setCurrentPathPoints([canvasPt]);
      return;
    }

    if (activeTool === 'shape-draw') {
      setIsDrawingShape(true);
      setShapeDrawStart(canvasPt);
      setShapeDrawCurrent(canvasPt);
      return;
    }

    if (isBg) {
      if (connectingFromId) {
        // Cancel active connection if background clicked
        setConnectingFromId(null);
      } else if (e.shiftKey) {
        // Shift + Drag Box Selection
        setIsBoxSelecting(true);
        setSelectionBoxStart(canvasPt);
        setSelectionBoxCurrent(canvasPt);
      } else {
        // Deselect all
        setSelectedNodeIds([]);
        setSelectedConnectorId(null);
        setActiveThreadNodeId(null);
        setShowShapePicker(false);
        setShowExportMenu(false);
        setIsPanning(true);
        setPanStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
      }
    }
  };

  // Canvas Mouse Move
  const handleCanvasMouseMove = (e: React.MouseEvent) => {
    // Safety check: If mouse button is released (buttons === 0), release tracking immediately
    if (e.buttons === 0) {
      if (isPanning || isDrawing || isDrawingShape || isBoxSelecting || draggingNodeId !== null) {
        handleCanvasMouseUp();
        return;
      }
    }

    const canvasPt = screenToCanvasCoords(e.clientX, e.clientY);
    setMouseCanvasPos(canvasPt);

    if (isPanning) {
      setPan({ x: e.clientX - panStart.x, y: e.clientY - panStart.y });
      return;
    }

    if (isDrawing) {
      setCurrentPathPoints((prev) => [...prev, canvasPt]);
      return;
    }

    if (isDrawingShape) {
      setShapeDrawCurrent(canvasPt);
      return;
    }

    if (isBoxSelecting && selectionBoxStart) {
      setSelectionBoxCurrent(canvasPt);

      const minX = Math.min(selectionBoxStart.x, canvasPt.x);
      const maxX = Math.max(selectionBoxStart.x, canvasPt.x);
      const minY = Math.min(selectionBoxStart.y, canvasPt.y);
      const maxY = Math.max(selectionBoxStart.y, canvasPt.y);

      const hitNodeIds = project.nodes
        .filter((n) => {
          const w = n.width || 180;
          const h = n.height || 80;
          return n.x >= minX && n.x + w <= maxX && n.y >= minY && n.y + h <= maxY;
        })
        .map((n) => n.id);

      setSelectedNodeIds(hitNodeIds);
      return;
    }

    if (draggingNodeId) {
      const updatedNodes = project.nodes.map((node) => {
        if (selectedNodeIds.includes(node.id) && dragOffsets[node.id]) {
          return {
            ...node,
            x: Math.round(canvasPt.x - dragOffsets[node.id].x),
            y: Math.round(canvasPt.y - dragOffsets[node.id].y),
          };
        }
        return node;
      });
      onUpdateProject({ nodes: updatedNodes });
    }
  };

  // Canvas Mouse Up
  const handleCanvasMouseUp = () => {
    if (isPanning) {
      setIsPanning(false);
    }

    if (isDrawing && currentPathPoints.length > 1) {
      setIsDrawing(false);
      const xs = currentPathPoints.map((p) => p.x);
      const ys = currentPathPoints.map((p) => p.y);
      const minX = Math.min(...xs);
      const minY = Math.min(...ys);
      const maxX = Math.max(...xs);
      const maxY = Math.max(...ys);

      const width = Math.max(20, Math.round(maxX - minX));
      const height = Math.max(20, Math.round(maxY - minY));

      // Store points relative to top-left (minX, minY) so dragging moves the node cleanly
      const relativePoints = currentPathPoints.map((p) => ({
        x: Math.round(p.x - minX),
        y: Math.round(p.y - minY),
      }));

      const newDrawingNode: CanvasNode = {
        id: 'draw-' + Date.now(),
        type: 'path',
        title: 'Freehand Stroke',
        x: Math.round(minX),
        y: Math.round(minY),
        width,
        height,
        points: relativePoints,
        strokeColor: penColor,
        strokeWidth: penWidth,
        opacity: 100,
      };

      onUpdateProject({ nodes: [...project.nodes, newDrawingNode] });
      setCurrentPathPoints([]);
      setSelectedNodeIds([newDrawingNode.id]);
    }

    if (isDrawingShape && shapeDrawStart && shapeDrawCurrent) {
      setIsDrawingShape(false);
      const minX = Math.min(shapeDrawStart.x, shapeDrawCurrent.x);
      const minY = Math.min(shapeDrawStart.y, shapeDrawCurrent.y);
      const w = Math.max(50, Math.abs(shapeDrawCurrent.x - shapeDrawStart.x));
      const h = Math.max(40, Math.abs(shapeDrawCurrent.y - shapeDrawStart.y));

      const newShapeNode: CanvasNode = {
        id: 'shape-' + Date.now(),
        type: selectedShapeType,
        title: getShapeDefaultTitle(selectedShapeType),
        subtitle: 'Click to edit text',
        x: Math.round(minX),
        y: Math.round(minY),
        width: Math.round(w),
        height: Math.round(h),
        color: selectedShapeType === 'sticky' ? '#ffdbcd' : '#ffffff',
        borderColor: selectedShapeType === 'sticky' ? '#943700' : '#004ac6',
        strokeWidth: 2,
        strokeStyle: 'solid',
        opacity: 100,
      };

      onUpdateProject({ nodes: [...project.nodes, newShapeNode] });
      setShapeDrawStart(null);
      setShapeDrawCurrent(null);
      setSelectedNodeIds([newShapeNode.id]);
      setActiveTool('select');
    }

    if (isBoxSelecting) {
      setIsBoxSelecting(false);
      setSelectionBoxStart(null);
      setSelectionBoxCurrent(null);
    }

    setDraggingNodeId(null);
  };

  // Ref for handleCanvasMouseUp so global window listener always references current state
  const handleCanvasMouseUpRef = useRef(handleCanvasMouseUp);
  useEffect(() => {
    handleCanvasMouseUpRef.current = handleCanvasMouseUp;
  });

  // Global window release listener to guarantee dragging/panning/drawing stops on mouseup anywhere or blur
  useEffect(() => {
    const isInteracting =
      draggingNodeId !== null ||
      isPanning ||
      isDrawing ||
      isDrawingShape ||
      isBoxSelecting;

    if (!isInteracting) return;

    const handleGlobalRelease = () => {
      handleCanvasMouseUpRef.current();
    };

    window.addEventListener('mouseup', handleGlobalRelease);
    window.addEventListener('pointerup', handleGlobalRelease);
    window.addEventListener('blur', handleGlobalRelease);

    return () => {
      window.removeEventListener('mouseup', handleGlobalRelease);
      window.removeEventListener('pointerup', handleGlobalRelease);
      window.removeEventListener('blur', handleGlobalRelease);
    };
  }, [draggingNodeId, isPanning, isDrawing, isDrawingShape, isBoxSelecting]);

  // Node Mouse Down Handling (Supports Selection & Connecting Line Creation)
  const handleNodeMouseDown = (e: React.MouseEvent, node: CanvasNode) => {
    if (activeTool === 'draw' || activeTool === 'shape-draw') {
      // Let it bubble to canvas for drawing
      return;
    }
    e.stopPropagation();
    setSelectedConnectorId(null);

    // If in connecting mode or currently drawing connection
    if (activeTool === 'connect' || connectingFromId) {
      if (!connectingFromId) {
        setConnectingFromId(node.id);
      } else if (connectingFromId !== node.id) {
        // Complete connection between node A and node B
        const newConn: Connector = {
          id: 'conn-' + Date.now(),
          fromId: connectingFromId,
          toId: node.id,
          label: 'Data Link',
          style: 'solid',
          color: '#004ac6',
        };
        onUpdateProject({ connectors: [...project.connectors, newConn] });
        setConnectingFromId(null);
        setActiveTool('select');
      }
      return;
    }

    // Shift key selection
    let newSelection = [...selectedNodeIds];
    if (e.shiftKey) {
      if (newSelection.includes(node.id)) {
        newSelection = newSelection.filter((id) => id !== node.id);
      } else {
        newSelection.push(node.id);
      }
    } else {
      if (!newSelection.includes(node.id)) {
        newSelection = [node.id];
      }
    }
    setSelectedNodeIds(newSelection);

    // Set offsets for node dragging
    const mousePt = screenToCanvasCoords(e.clientX, e.clientY);
    const offsets: Record<string, { x: number; y: number }> = {};
    project.nodes.forEach((n) => {
      if (newSelection.includes(n.id)) {
        offsets[n.id] = {
          x: mousePt.x - n.x,
          y: mousePt.y - n.y,
        };
      }
    });

    setDraggingNodeId(node.id);
    setDragOffsets(offsets);
  };

  // Start Connection from Connection Handle Dot
  const handleStartConnection = (e: React.MouseEvent, nodeId: string) => {
    e.stopPropagation();
    setConnectingFromId(nodeId);
    setActiveTool('connect');
  };

  // Helper to resolve font size to numeric pixel value
  const getFontPx = (size?: string): number => {
    if (!size) return 16;
    if (!isNaN(Number(size))) return Number(size);
    if (size.endsWith('px')) return Number(size.replace('px', ''));
    switch (size) {
      case 'xs': return 12;
      case 'sm': return 14;
      case 'base': return 16;
      case 'lg': return 20;
      case 'xl': return 24;
      case '2xl': return 32;
      case '3xl': return 40;
      case '4xl': return 48;
      case '5xl': return 64;
      default: return 16;
    }
  };

  // Quick Preset Shape Spawn
  const handleQuickAddShape = (type: NodeType) => {
    const centerPt = screenToCanvasCoords(
      window.innerWidth / 2,
      window.innerHeight / 2
    );
    const id = 'node-' + Date.now();
    const isText = type === 'text';
    const isNormal = type === 'normal-shape';
    const isTable = type === 'table';

    const defaultCols = isTable
      ? [
          { name: 'id', type: 'UUID', isPk: true },
          { name: 'username', type: 'VARCHAR(100)' },
          { name: 'email', type: 'VARCHAR(255)' },
          { name: 'created_at', type: 'TIMESTAMP' },
        ]
      : undefined;

    const newNode: CanvasNode = {
      id,
      type,
      title: isText ? 'Heading / Text' : isTable ? 'Users Table' : isNormal ? 'Normal Shape' : getShapeDefaultTitle(type),
      subtitle: isText ? '' : isTable ? 'Database Entity' : 'Click to customize',
      x: Math.round(centerPt.x - 110),
      y: Math.round(centerPt.y - 60),
      width: isText ? 180 : type === 'circle' || type === 'oval' ? 130 : isTable ? 220 : type === 'database' ? 190 : type === 'diamond' ? 160 : type === 'triangle' ? 160 : type === 'star' ? 160 : 190,
      height: isText ? 50 : type === 'circle' || type === 'oval' ? 130 : isTable ? 170 : type === 'database' ? 120 : type === 'diamond' ? 130 : type === 'triangle' ? 130 : type === 'star' ? 150 : 90,
      color: isText ? 'transparent' : type === 'sticky' ? '#ffdbcd' : '#ffffff',
      borderColor: isText ? 'transparent' : type === 'sticky' ? '#943700' : '#004ac6',
      strokeWidth: isText ? 0 : 2,
      fontSize: isText ? '24' : '16',
      opacity: 100,
      columns: defaultCols,
    };

    onUpdateProject({ nodes: [...project.nodes, newNode] });
    setSelectedNodeIds([id]);
    setShowShapePicker(false);
    setActiveTool('select');
  };

  // Helper title mapping
  function getShapeDefaultTitle(type: NodeType): string {
    switch (type) {
      case 'normal-shape':
        return 'Normal Shape';
      case 'text':
        return 'Text Element';
      case 'table':
        return 'Database Table';
      case 'rectangle':
        return 'Process Box';
      case 'circle':
      case 'oval':
        return 'State / Event';
      case 'diamond':
        return 'Decision Gate';
      case 'triangle':
        return 'Filter Node';
      case 'star':
        return 'Milestone Star';
      case 'database':
        return 'Database Store';
      case 'cloud':
        return 'Cloud Cluster';
      case 'sticky':
        return 'Sticky Note';
      case 'credentials':
        return 'Auth Credentials';
      case 'api-gateway':
        return 'API Gateway';
      default:
        return 'Custom Component';
    }
  }

  // Batch Update Selected Nodes
  const handleApplyStyleToSelected = (updates: Partial<CanvasNode>) => {
    if (selectedNodeIds.length === 0) return;
    const updatedNodes = project.nodes.map((n) => {
      if (selectedNodeIds.includes(n.id)) {
        return { ...n, ...updates };
      }
      return n;
    });
    onUpdateProject({ nodes: updatedNodes });
  };

  // Delete Selected Nodes
  const handleBatchDeleteSelected = () => {
    if (selectedNodeIds.length === 0) return;
    const updatedNodes = project.nodes.filter(
      (n) => !selectedNodeIds.includes(n.id)
    );
    const updatedConnectors = project.connectors.filter(
      (c) =>
        !selectedNodeIds.includes(c.fromId) && !selectedNodeIds.includes(c.toId)
    );
    onUpdateProject({ nodes: updatedNodes, connectors: updatedConnectors });
    setSelectedNodeIds([]);
  };

  // Duplicate Selected Nodes
  const handleDuplicateSelected = () => {
    if (selectedNodeIds.length === 0) return;
    const newNodes: CanvasNode[] = [];

    project.nodes.forEach((n) => {
      if (selectedNodeIds.includes(n.id)) {
        const newId = 'node-' + Date.now() + Math.random().toString(36).substring(2, 5);
        newNodes.push({
          ...n,
          id: newId,
          x: n.x + 40,
          y: n.y + 40,
          title: `${n.title} (Copy)`,
        });
      }
    });

    onUpdateProject({ nodes: [...project.nodes, ...newNodes] });
    setSelectedNodeIds(newNodes.map((n) => n.id));
  };

  // Update Connector Props
  const handleUpdateConnector = (id: string, updates: Partial<Connector>) => {
    const updatedConnectors = project.connectors.map((c) =>
      c.id === id ? { ...c, ...updates } : c
    );
    onUpdateProject({ connectors: updatedConnectors });
  };

  // Delete Connector Line
  const handleDeleteConnector = (id: string) => {
    const updatedConnectors = project.connectors.filter((c) => c.id !== id);
    onUpdateProject({ connectors: updatedConnectors });
    setSelectedConnectorId(null);
  };

  // Reply to thread
  const handleAddComment = (nodeId: string) => {
    if (!replyInput.trim()) return;
    const newComment: CommentItem = {
      id: 'comm-' + Date.now(),
      nodeId,
      author: 'You',
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      text: replyInput.trim(),
    };
    onUpdateProject({ comments: [...project.comments, newComment] });
    setReplyInput('');
  };

  // Calculate node center point
  const getNodeCenter = (node: CanvasNode): Point => {
    const w = node.width || 180;
    const h = node.height || 80;
    return { x: node.x + w / 2, y: node.y + h / 2 };
  };

  // Selected Node for style panel
  const primarySelectedNode = project.nodes.find(
    (n) => n.id === selectedNodeIds[0]
  );

  // Selected Connector for editing
  const primarySelectedConnector = project.connectors.find(
    (c) => c.id === selectedConnectorId
  );

  return (
    <div
      ref={containerRef}
      id="board-canvas"
      onMouseDown={handleCanvasMouseDown}
      onMouseMove={handleCanvasMouseMove}
      onMouseUp={handleCanvasMouseUp}
      onMouseLeave={handleCanvasMouseUp}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      className={`absolute inset-0 touch-none ${
        gridStyle === 'line' ? 'canvas-bg-lines' : gridStyle === 'blank' ? 'canvas-bg-blank' : 'canvas-bg'
      } z-0 overflow-hidden select-none pt-16 ${
        activeTool === 'pan' || isSpacePressed
          ? 'cursor-grab active:cursor-grabbing'
          : activeTool === 'draw' || activeTool === 'shape-draw'
          ? 'cursor-crosshair'
          : activeTool === 'connect'
          ? 'cursor-cell'
          : 'cursor-default'
      }`}
    >
      {/* Infinite Pannable & Scalable Canvas Layer */}
      <div
        id="canvas-container"
        className="absolute inset-0 origin-top-left transition-transform duration-75"
        style={{
          transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
        }}
      >
        {/* SVG Layer for Connectors, Arrow Markers, Drawings, and Live Line Preview */}
        <svg className="absolute inset-0 w-[100000px] h-[100000px] pointer-events-none z-10 overflow-visible">
          <defs>
            {/* Standard Arrow Marker */}
            <marker
              id="arrowhead-blue"
              viewBox="0 0 10 10"
              refX="8"
              refY="5"
              markerWidth="7"
              markerHeight="7"
              orient="auto-start-reverse"
            >
              <path d="M 0 0 L 10 5 L 0 10 z" fill="#004ac6" />
            </marker>
            <marker
              id="arrowhead-green"
              viewBox="0 0 10 10"
              refX="8"
              refY="5"
              markerWidth="7"
              markerHeight="7"
              orient="auto-start-reverse"
            >
              <path d="M 0 0 L 10 5 L 0 10 z" fill="#15803d" />
            </marker>
            <marker
              id="arrowhead-amber"
              viewBox="0 0 10 10"
              refX="8"
              refY="5"
              markerWidth="7"
              markerHeight="7"
              orient="auto-start-reverse"
            >
              <path d="M 0 0 L 10 5 L 0 10 z" fill="#d97706" />
            </marker>
          </defs>

          {/* Render All Project Connectors */}
          {project.connectors.map((conn) => {
            const fromNode = project.nodes.find((n) => n.id === conn.fromId);
            const toNode = project.nodes.find((n) => n.id === conn.toId);
            if (!fromNode || !toNode) return null;

            const fromPt = getNodeCenter(fromNode);
            const toPt = getNodeCenter(toNode);

            const dx = (toPt.x - fromPt.x) / 2;
            const pathD = `M ${fromPt.x} ${fromPt.y} C ${fromPt.x + dx} ${fromPt.y}, ${toPt.x - dx} ${toPt.y}, ${toPt.x} ${toPt.y}`;

            const isSelected = selectedConnectorId === conn.id;

            return (
              <g key={conn.id} className="pointer-events-auto cursor-pointer">
                {/* Thick clickable hit area */}
                <path
                  d={pathD}
                  fill="none"
                  stroke="transparent"
                  strokeWidth="16"
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedConnectorId(conn.id);
                    setSelectedNodeIds([]);
                  }}
                />

                {/* Visible Line */}
                <path
                  d={pathD}
                  fill="none"
                  stroke={conn.color || '#004ac6'}
                  strokeWidth={isSelected ? '4' : '3'}
                  markerEnd="url(#arrowhead-blue)"
                  strokeDasharray={conn.style === 'dashed' ? '6 6' : undefined}
                  className={conn.style === 'active' ? 'connector-active' : ''}
                />

                {/* Connector Selection Ring */}
                {isSelected && (
                  <path
                    d={pathD}
                    fill="none"
                    stroke="#2563eb"
                    strokeWidth="6"
                    strokeOpacity="0.4"
                  />
                )}

                {/* Connector Label */}
                {conn.label && (
                  <g
                    transform={`translate(${(fromPt.x + toPt.x) / 2}, ${(fromPt.y + toPt.y) / 2})`}
                    onClick={(e) => {
                      e.stopPropagation();
                      const newLabel = prompt('Edit line label:', conn.label);
                      if (newLabel !== null) {
                        handleUpdateConnector(conn.id, { label: newLabel });
                      }
                    }}
                  >
                    <rect
                      x="-40"
                      y="-12"
                      width="80"
                      height="22"
                      rx="6"
                      fill="#ffffff"
                      stroke="#c3c6d7"
                      strokeWidth="1"
                    />
                    <text
                      x="0"
                      y="3"
                      fill="#191c1e"
                      fontSize="11"
                      fontWeight="700"
                      textAnchor="middle"
                    >
                      {conn.label}
                    </text>
                  </g>
                )}
              </g>
            );
          })}

          {/* Active Rubber-Band Connecting Line Preview */}
          {connectingFromId && (
            (() => {
              const fromNode = project.nodes.find((n) => n.id === connectingFromId);
              if (!fromNode) return null;
              const fromPt = getNodeCenter(fromNode);
              const dx = (mouseCanvasPos.x - fromPt.x) / 2;
              const pathD = `M ${fromPt.x} ${fromPt.y} C ${fromPt.x + dx} ${fromPt.y}, ${mouseCanvasPos.x - dx} ${mouseCanvasPos.y}, ${mouseCanvasPos.x} ${mouseCanvasPos.y}`;

              return (
                <g>
                  <path
                    d={pathD}
                    fill="none"
                    stroke="#2563eb"
                    strokeWidth="3"
                    strokeDasharray="4 4"
                    markerEnd="url(#arrowhead-blue)"
                    className="animate-pulse"
                  />
                  <circle
                    cx={mouseCanvasPos.x}
                    cy={mouseCanvasPos.y}
                    r="6"
                    fill="#2563eb"
                  />
                </g>
              );
            })()
          )}

          {/* Freehand Stroke Preview */}
          {isDrawing && currentPathPoints.length > 1 && (
            <path
              d={`M ${currentPathPoints.map((p) => `${p.x} ${p.y}`).join(' L ')}`}
              fill="none"
              stroke={penColor}
              strokeWidth={penWidth}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          )}

          {/* Drag-to-Draw Shape Preview */}
          {isDrawingShape && shapeDrawStart && shapeDrawCurrent && (
            <rect
              x={Math.min(shapeDrawStart.x, shapeDrawCurrent.x)}
              y={Math.min(shapeDrawStart.y, shapeDrawCurrent.y)}
              width={Math.abs(shapeDrawCurrent.x - shapeDrawStart.x)}
              height={Math.abs(shapeDrawCurrent.y - shapeDrawStart.y)}
              fill="rgba(37, 99, 235, 0.08)"
              stroke="#004ac6"
              strokeWidth="2"
              strokeDasharray="4 4"
            />
          )}

          {/* Drag Box Selection Area Preview */}
          {isBoxSelecting && selectionBoxStart && selectionBoxCurrent && (
            <rect
              x={Math.min(selectionBoxStart.x, selectionBoxCurrent.x)}
              y={Math.min(selectionBoxStart.y, selectionBoxCurrent.y)}
              width={Math.abs(selectionBoxCurrent.x - selectionBoxStart.x)}
              height={Math.abs(selectionBoxCurrent.y - selectionBoxStart.y)}
              fill="rgba(224, 242, 254, 0.4)"
              stroke="#0284c7"
              strokeWidth="1.5"
            />
          )}
        </svg>

        {/* Render Canvas Nodes */}
        {project.nodes.map((node) => {
          const isSelected = selectedNodeIds.includes(node.id);
          const isConnectingFrom = connectingFromId === node.id;

          // Freehand path node rendering
          if (node.type === 'path' && node.points) {
            const isRelative = node.points.some(
              (p) => p.x <= (node.width || 1000) + 20 && p.y <= (node.height || 1000) + 20
            );
            const pathPoints = isRelative
              ? node.points
              : node.points.map((p) => ({ x: p.x - node.x, y: p.y - node.y }));

            const w = Math.max(node.width || 20, 20);
            const h = Math.max(node.height || 20, 20);

            return (
              <div
                key={node.id}
                onMouseDown={(e) => handleNodeMouseDown(e, node)}
                style={{
                  left: `${node.x}px`,
                  top: `${node.y}px`,
                  width: `${w}px`,
                  height: `${h}px`,
                  opacity: node.opacity !== undefined ? node.opacity / 100 : 1,
                }}
                className={`absolute cursor-pointer group z-20 ${
                  isSelected ? 'ring-2 ring-[#004ac6] ring-offset-2 rounded-lg' : ''
                }`}
              >
                <svg
                  className="w-full h-full overflow-visible pointer-events-auto"
                  viewBox={`0 0 ${w} ${h}`}
                >
                  <path
                    d={`M ${pathPoints.map((p) => `${p.x} ${p.y}`).join(' L ')}`}
                    fill="none"
                    stroke={node.strokeColor || '#004ac6'}
                    strokeWidth={node.strokeWidth || 4}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </div>
            );
          }

          // Render Shape Nodes with distinct vector geometries and rich components
          const { w, h, titleFontPx, subFontPx } = computeNodeBounds(node);
          const fillColor = node.color || '#ffffff';
          const strokeColor = node.borderColor || '#004ac6';
          const strokeWidth = node.strokeWidth !== undefined ? node.strokeWidth : 2;

          switch (node.type) {
            case 'database':
              return (
                <div
                  key={node.id}
                  onMouseDown={(e) => handleNodeMouseDown(e, node)}
                  onTouchStart={(e) => handleNodeTouchStart(e, node)}
                  style={{
                    left: `${node.x}px`,
                    top: `${node.y}px`,
                    width: `${w}px`,
                    height: `${h}px`,
                    opacity: node.opacity !== undefined ? node.opacity / 100 : 1,
                  }}
                  className={`absolute cursor-pointer transition-shadow duration-150 z-20 group flex flex-col justify-center items-center text-center p-3 ${
                    isSelected ? 'ring-2 ring-[#004ac6] ring-offset-2 rounded-xl shadow-xl' : ''
                  } ${isConnectingFrom ? 'ring-2 ring-emerald-500 animate-pulse' : ''}`}
                >
                  <svg className="absolute inset-0 w-full h-full pointer-events-none overflow-visible z-0 drop-shadow-sm">
                    <ellipse
                      cx={w / 2}
                      cy={h * 0.22}
                      rx={w / 2 - 2}
                      ry={h * 0.18}
                      fill={fillColor === 'transparent' ? '#ffffff' : fillColor}
                      stroke={strokeColor}
                      strokeWidth={strokeWidth}
                    />
                    <path
                      d={`M 2,${h * 0.22} L 2,${h * 0.78} A ${w / 2 - 2},${h * 0.18} 0 0,0 ${w - 2},${h * 0.78} L ${w - 2},${h * 0.22}`}
                      fill={fillColor === 'transparent' ? '#ffffff' : fillColor}
                      stroke={strokeColor}
                      strokeWidth={strokeWidth}
                    />
                    <path
                      d={`M 2,${h * 0.42} A ${w / 2 - 2},${h * 0.15} 0 0,0 ${w - 2},${h * 0.42}`}
                      fill="none"
                      stroke={strokeColor}
                      strokeWidth={1.5}
                    />
                    <path
                      d={`M 2,${h * 0.6} A ${w / 2 - 2},${h * 0.15} 0 0,0 ${w - 2},${h * 0.6}`}
                      fill="none"
                      stroke={strokeColor}
                      strokeWidth={1.5}
                    />
                  </svg>
                  <div className="relative z-10 flex flex-col items-center justify-center px-2 py-1 max-w-[80%] text-center">
                    <span className="material-symbols-outlined text-xl mb-0.5 text-[#004ac6]">
                      database
                    </span>
                    <div
                      style={{
                        fontSize: `${titleFontPx}px`,
                        fontWeight: node.fontWeight || 'bold',
                        lineHeight: 1.2,
                        color: isDarkColor(fillColor) ? '#ffffff' : '#191c1e',
                      }}
                      className="break-words w-full text-center font-bold"
                    >
                      {node.title}
                    </div>
                    {node.subtitle && (
                      <div
                        style={{ fontSize: `${subFontPx}px` }}
                        className={`opacity-80 break-words w-full text-center mt-0.5 ${isDarkColor(fillColor) ? 'text-slate-200' : 'text-slate-600'}`}
                      >
                        {node.subtitle}
                      </div>
                    )}
                  </div>
                  <button
                    onClick={(e) => handleStartConnection(e, node.id)}
                    className="absolute -right-3 top-1/2 -translate-y-1/2 w-6 h-6 bg-[#004ac6] hover:bg-[#2563eb] text-white rounded-full flex items-center justify-center shadow-md hover:scale-125 transition-transform z-30"
                    title="Click to draw connecting line"
                  >
                    <span className="material-symbols-outlined text-xs">add</span>
                  </button>
                </div>
              );

            case 'diamond':
              return (
                <div
                  key={node.id}
                  onMouseDown={(e) => handleNodeMouseDown(e, node)}
                  onTouchStart={(e) => handleNodeTouchStart(e, node)}
                  style={{
                    left: `${node.x}px`,
                    top: `${node.y}px`,
                    width: `${w}px`,
                    height: `${h}px`,
                    opacity: node.opacity !== undefined ? node.opacity / 100 : 1,
                  }}
                  className={`absolute cursor-pointer transition-shadow duration-150 z-20 group flex flex-col justify-center items-center text-center p-3 ${
                    isSelected ? 'ring-2 ring-[#004ac6] ring-offset-2 rounded-xl shadow-xl' : ''
                  } ${isConnectingFrom ? 'ring-2 ring-emerald-500 animate-pulse' : ''}`}
                >
                  <svg className="absolute inset-0 w-full h-full pointer-events-none overflow-visible z-0 drop-shadow-sm">
                    <polygon
                      points={`${w / 2},2 ${w - 2},${h / 2} ${w / 2},${h - 2} 2,${h / 2}`}
                      fill={fillColor === 'transparent' ? '#ffdbcd' : fillColor}
                      stroke={strokeColor || '#943700'}
                      strokeWidth={strokeWidth}
                      strokeDasharray={node.strokeStyle === 'dashed' ? '4 4' : undefined}
                    />
                  </svg>
                  <div className="relative z-10 flex flex-col items-center justify-center p-1 max-w-[52%] max-h-[60%] overflow-hidden text-center">
                    <div
                      style={{
                        fontSize: `${titleFontPx}px`,
                        fontWeight: node.fontWeight || 'bold',
                        lineHeight: 1.2,
                        color: isDarkColor(fillColor) ? '#ffffff' : '#191c1e',
                      }}
                      className="break-words w-full text-center font-bold"
                    >
                      {node.title}
                    </div>
                    {node.subtitle && (
                      <div
                        style={{ fontSize: `${subFontPx}px` }}
                        className={`opacity-80 break-words w-full text-center mt-0.5 ${isDarkColor(fillColor) ? 'text-slate-200' : 'text-slate-700'}`}
                      >
                        {node.subtitle}
                      </div>
                    )}
                  </div>
                  <button
                    onClick={(e) => handleStartConnection(e, node.id)}
                    className="absolute -right-3 top-1/2 -translate-y-1/2 w-6 h-6 bg-[#004ac6] hover:bg-[#2563eb] text-white rounded-full flex items-center justify-center shadow-md hover:scale-125 transition-transform z-30"
                    title="Click to draw connecting line"
                  >
                    <span className="material-symbols-outlined text-xs">add</span>
                  </button>
                </div>
              );

            case 'triangle':
              return (
                <div
                  key={node.id}
                  onMouseDown={(e) => handleNodeMouseDown(e, node)}
                  onTouchStart={(e) => handleNodeTouchStart(e, node)}
                  style={{
                    left: `${node.x}px`,
                    top: `${node.y}px`,
                    width: `${w}px`,
                    height: `${h}px`,
                    opacity: node.opacity !== undefined ? node.opacity / 100 : 1,
                  }}
                  className={`absolute cursor-pointer transition-shadow duration-150 z-20 group flex flex-col justify-end items-center text-center p-3 pb-4 ${
                    isSelected ? 'ring-2 ring-[#004ac6] ring-offset-2 rounded-xl shadow-xl' : ''
                  } ${isConnectingFrom ? 'ring-2 ring-emerald-500 animate-pulse' : ''}`}
                >
                  <svg className="absolute inset-0 w-full h-full pointer-events-none overflow-visible z-0 drop-shadow-sm">
                    <polygon
                      points={`${w / 2},2 ${w - 2},${h - 2} 2,${h - 2}`}
                      fill={fillColor}
                      stroke={strokeColor}
                      strokeWidth={strokeWidth}
                      strokeDasharray={node.strokeStyle === 'dashed' ? '4 4' : undefined}
                    />
                  </svg>
                  <div className="relative z-10 flex flex-col items-center justify-center max-w-[55%] mb-1 text-center">
                    <div
                      style={{
                        fontSize: `${titleFontPx}px`,
                        fontWeight: node.fontWeight || 'bold',
                        lineHeight: 1.2,
                        color: isDarkColor(fillColor) ? '#ffffff' : '#191c1e',
                      }}
                      className="break-words w-full text-center font-bold"
                    >
                      {node.title}
                    </div>
                    {node.subtitle && (
                      <div
                        style={{ fontSize: `${subFontPx}px` }}
                        className={`opacity-80 break-words w-full text-center mt-0.5 ${isDarkColor(fillColor) ? 'text-slate-200' : 'text-slate-600'}`}
                      >
                        {node.subtitle}
                      </div>
                    )}
                  </div>
                  <button
                    onClick={(e) => handleStartConnection(e, node.id)}
                    className="absolute -right-3 top-1/2 -translate-y-1/2 w-6 h-6 bg-[#004ac6] hover:bg-[#2563eb] text-white rounded-full flex items-center justify-center shadow-md hover:scale-125 transition-transform z-30"
                    title="Click to draw connecting line"
                  >
                    <span className="material-symbols-outlined text-xs">add</span>
                  </button>
                </div>
              );

            case 'star':
              return (
                <div
                  key={node.id}
                  onMouseDown={(e) => handleNodeMouseDown(e, node)}
                  onTouchStart={(e) => handleNodeTouchStart(e, node)}
                  style={{
                    left: `${node.x}px`,
                    top: `${node.y}px`,
                    width: `${w}px`,
                    height: `${h}px`,
                    opacity: node.opacity !== undefined ? node.opacity / 100 : 1,
                  }}
                  className={`absolute cursor-pointer transition-shadow duration-150 z-20 group flex flex-col justify-center items-center text-center p-3 ${
                    isSelected ? 'ring-2 ring-[#004ac6] ring-offset-2 rounded-xl shadow-xl' : ''
                  } ${isConnectingFrom ? 'ring-2 ring-emerald-500 animate-pulse' : ''}`}
                >
                  <svg className="absolute inset-0 w-full h-full pointer-events-none overflow-visible z-0 drop-shadow-sm">
                    <polygon
                      points={`${w * 0.5},2 ${w * 0.62},${h * 0.35} ${w - 2},${h * 0.38} ${w * 0.72},${h * 0.62} ${w * 0.81},${h - 2} ${w * 0.5},${h * 0.8} ${w * 0.19},${h - 2} ${w * 0.28},${h * 0.62} 2,${h * 0.38} ${w * 0.38},${h * 0.35}`}
                      fill={fillColor === 'transparent' ? '#fef3c7' : fillColor}
                      stroke={strokeColor || '#d97706'}
                      strokeWidth={strokeWidth}
                    />
                  </svg>
                  <div className="relative z-10 flex flex-col items-center justify-center max-w-[45%] max-h-[50%] overflow-hidden text-center">
                    <div
                      style={{
                        fontSize: `${titleFontPx}px`,
                        fontWeight: node.fontWeight || 'bold',
                        lineHeight: 1.2,
                        color: '#78350f',
                      }}
                      className="break-words w-full text-center font-bold"
                    >
                      {node.title}
                    </div>
                    {node.subtitle && (
                      <div
                        style={{ fontSize: `${subFontPx}px` }}
                        className="opacity-80 break-words w-full text-center text-amber-900 mt-0.5"
                      >
                        {node.subtitle}
                      </div>
                    )}
                  </div>
                  <button
                    onClick={(e) => handleStartConnection(e, node.id)}
                    className="absolute -right-3 top-1/2 -translate-y-1/2 w-6 h-6 bg-[#004ac6] hover:bg-[#2563eb] text-white rounded-full flex items-center justify-center shadow-md hover:scale-125 transition-transform z-30"
                    title="Click to draw connecting line"
                  >
                    <span className="material-symbols-outlined text-xs">add</span>
                  </button>
                </div>
              );

            case 'cloud':
              return (
                <div
                  key={node.id}
                  onMouseDown={(e) => handleNodeMouseDown(e, node)}
                  onTouchStart={(e) => handleNodeTouchStart(e, node)}
                  style={{
                    left: `${node.x}px`,
                    top: `${node.y}px`,
                    width: `${w}px`,
                    height: `${h}px`,
                    opacity: node.opacity !== undefined ? node.opacity / 100 : 1,
                  }}
                  className={`absolute cursor-pointer transition-shadow duration-150 z-20 group flex flex-col justify-center items-center text-center p-3 ${
                    isSelected ? 'ring-2 ring-[#004ac6] ring-offset-2 rounded-2xl shadow-xl' : ''
                  } ${isConnectingFrom ? 'ring-2 ring-emerald-500 animate-pulse' : ''}`}
                >
                  <svg className="absolute inset-0 w-full h-full pointer-events-none overflow-visible z-0 drop-shadow-sm">
                    <path
                      d={`M ${w * 0.2},${h * 0.75}
                         C ${w * 0.05},${h * 0.75} ${w * 0.05},${h * 0.45} ${w * 0.25},${h * 0.45}
                         C ${w * 0.25},${h * 0.2} ${w * 0.55},${h * 0.15} ${w * 0.65},${h * 0.35}
                         C ${w * 0.82},${h * 0.25} ${w * 0.98},${h * 0.5} ${w * 0.85},${h * 0.75}
                         C ${w * 0.98},${h * 0.92} ${w * 0.75},${h * 0.98} ${w * 0.65},${h * 0.92}
                         C ${w * 0.5},${h * 0.98} ${w * 0.3},${h * 0.95} ${w * 0.2},${h * 0.75} Z`}
                      fill={fillColor === 'transparent' ? '#e0f2fe' : fillColor}
                      stroke={strokeColor || '#0284c7'}
                      strokeWidth={strokeWidth}
                    />
                  </svg>
                  <div className="relative z-10 flex flex-col items-center justify-center px-3 py-1 max-w-[65%] text-center">
                    <span className="material-symbols-outlined text-lg mb-0.5 text-sky-600">
                      cloud_queue
                    </span>
                    <div
                      style={{
                        fontSize: `${titleFontPx}px`,
                        fontWeight: node.fontWeight || 'bold',
                        lineHeight: 1.2,
                        color: isDarkColor(fillColor) ? '#ffffff' : '#0369a1',
                      }}
                      className="break-words w-full text-center font-bold"
                    >
                      {node.title}
                    </div>
                    {node.subtitle && (
                      <div style={{ fontSize: `${subFontPx}px` }} className={`opacity-80 break-words w-full text-center mt-0.5 ${isDarkColor(fillColor) ? 'text-sky-100' : 'text-sky-800'}`}>
                        {node.subtitle}
                      </div>
                    )}
                  </div>
                  <button
                    onClick={(e) => handleStartConnection(e, node.id)}
                    className="absolute -right-3 top-1/2 -translate-y-1/2 w-6 h-6 bg-[#004ac6] hover:bg-[#2563eb] text-white rounded-full flex items-center justify-center shadow-md hover:scale-125 transition-transform z-30"
                    title="Click to draw connecting line"
                  >
                    <span className="material-symbols-outlined text-xs">add</span>
                  </button>
                </div>
              );

            case 'table': {
              const columns = node.columns && node.columns.length > 0 ? node.columns : [
                { name: 'id', type: 'UUID', isPk: true },
                { name: 'username', type: 'VARCHAR(100)' },
                { name: 'email', type: 'VARCHAR(255)' },
                { name: 'created_at', type: 'TIMESTAMP' },
              ];

              return (
                <div
                  key={node.id}
                  onMouseDown={(e) => handleNodeMouseDown(e, node)}
                  onTouchStart={(e) => handleNodeTouchStart(e, node)}
                  style={{
                    left: `${node.x}px`,
                    top: `${node.y}px`,
                    width: `${w}px`,
                    minHeight: `${h}px`,
                    opacity: node.opacity !== undefined ? node.opacity / 100 : 1,
                  }}
                  className={`absolute cursor-pointer transition-shadow duration-150 z-20 group rounded-xl overflow-hidden bg-white border-2 border-[#004ac6] shadow-md ${
                    isSelected ? 'ring-2 ring-[#004ac6] ring-offset-2 shadow-xl' : ''
                  } ${isConnectingFrom ? 'ring-2 ring-emerald-500 animate-pulse' : ''}`}
                >
                  <div className="bg-[#004ac6] text-white px-3 py-2 flex items-center justify-between gap-1.5 font-bold text-xs select-none">
                    <div className="flex items-center gap-1.5 truncate">
                      <span className="material-symbols-outlined text-sm text-blue-200">table_chart</span>
                      <span className="truncate">{node.title}</span>
                    </div>
                    <span className="bg-white/20 text-[10px] px-1.5 py-0.5 rounded text-white font-mono uppercase tracking-wider">
                      TABLE
                    </span>
                  </div>

                  <div className="p-2 flex flex-col gap-1 overflow-y-auto max-h-[220px] bg-slate-50/90">
                    {columns.map((col, idx) => (
                      <div key={idx} className="flex items-center justify-between text-[11px] font-mono px-2 py-1 bg-white rounded border border-slate-200 shadow-2xs">
                        <div className="flex items-center gap-1.5 truncate">
                          {col.isPk ? (
                            <span className="material-symbols-outlined text-amber-500 text-xs" title="Primary Key">key</span>
                          ) : (
                            <span className="w-1.5 h-1.5 rounded-full bg-blue-400"></span>
                          )}
                          <span className={`truncate font-semibold ${col.isPk ? 'text-amber-900' : 'text-slate-800'}`}>
                            {col.name}
                          </span>
                        </div>
                        <span className="text-[10px] text-slate-500 bg-slate-100 px-1 rounded border border-slate-200">
                          {col.type}
                        </span>
                      </div>
                    ))}
                  </div>

                  <button
                    onClick={(e) => handleStartConnection(e, node.id)}
                    className="absolute -right-3 top-1/2 -translate-y-1/2 w-6 h-6 bg-[#004ac6] hover:bg-[#2563eb] text-white rounded-full flex items-center justify-center shadow-md hover:scale-125 transition-transform z-30"
                    title="Click to draw connecting line"
                  >
                    <span className="material-symbols-outlined text-xs">add</span>
                  </button>
                </div>
              );
            }

            case 'api-gateway':
              return (
                <div
                  key={node.id}
                  onMouseDown={(e) => handleNodeMouseDown(e, node)}
                  onTouchStart={(e) => handleNodeTouchStart(e, node)}
                  style={{
                    left: `${node.x}px`,
                    top: `${node.y}px`,
                    width: `${w}px`,
                    minHeight: `${h}px`,
                    backgroundColor: fillColor,
                    borderColor: strokeColor,
                    borderWidth: `${strokeWidth}px`,
                    opacity: node.opacity !== undefined ? node.opacity / 100 : 1,
                  }}
                  className={`absolute cursor-pointer transition-shadow duration-150 z-20 group rounded-xl overflow-hidden bg-white shadow-md p-3 flex flex-col justify-between ${
                    isSelected ? 'ring-2 ring-[#004ac6] ring-offset-2 shadow-xl' : ''
                  } ${isConnectingFrom ? 'ring-2 ring-emerald-500 animate-pulse' : ''}`}
                >
                  <div className="flex items-center gap-2 border-b border-blue-100 pb-2 mb-1">
                    <div className="w-7 h-7 rounded-lg bg-blue-600 text-white flex items-center justify-center shadow-xs">
                      <span className="material-symbols-outlined text-base">router</span>
                    </div>
                    <div className="flex-1 truncate">
                      <div className="text-xs font-bold text-slate-900 leading-tight truncate">{node.title}</div>
                      <div className="text-[10px] text-blue-600 font-semibold truncate">{node.subtitle || 'API Gateway'}</div>
                    </div>
                  </div>
                  <div className="flex items-center justify-between text-[10px] text-slate-600 bg-blue-50/80 rounded px-2 py-1 font-mono">
                    <span className="font-bold text-blue-700">REST / gRPC</span>
                    <span>:8080</span>
                  </div>

                  <button
                    onClick={(e) => handleStartConnection(e, node.id)}
                    className="absolute -right-3 top-1/2 -translate-y-1/2 w-6 h-6 bg-[#004ac6] hover:bg-[#2563eb] text-white rounded-full flex items-center justify-center shadow-md hover:scale-125 transition-transform z-30"
                    title="Click to draw connecting line"
                  >
                    <span className="material-symbols-outlined text-xs">add</span>
                  </button>
                </div>
              );

            case 'credentials':
              return (
                <div
                  key={node.id}
                  onMouseDown={(e) => handleNodeMouseDown(e, node)}
                  onTouchStart={(e) => handleNodeTouchStart(e, node)}
                  style={{
                    left: `${node.x}px`,
                    top: `${node.y}px`,
                    width: `${w}px`,
                    minHeight: `${h}px`,
                    backgroundColor: fillColor,
                    borderColor: strokeColor || '#2563eb',
                    borderWidth: `${strokeWidth}px`,
                    opacity: node.opacity !== undefined ? node.opacity / 100 : 1,
                  }}
                  className={`absolute cursor-pointer transition-shadow duration-150 z-20 group rounded-xl overflow-hidden bg-white shadow-md p-3 flex flex-col justify-between ${
                    isSelected ? 'ring-2 ring-[#004ac6] ring-offset-2 shadow-xl' : ''
                  } ${isConnectingFrom ? 'ring-2 ring-emerald-500 animate-pulse' : ''}`}
                >
                  <div className="flex items-center gap-2 border-b border-emerald-100 pb-2 mb-1">
                    <div className="w-7 h-7 rounded-lg bg-emerald-600 text-white flex items-center justify-center shadow-xs">
                      <span className="material-symbols-outlined text-base">key</span>
                    </div>
                    <div className="flex-1 truncate">
                      <div className="text-xs font-bold text-slate-900 leading-tight truncate">{node.title}</div>
                      <div className="text-[10px] text-emerald-600 font-semibold truncate">{node.subtitle || 'Auth Credentials'}</div>
                    </div>
                  </div>
                  <div className="flex flex-col gap-1 text-[10px] font-mono text-slate-600 bg-emerald-50/80 p-1.5 rounded">
                    <div className="flex justify-between"><span>Auth Type:</span><span className="font-bold text-emerald-800">OAuth2 / JWT</span></div>
                  </div>

                  <button
                    onClick={(e) => handleStartConnection(e, node.id)}
                    className="absolute -right-3 top-1/2 -translate-y-1/2 w-6 h-6 bg-[#004ac6] hover:bg-[#2563eb] text-white rounded-full flex items-center justify-center shadow-md hover:scale-125 transition-transform z-30"
                    title="Click to draw connecting line"
                  >
                    <span className="material-symbols-outlined text-xs">add</span>
                  </button>
                </div>
              );

            case 'sticky':
              return (
                <div
                  key={node.id}
                  onMouseDown={(e) => handleNodeMouseDown(e, node)}
                  onTouchStart={(e) => handleNodeTouchStart(e, node)}
                  style={{
                    left: `${node.x}px`,
                    top: `${node.y}px`,
                    width: `${w}px`,
                    minHeight: `${h}px`,
                    backgroundColor: fillColor || '#ffdbcd',
                    borderColor: strokeColor || '#943700',
                    borderWidth: `${strokeWidth}px`,
                    opacity: node.opacity !== undefined ? node.opacity / 100 : 1,
                  }}
                  className={`absolute cursor-pointer transition-shadow duration-150 z-20 group rounded-xl p-3 shadow-md relative overflow-hidden flex flex-col justify-between ${
                    isSelected ? 'ring-2 ring-[#004ac6] ring-offset-2 shadow-xl' : ''
                  } ${isConnectingFrom ? 'ring-2 ring-emerald-500 animate-pulse' : ''}`}
                >
                  <div className="absolute top-0 right-0 w-5 h-5 bg-black/10 border-b border-l border-black/20 rounded-bl-md pointer-events-none"></div>

                  <div>
                    <div style={{ fontSize: `${titleFontPx}px` }} className="font-bold text-amber-950 leading-snug break-words">{node.title}</div>
                    {node.subtitle && <div style={{ fontSize: `${subFontPx}px` }} className="text-amber-900/80 mt-1 break-words">{node.subtitle}</div>}
                  </div>

                  <button
                    onClick={(e) => handleStartConnection(e, node.id)}
                    className="absolute -right-3 top-1/2 -translate-y-1/2 w-6 h-6 bg-[#004ac6] hover:bg-[#2563eb] text-white rounded-full flex items-center justify-center shadow-md hover:scale-125 transition-transform z-30"
                    title="Click to draw connecting line"
                  >
                    <span className="material-symbols-outlined text-xs">add</span>
                  </button>
                </div>
              );

            case 'circle':
            case 'oval':
              return (
                <div
                  key={node.id}
                  onMouseDown={(e) => handleNodeMouseDown(e, node)}
                  onTouchStart={(e) => handleNodeTouchStart(e, node)}
                  style={{
                    left: `${node.x}px`,
                    top: `${node.y}px`,
                    width: `${w}px`,
                    height: `${h}px`,
                    backgroundColor: fillColor,
                    borderColor: strokeColor,
                    borderWidth: `${strokeWidth}px`,
                    borderStyle: node.strokeStyle || 'solid',
                    opacity: node.opacity !== undefined ? node.opacity / 100 : 1,
                  }}
                  className={`absolute cursor-pointer transition-shadow duration-150 z-20 group rounded-full flex flex-col items-center justify-center p-3 text-center shadow-sm ${
                    isSelected ? 'ring-2 ring-[#004ac6] ring-offset-2 shadow-xl' : ''
                  } ${isConnectingFrom ? 'ring-2 ring-emerald-500 animate-pulse' : ''}`}
                >
                  <div className="relative z-10 flex flex-col items-center justify-center max-w-[72%] max-h-[75%] px-2 text-center">
                    <div style={{ fontSize: `${titleFontPx}px`, color: isDarkColor(fillColor) ? '#ffffff' : '#0f172a' }} className="font-bold leading-tight break-words w-full text-center">{node.title}</div>
                    {node.subtitle && <div style={{ fontSize: `${subFontPx}px`, color: isDarkColor(fillColor) ? '#e2e8f0' : '#475569' }} className="mt-0.5 break-words w-full opacity-80 text-center">{node.subtitle}</div>}
                  </div>

                  <button
                    onClick={(e) => handleStartConnection(e, node.id)}
                    className="absolute -right-3 top-1/2 -translate-y-1/2 w-6 h-6 bg-[#004ac6] hover:bg-[#2563eb] text-white rounded-full flex items-center justify-center shadow-md hover:scale-125 transition-transform z-30"
                    title="Click to draw connecting line"
                  >
                    <span className="material-symbols-outlined text-xs">add</span>
                  </button>
                </div>
              );

            default: {
              const isTextNode = node.type === 'text';
              return (
                <div
                  key={node.id}
                  onMouseDown={(e) => handleNodeMouseDown(e, node)}
                  onTouchStart={(e) => handleNodeTouchStart(e, node)}
                  style={{
                    left: `${node.x}px`,
                    top: `${node.y}px`,
                    width: isTextNode ? (node.width ? `${node.width}px` : 'auto') : `${w}px`,
                    minHeight: isTextNode ? (node.height ? `${node.height}px` : 'auto') : `${h}px`,
                    backgroundColor: fillColor || (isTextNode ? 'transparent' : '#ffffff'),
                    borderColor: strokeColor || (isTextNode ? 'transparent' : '#004ac6'),
                    borderWidth: `${strokeWidth !== undefined ? strokeWidth : isTextNode ? 0 : 2}px`,
                    borderStyle: node.strokeStyle || 'solid',
                    opacity: node.opacity !== undefined ? node.opacity / 100 : 1,
                  }}
                  className={`absolute cursor-pointer transition-shadow duration-150 z-20 ${
                    isTextNode ? 'p-2' : 'p-4 shadow-sm hover:shadow-md'
                  } flex flex-col justify-center rounded-xl group ${
                    isSelected
                      ? isTextNode
                        ? 'ring-2 ring-[#004ac6] border-dashed ring-offset-2'
                        : 'ring-2 ring-[#004ac6] ring-offset-2 shadow-xl'
                      : ''
                  } ${isConnectingFrom ? 'ring-2 ring-emerald-500 animate-pulse' : ''}`}
                >
                  <div
                    className={`w-full ${
                      node.textAlign === 'center'
                        ? 'text-center'
                        : node.textAlign === 'right'
                        ? 'text-right'
                        : 'text-left'
                    }`}
                  >
                    <div
                      style={{
                        fontSize: `${titleFontPx}px`,
                        fontWeight: node.fontWeight || 'bold',
                        lineHeight: 1.25,
                        color: isDarkColor(fillColor) ? '#ffffff' : '#191c1e',
                      }}
                      className="break-words font-bold"
                    >
                      {node.title}
                    </div>
                    {node.subtitle && (
                      <div
                        className="mt-0.5 opacity-80 break-words"
                        style={{
                          fontSize: `${subFontPx}px`,
                          color: isDarkColor(fillColor) ? '#e2e8f0' : '#434655',
                        }}
                      >
                        {node.subtitle}
                      </div>
                    )}
                  </div>

                  <button
                    onClick={(e) => handleStartConnection(e, node.id)}
                    className="absolute -right-3 top-1/2 -translate-y-1/2 w-6 h-6 bg-[#004ac6] hover:bg-[#2563eb] text-white rounded-full flex items-center justify-center shadow-md hover:scale-125 transition-transform z-30"
                    title="Click to draw connecting line"
                  >
                    <span className="material-symbols-outlined text-xs">add</span>
                  </button>
                </div>
              );
            }
          }
        })}
      </div>

      {/* Floating Main Navigation Toolbar (Moveable) */}
      <nav
        onMouseDown={(e) => e.stopPropagation()}
        onMouseUp={(e) => e.stopPropagation()}
        onClick={(e) => e.stopPropagation()}
        style={
          toolbarPos
            ? { left: `${toolbarPos.x}px`, top: `${toolbarPos.y}px`, transform: 'none' }
            : undefined
        }
        className={`fixed left-6 top-1/2 -translate-y-1/2 z-40 flex flex-col items-center py-3 px-1.5 gap-2.5 bg-white/95 backdrop-blur-xl border border-white/80 shadow-2xl rounded-3xl w-16 glass-panel select-none transition-shadow ${
          isDraggingToolbar ? 'ring-2 ring-[#004ac6]/50 shadow-2xl scale-[1.02]' : ''
        }`}
      >
        {/* Drag Handle to move toolbar */}
        <div
          onMouseDown={handleToolbarDragStart}
          onTouchStart={handleToolbarTouchStart}
          onDoubleClick={() => setToolbarPos(null)}
          className={`w-full flex items-center justify-center py-1.5 border-b border-[#c3c6d7]/30 group select-none ${
            isDraggingToolbar ? 'cursor-grabbing text-[#004ac6]' : 'cursor-grab text-[#737686] hover:text-[#004ac6]'
          }`}
          title="Hold & Drag to move toolbar anywhere on canvas (Double-click to reset)"
        >
          <span className="material-symbols-outlined text-lg group-hover:scale-110 transition-transform">
            drag_indicator
          </span>
        </div>

        {/* Select / Pointer Tool */}
        <button
          onClick={() => setActiveTool('select')}
          className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${
            activeTool === 'select'
              ? 'bg-[#004ac6] text-white shadow-md scale-110'
              : 'text-[#565e74] hover:bg-[#dae2fd]/50'
          }`}
          title="Pointer / Select Tool (Click element or Shift+Drag box)"
        >
          <span className="material-symbols-outlined">near_me</span>
        </button>

        {/* Pan / Free Screen Hand Tool */}
        <button
          onClick={() => setActiveTool('pan')}
          className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${
            activeTool === 'pan'
              ? 'bg-[#004ac6] text-white shadow-md scale-110'
              : 'text-[#565e74] hover:bg-[#dae2fd]/50'
          }`}
          title="Pan / Move Workspace (Hold Spacebar or Drag Canvas)"
        >
          <span className="material-symbols-outlined">pan_tool</span>
        </button>

        {/* Freehand Draw Pen Tool */}
        <div className="relative">
          <button
            onClick={() => setActiveTool('draw')}
            className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${
              activeTool === 'draw'
                ? 'bg-[#004ac6] text-white shadow-md scale-110'
                : 'text-[#565e74] hover:bg-[#dae2fd]/50'
            }`}
            title="Freehand Draw / Pen Tool"
          >
            <span className="material-symbols-outlined">draw</span>
          </button>

          {/* Pencil Options Popover */}
          {activeTool === 'draw' && (
            <div className="absolute left-16 top-0 w-48 bg-white/95 backdrop-blur-2xl border border-[#c3c6d7] rounded-2xl shadow-2xl p-3 z-50 flex flex-col gap-2.5 animate-in fade-in slide-in-from-left-2 duration-150">
              <span className="text-[10px] font-bold text-[#737686] uppercase tracking-wider px-1">
                Pencil Settings
              </span>
              <div className="flex flex-col gap-1.5">
                <span className="text-[10px] font-medium text-[#434655] px-1">Color</span>
                <div className="grid grid-cols-4 gap-1.5">
                  {STROKE_COLORS.map((color) => (
                    <button
                      key={color}
                      type="button"
                      onClick={() => setPenColor(color)}
                      style={{ backgroundColor: color }}
                      className={`w-6 h-6 rounded-full border border-[#c3c6d7]/60 shadow-xs hover:scale-110 transition-transform ${
                        penColor === color ? 'ring-2 ring-[#004ac6] ring-offset-1' : ''
                      }`}
                      title={color}
                    />
                  ))}
                </div>
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-[10px] font-medium text-[#434655] px-1">Thickness</span>
                <div className="flex items-center gap-1 bg-[#f2f4f6] p-1 rounded-lg">
                  {[2, 4, 6, 10].map((width) => (
                    <button
                      key={width}
                      type="button"
                      onClick={() => setPenWidth(width)}
                      className={`flex-1 py-1 rounded text-[10px] font-bold transition-all ${
                        penWidth === width
                          ? 'bg-[#004ac6] text-white shadow-sm'
                          : 'text-[#191c1e] hover:bg-white/50'
                      }`}
                    >
                      {width}px
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Normal Shape Tool Button */}
        <button
          onClick={() => handleQuickAddShape('normal-shape')}
          className="w-10 h-10 rounded-full flex items-center justify-center transition-all text-[#565e74] hover:bg-[#dae2fd]/50 hover:text-[#004ac6]"
          title="Add Normal Shape (Box)"
        >
          <span className="material-symbols-outlined">crop_5_4</span>
        </button>

        {/* Text Tool Button */}
        <button
          onClick={() => handleQuickAddShape('text')}
          className="w-10 h-10 rounded-full flex items-center justify-center transition-all text-[#565e74] hover:bg-[#dae2fd]/50 hover:text-[#004ac6]"
          title="Add Text Element"
        >
          <span className="material-symbols-outlined">title</span>
        </button>

        {/* Shape Picker Tool */}
        <div className="relative">
          <button
            onClick={() => {
              setActiveTool('shape-draw');
              setShowShapePicker(!showShapePicker);
            }}
            className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${
              activeTool === 'shape-draw'
                ? 'bg-[#004ac6] text-white shadow-md scale-110'
                : 'text-[#565e74] hover:bg-[#dae2fd]/50'
            }`}
            title="Add Shapes Library"
          >
            <span className="material-symbols-outlined">category</span>
          </button>

          {/* Shape Library Flyout */}
          {showShapePicker && (
            <div className="absolute left-16 top-0 w-56 bg-white/95 backdrop-blur-2xl border border-[#c3c6d7] rounded-2xl shadow-2xl p-3 z-50 flex flex-col gap-2">
              <span className="text-[10px] font-bold text-[#737686] uppercase tracking-wider px-1">
                Add Shapes
              </span>
              <div className="grid grid-cols-2 gap-1.5">
                {[
                  { type: 'table', label: 'DB Table', icon: 'table_chart' },
                  { type: 'database', label: 'Database', icon: 'database' },
                  { type: 'normal-shape', label: 'Normal Shape', icon: 'crop_5_4' },
                  { type: 'text', label: 'Text Shape', icon: 'title' },
                  { type: 'rectangle', label: 'Process Box', icon: 'check_box_outline_blank' },
                  { type: 'circle', label: 'Circle State', icon: 'radio_button_unchecked' },
                  { type: 'diamond', label: 'Decision Gate', icon: 'square' },
                  { type: 'triangle', label: 'Triangle', icon: 'change_history' },
                  { type: 'star', label: 'Milestone Star', icon: 'star_outline' },
                  { type: 'cloud', label: 'Cloud Service', icon: 'cloud_queue' },
                  { type: 'sticky', label: 'Sticky Note', icon: 'sticky_note_2' },
                  { type: 'credentials', label: 'Credentials', icon: 'key' },
                  { type: 'api-gateway', label: 'API Gateway', icon: 'router' },
                ].map((s) => (
                  <button
                    key={s.type}
                    onClick={() => {
                      setSelectedShapeType(s.type as NodeType);
                      handleQuickAddShape(s.type as NodeType);
                    }}
                    className="flex items-center gap-2 p-2 rounded-xl text-xs font-bold text-[#191c1e] bg-[#f2f4f6] hover:bg-[#004ac6] hover:text-white transition-colors text-left"
                  >
                    <span className="material-symbols-outlined text-base">
                      {s.icon}
                    </span>
                    {s.label}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Connect Connector Line Tool */}
        <button
          onClick={() => {
            setActiveTool('connect');
            setConnectingFromId(null);
          }}
          className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${
            activeTool === 'connect' || connectingFromId
              ? 'bg-[#004ac6] text-white shadow-md scale-110 animate-pulse'
              : 'text-[#565e74] hover:bg-[#dae2fd]/50'
          }`}
          title="Connect Tool (Click source node then target node)"
        >
          <span className="material-symbols-outlined">schema</span>
        </button>

        {/* AI Diagram Generator Tool Button */}
        <button
          onClick={() => setShowAiTool(!showAiTool)}
          className={`w-10 h-10 rounded-full flex items-center justify-center transition-all shadow-sm ${
            showAiTool
              ? 'bg-[#004ac6] text-white ring-2 ring-blue-400 scale-110'
              : 'bg-blue-50 text-[#004ac6] hover:bg-[#004ac6] hover:text-white'
          }`}
          title="Toggle AI Flow Generator Tool"
        >
          <span className="material-symbols-outlined text-xl animate-sparkle">auto_awesome</span>
        </button>
      </nav>

      {/* Connector Line Style Panel */}
      {selectedConnectorId && primarySelectedConnector && (
        <div
          onMouseDown={(e) => e.stopPropagation()}
          onMouseUp={(e) => e.stopPropagation()}
          onClick={(e) => e.stopPropagation()}
          className="fixed top-32 right-6 z-40 bg-white/95 backdrop-blur-xl border border-white/80 rounded-2xl shadow-2xl p-4 flex flex-col gap-3 w-64 glass-panel animate-in fade-in zoom-in-95"
        >
          <div className="flex items-center justify-between border-b border-[#c3c6d7]/30 pb-2">
            <span className="text-xs font-bold text-[#191c1e] flex items-center gap-1.5">
              <span className="material-symbols-outlined text-[#004ac6] text-base">schema</span>
              Connector Style
            </span>
            <button
              onClick={() => handleDeleteConnector(selectedConnectorId)}
              className="text-red-600 hover:bg-red-50 p-1.5 rounded-lg transition-colors"
              title="Delete Connection"
            >
              <span className="material-symbols-outlined text-base">delete</span>
            </button>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-bold text-[#737686] uppercase">Line Label</label>
            <input
              type="text"
              value={primarySelectedConnector.label || ''}
              onChange={(e) =>
                handleUpdateConnector(selectedConnectorId, { label: e.target.value })
              }
              placeholder="Label e.g. Sync API..."
              className="w-full text-xs font-bold bg-[#f2f4f6] border border-[#c3c6d7] rounded-xl px-3 py-1.5 outline-none focus:border-[#004ac6]"
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-bold text-[#737686] uppercase">Line Style</label>
            <div className="grid grid-cols-3 gap-1">
              {[
                { style: 'solid', label: 'Solid' },
                { style: 'dashed', label: 'Dashed' },
                { style: 'active', label: 'Active Flow' },
              ].map((st) => (
                <button
                  key={st.style}
                  onClick={() =>
                    handleUpdateConnector(selectedConnectorId, { style: st.style as any })
                  }
                  className={`py-1 rounded-lg text-xs font-bold transition-colors ${
                    primarySelectedConnector.style === st.style
                      ? 'bg-[#004ac6] text-white'
                      : 'bg-[#f2f4f6] text-[#191c1e] hover:bg-[#e0e3e5]'
                  }`}
                >
                  {st.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Selected Node Style Inspector */}
      {selectedNodeIds.length > 0 && primarySelectedNode && !selectedConnectorId && (
        <div
          onMouseDown={(e) => e.stopPropagation()}
          onMouseUp={(e) => e.stopPropagation()}
          onClick={(e) => e.stopPropagation()}
          className="fixed top-32 right-6 z-40 bg-white/95 backdrop-blur-xl border border-white/80 rounded-2xl shadow-2xl p-4 flex flex-col gap-3.5 w-72 glass-panel animate-in fade-in zoom-in-95"
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-[#c3c6d7]/30 pb-2">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-[#004ac6] text-lg">
                palette
              </span>
              <span className="text-xs font-bold text-[#191c1e]">
                Style Selected ({selectedNodeIds.length})
              </span>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={handleDuplicateSelected}
                className="text-[#434655] hover:bg-[#f2f4f6] p-1.5 rounded-lg transition-colors"
                title="Duplicate selected"
              >
                <span className="material-symbols-outlined text-base">
                  content_copy
                </span>
              </button>
              <button
                onClick={handleBatchDeleteSelected}
                className="text-red-600 hover:bg-red-50 p-1.5 rounded-lg transition-colors"
                title="Delete selected"
              >
                <span className="material-symbols-outlined text-base">
                  delete
                </span>
              </button>
            </div>
          </div>

          {/* Title & Subtitle */}
          {primarySelectedNode.type !== 'path' && (
            <div className="flex flex-col gap-2">
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold text-[#737686] uppercase tracking-wider">
                  Title Text
                </label>
                <input
                  type="text"
                  value={primarySelectedNode.title}
                  onChange={(e) =>
                    handleApplyStyleToSelected({ title: e.target.value })
                  }
                  className="w-full text-xs font-bold bg-[#f2f4f6] border border-[#c3c6d7] rounded-xl px-3 py-1.5 outline-none focus:border-[#004ac6]"
                  placeholder="Enter title..."
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold text-[#737686] uppercase tracking-wider">
                  Subtitle / Description
                </label>
                <input
                  type="text"
                  value={primarySelectedNode.subtitle || ''}
                  onChange={(e) =>
                    handleApplyStyleToSelected({ subtitle: e.target.value })
                  }
                  className="w-full text-xs font-normal bg-[#f2f4f6] border border-[#c3c6d7] rounded-xl px-3 py-1.5 outline-none focus:border-[#004ac6]"
                  placeholder="Subtitle or detail..."
                />
              </div>

              {/* Table Column Schema Controls */}
              {primarySelectedNode.type === 'table' && (
                <div className="flex flex-col gap-2 border-t border-[#c3c6d7]/30 pt-2.5 mt-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold text-[#737686] uppercase tracking-wider flex items-center gap-1">
                      <span className="material-symbols-outlined text-sm text-[#004ac6]">table_chart</span>
                      Columns ({primarySelectedNode.columns?.length || 4})
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        const name = prompt('Column Name:', 'new_col');
                        if (!name) return;
                        const type = prompt('Column Type:', 'VARCHAR(255)') || 'VARCHAR(255)';
                        const existingCols = primarySelectedNode.columns || [
                          { name: 'id', type: 'UUID', isPk: true },
                          { name: 'username', type: 'VARCHAR(100)' },
                          { name: 'email', type: 'VARCHAR(255)' },
                          { name: 'created_at', type: 'TIMESTAMP' },
                        ];
                        handleApplyStyleToSelected({
                          columns: [...existingCols, { name, type }]
                        });
                      }}
                      className="text-[10px] bg-[#004ac6] text-white px-2 py-1 rounded-lg font-bold hover:bg-[#2563eb] transition-colors flex items-center gap-1 shadow-2xs"
                    >
                      <span className="material-symbols-outlined text-xs">add</span>
                      Add Column
                    </button>
                  </div>

                  <div className="flex flex-col gap-1 max-h-40 overflow-y-auto">
                    {(primarySelectedNode.columns || [
                      { name: 'id', type: 'UUID', isPk: true },
                      { name: 'username', type: 'VARCHAR(100)' },
                      { name: 'email', type: 'VARCHAR(255)' },
                      { name: 'created_at', type: 'TIMESTAMP' },
                    ]).map((col, idx) => (
                      <div key={idx} className="flex items-center justify-between bg-[#f2f4f6] px-2 py-1 rounded-lg text-xs font-mono">
                        <div className="flex items-center gap-1.5 truncate">
                          {col.isPk ? (
                            <span className="material-symbols-outlined text-amber-500 text-xs">key</span>
                          ) : (
                            <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span>
                          )}
                          <span className="font-semibold text-slate-800 truncate">{col.name}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <span className="text-[10px] text-slate-500 bg-white px-1.5 py-0.5 rounded border border-slate-200">{col.type}</span>
                          <button
                            type="button"
                            onClick={() => {
                              const existingCols = primarySelectedNode.columns || [];
                              const updated = existingCols.filter((_, i) => i !== idx);
                              handleApplyStyleToSelected({ columns: updated });
                            }}
                            className="text-slate-400 hover:text-red-600 p-0.5"
                          >
                            <span className="material-symbols-outlined text-xs">close</span>
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Font Size & Typography Control */}
              <div className="flex flex-col gap-2 border-t border-[#c3c6d7]/30 pt-2.5 mt-1">
                <div className="flex justify-between items-center">
                  <span className="text-[10px] font-bold text-[#737686] uppercase tracking-wider flex items-center gap-1">
                    <span className="material-symbols-outlined text-sm text-[#004ac6]">format_size</span>
                    Font Size
                  </span>
                  <span className="text-xs font-bold text-[#004ac6] font-mono">
                    {getFontPx(primarySelectedNode.fontSize)}px
                  </span>
                </div>

                {/* Stepper + Quick Presets */}
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => {
                      const curr = getFontPx(primarySelectedNode.fontSize);
                      handleApplyStyleToSelected({ fontSize: String(Math.max(8, curr - 2)) });
                    }}
                    className="w-7 h-7 rounded-lg bg-[#f2f4f6] hover:bg-[#e0e3e5] text-[#191c1e] font-bold text-sm flex items-center justify-center transition-colors shadow-2xs"
                    title="Decrease Font Size (-2px)"
                  >
                    -
                  </button>

                  <div className="flex-1 grid grid-cols-4 gap-1">
                    {[
                      { label: '14', val: '14' },
                      { label: '18', val: '18' },
                      { label: '24', val: '24' },
                      { label: '32', val: '32' },
                      { label: '40', val: '40' },
                      { label: '48', val: '48' },
                      { label: '56', val: '56' },
                      { label: '64', val: '64' },
                    ].map((f) => (
                      <button
                        key={f.val}
                        type="button"
                        onClick={() => handleApplyStyleToSelected({ fontSize: f.val })}
                        className={`py-1 rounded-md text-[10px] font-bold transition-all ${
                          String(getFontPx(primarySelectedNode.fontSize)) === f.val
                            ? 'bg-[#004ac6] text-white shadow-xs'
                            : 'bg-[#f2f4f6] text-[#434655] hover:bg-[#e0e3e5]'
                        }`}
                      >
                        {f.label}
                      </button>
                    ))}
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      const curr = getFontPx(primarySelectedNode.fontSize);
                      handleApplyStyleToSelected({ fontSize: String(Math.min(120, curr + 2)) });
                    }}
                    className="w-7 h-7 rounded-lg bg-[#f2f4f6] hover:bg-[#e0e3e5] text-[#191c1e] font-bold text-sm flex items-center justify-center transition-colors shadow-2xs"
                    title="Increase Font Size (+2px)"
                  >
                    +
                  </button>
                </div>

                {/* Text Alignment */}
                <div className="flex items-center gap-1 pt-1">
                  {[
                    { align: 'left', icon: 'format_align_left' },
                    { align: 'center', icon: 'format_align_center' },
                    { align: 'right', icon: 'format_align_right' },
                  ].map((a) => (
                    <button
                      key={a.align}
                      type="button"
                      onClick={() => handleApplyStyleToSelected({ textAlign: a.align as any })}
                      className={`flex-1 py-1 rounded-lg flex items-center justify-center transition-colors ${
                        (primarySelectedNode.textAlign || 'left') === a.align
                          ? 'bg-[#004ac6] text-white'
                          : 'bg-[#f2f4f6] text-[#434655] hover:bg-[#e0e3e5]'
                      }`}
                      title={`Align ${a.align}`}
                    >
                      <span className="material-symbols-outlined text-sm">{a.icon}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Color Fill Palette */}
          {primarySelectedNode.type === 'path' ? (
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-bold text-[#737686] uppercase tracking-wider">
                Pencil Line Color
              </label>
              <div className="flex flex-wrap gap-1.5">
                {STROKE_COLORS.map((color) => (
                  <button
                    key={color}
                    type="button"
                    onClick={() =>
                      handleApplyStyleToSelected({
                        strokeColor: color,
                      })
                    }
                    title={color}
                    style={{ backgroundColor: color }}
                    className={`w-6 h-6 rounded-full border border-[#c3c6d7] shadow-xs hover:scale-110 transition-transform ${
                      primarySelectedNode.strokeColor === color ? 'ring-2 ring-[#004ac6]' : ''
                    }`}
                  />
                ))}
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-bold text-[#737686] uppercase tracking-wider">
                Background Fill
              </label>
              <div className="flex flex-wrap gap-1.5">
                {COLOR_SWATCHES.map((sw) => (
                  <button
                    key={sw.label}
                    type="button"
                    onClick={() =>
                      handleApplyStyleToSelected({
                        color: sw.bg,
                        borderColor: sw.border,
                      })
                    }
                    title={sw.label}
                    style={{ backgroundColor: sw.bg === 'transparent' ? '#ffffff' : sw.bg }}
                    className={`w-6 h-6 rounded-full border border-[#c3c6d7] shadow-xs hover:scale-110 transition-transform ${
                      primarySelectedNode.color === sw.bg ? 'ring-2 ring-[#004ac6]' : ''
                    }`}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Stroke Width */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-bold text-[#737686] uppercase tracking-wider">
              Border / Stroke Width
            </label>
            <div className="flex items-center gap-2">
              {[1, 2, 4, 8].map((w) => (
                <button
                  key={w}
                  onClick={() => handleApplyStyleToSelected({ strokeWidth: w })}
                  className={`flex-1 py-1 rounded-lg text-xs font-bold transition-colors ${
                    primarySelectedNode.strokeWidth === w
                      ? 'bg-[#004ac6] text-white'
                      : 'bg-[#f2f4f6] text-[#191c1e] hover:bg-[#e0e3e5]'
                  }`}
                >
                  {w}px
                </button>
              ))}
            </div>
          </div>

          {/* Opacity Slider */}
          <div className="flex flex-col gap-1">
            <div className="flex justify-between items-center text-[10px] font-bold text-[#737686] uppercase">
              <span>Opacity</span>
              <span>{primarySelectedNode.opacity ?? 100}%</span>
            </div>
            <input
              type="range"
              min="20"
              max="100"
              value={primarySelectedNode.opacity ?? 100}
              onChange={(e) =>
                handleApplyStyleToSelected({ opacity: Number(e.target.value) })
              }
              className="w-full accent-[#004ac6] cursor-pointer"
            />
          </div>
        </div>
      )}

      {/* Floating Bottom Left Control Bar (Zoom, Pan, Reset View & Quick Export) */}
      <div
        onMouseDown={(e) => e.stopPropagation()}
        onMouseUp={(e) => e.stopPropagation()}
        onClick={(e) => e.stopPropagation()}
        className="fixed bottom-6 left-28 z-40 flex items-center gap-3 bg-white/95 backdrop-blur-md border border-white/80 rounded-full px-4 py-2 shadow-xl glass-panel"
      >
        <button
          onClick={() => setActiveTool('pan')}
          className={`p-1.5 rounded-full transition-colors ${
            activeTool === 'pan'
              ? 'bg-[#004ac6] text-white'
              : 'text-[#191c1e] hover:bg-[#f2f4f6]'
          }`}
          title="Free Workspace Pan (Hold Spacebar)"
        >
          <span className="material-symbols-outlined text-base">pan_tool</span>
        </button>

        <div className="h-4 w-px bg-[#c3c6d7]"></div>

        <button
          onClick={() => setZoom(Math.max(0.2, zoom - 0.1))}
          className="p-1 hover:bg-[#f2f4f6] rounded-full text-[#191c1e]"
          title="Zoom Out (Ctrl + Scroll)"
        >
          <span className="material-symbols-outlined text-base">remove</span>
        </button>
        <span className="text-xs font-bold text-[#191c1e] min-w-[42px] text-center">
          {Math.round(zoom * 100)}%
        </span>
        <button
          onClick={() => setZoom(Math.min(4, zoom + 0.1))}
          className="p-1 hover:bg-[#f2f4f6] rounded-full text-[#191c1e]"
          title="Zoom In (Ctrl + Scroll)"
        >
          <span className="material-symbols-outlined text-base">add</span>
        </button>
        <button
          onClick={() => {
            setZoom(1);
            setPan({ x: 0, y: 0 });
          }}
          className="text-[11px] font-bold text-[#004ac6] ml-1 hover:underline"
        >
          Reset View
        </button>

        <div className="h-4 w-px bg-[#c3c6d7]"></div>

        {/* Quick Export PNG Button */}
        <button
          onClick={() => exportProjectToPng(project)}
          className="flex items-center gap-1 text-xs font-bold text-[#943700] hover:text-[#004ac6] transition-colors"
          title="Download PNG image"
        >
          <span className="material-symbols-outlined text-base">download</span>
          Export PNG
        </button>
      </div>

      {/* Floating AI Flow Generator Input Widget */}
      {showAiTool && (
        <div
          onMouseDown={(e) => e.stopPropagation()}
          onMouseUp={(e) => e.stopPropagation()}
          onClick={(e) => e.stopPropagation()}
          className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex flex-col items-center gap-2 pointer-events-auto max-w-xl w-full px-4 drop-shadow-2xl select-text"
        >
          {aiNotice && (
            <div className="bg-[#111827] text-white text-xs font-semibold px-4 py-2 rounded-full shadow-2xl flex items-center gap-2 border border-blue-500/40 animate-in fade-in zoom-in-95">
              <span className="material-symbols-outlined text-sm text-blue-400 animate-spin">auto_awesome</span>
              <span>{aiNotice}</span>
            </div>
          )}

          <PromptInput
            onSubmit={handleAiSubmit}
            placeholder="Ask AI to generate architecture, flowcharts, database schema..."
            loading={isAiGenerating}
          />
        </div>
      )}
    </div>
  );
};
