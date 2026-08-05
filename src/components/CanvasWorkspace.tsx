import React, { useState, useRef, useEffect } from 'react';
import { CanvasNode, Connector, CommentItem, Project, Point, NodeType } from '../types';
import { exportProjectToPng, exportProjectToSvg, exportProjectToJson } from '../lib/exportUtils';

interface CanvasWorkspaceProps {
  project: Project;
  onUpdateProject: (updated: Partial<Project>) => void;
  onOpenAiModal: () => void;
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

export const CanvasWorkspace: React.FC<CanvasWorkspaceProps> = ({
  project,
  onUpdateProject,
  onOpenAiModal,
}) => {
  // Tool & Navigation state
  const [activeTool, setActiveTool] = useState<ActiveTool>('select');
  const [selectedShapeType, setSelectedShapeType] = useState<NodeType>('rectangle');
  const [showShapePicker, setShowShapePicker] = useState(false);
  const [showExportMenu, setShowExportMenu] = useState(false);

  // Selection state
  const [selectedNodeIds, setSelectedNodeIds] = useState<string[]>([]);
  const [selectedConnectorId, setSelectedConnectorId] = useState<string | null>(null);

  // Moveable Toolbar State
  const [toolbarPos, setToolbarPos] = useState<{ x: number; y: number } | null>(null);

  const handleToolbarDragStart = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    const navElem = (e.currentTarget as HTMLElement).closest('nav');
    if (!navElem) return;
    const rect = navElem.getBoundingClientRect();
    const startX = e.clientX;
    const startY = e.clientY;
    const initialX = rect.left;
    const initialY = rect.top;

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const deltaX = moveEvent.clientX - startX;
      const deltaY = moveEvent.clientY - startY;
      const newX = Math.max(10, Math.min(window.innerWidth - 80, initialX + deltaX));
      const newY = Math.max(70, Math.min(window.innerHeight - 360, initialY + deltaY));
      setToolbarPos({ x: newX, y: newY });
    };

    const handleMouseUp = () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
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

  // Wheel Zoom / Pan Event Handler
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    if (e.ctrlKey || e.metaKey) {
      // Zoom centered on mouse
      const zoomFactor = e.deltaY < 0 ? 1.08 : 0.92;
      const newZoom = Math.min(Math.max(0.2, zoom * zoomFactor), 4);

      const mousePos = screenToCanvasCoords(e.clientX, e.clientY);
      const newPanX = e.clientX - (containerRef.current?.getBoundingClientRect().left || 0) - mousePos.x * newZoom;
      const newPanY = e.clientY - (containerRef.current?.getBoundingClientRect().top || 0) - mousePos.y * newZoom;

      setZoom(newZoom);
      setPan({ x: newPanX, y: newPanY });
    } else {
      // Scroll to Pan
      setPan((prev) => ({
        x: prev.x - e.deltaX,
        y: prev.y - e.deltaY,
      }));
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

    const newNode: CanvasNode = {
      id,
      type,
      title: isText ? 'Heading / Text' : isNormal ? 'Normal Shape' : getShapeDefaultTitle(type),
      subtitle: isText ? '' : 'Click to customize',
      x: Math.round(centerPt.x - 90),
      y: Math.round(centerPt.y - 45),
      width: isText ? 180 : type === 'circle' || type === 'oval' ? 120 : 180,
      height: isText ? 50 : type === 'circle' || type === 'oval' ? 120 : 85,
      color: isText ? 'transparent' : type === 'sticky' ? '#ffdbcd' : '#ffffff',
      borderColor: isText ? 'transparent' : type === 'sticky' ? '#943700' : '#004ac6',
      strokeWidth: isText ? 0 : 2,
      fontSize: isText ? '24' : '16',
      opacity: 100,
    };

    onUpdateProject({ nodes: [...project.nodes, newNode] });
    setSelectedNodeIds([id]);
    setShowShapePicker(false);
  };

  // Helper title mapping
  function getShapeDefaultTitle(type: NodeType): string {
    switch (type) {
      case 'normal-shape':
        return 'Normal Shape';
      case 'text':
        return 'Text Element';
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
        return 'Milestone';
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
      onWheel={handleWheel}
      onMouseDown={handleCanvasMouseDown}
      onMouseMove={handleCanvasMouseMove}
      onMouseUp={handleCanvasMouseUp}
      className={`absolute inset-0 canvas-bg z-0 overflow-hidden select-none pt-16 ${
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

          // Render Shape Nodes
          const titleFontPx = getFontPx(node.fontSize);
          const subFontPx = Math.max(10, Math.round(titleFontPx * 0.7));
          const isTextNode = node.type === 'text';

          return (
            <div
              key={node.id}
              onMouseDown={(e) => handleNodeMouseDown(e, node)}
              style={{
                left: `${node.x}px`,
                top: `${node.y}px`,
                width: node.width ? `${node.width}px` : isTextNode ? 'auto' : '180px',
                minHeight: node.height ? `${node.height}px` : isTextNode ? 'auto' : '80px',
                backgroundColor: node.color || (isTextNode ? 'transparent' : '#ffffff'),
                borderColor: node.borderColor || (isTextNode ? 'transparent' : '#004ac6'),
                borderWidth: `${node.strokeWidth !== undefined ? node.strokeWidth : isTextNode ? 0 : 2}px`,
                borderStyle: node.strokeStyle || 'solid',
                opacity: node.opacity !== undefined ? node.opacity / 100 : 1,
              }}
              className={`absolute cursor-pointer transition-shadow duration-150 z-20 ${
                isTextNode ? 'p-2' : 'p-4 shadow-sm hover:shadow-md'
              } flex flex-col justify-center group ${
                node.type === 'circle' || node.type === 'oval'
                  ? 'rounded-full items-center text-center'
                  : node.type === 'diamond'
                  ? 'rotate-0 border-2 rounded-2xl items-center text-center'
                  : node.type === 'sticky'
                  ? 'rounded-xl shadow-md'
                  : node.type === 'cloud'
                  ? 'rounded-3xl border-2'
                  : node.type === 'triangle'
                  ? 'rounded-xl items-center text-center'
                  : 'rounded-xl'
              } ${
                isSelected
                  ? isTextNode
                    ? 'ring-2 ring-[#004ac6] border-dashed ring-offset-2'
                    : 'ring-2 ring-[#004ac6] ring-offset-2 shadow-xl'
                  : ''
              } ${isConnectingFrom ? 'ring-2 ring-emerald-500 animate-pulse' : ''}`}
            >
              {/* Title & Subtitle */}
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
                    color:
                      node.color === '#1e293b' || node.color === '#2563eb'
                        ? '#ffffff'
                        : '#191c1e',
                  }}
                >
                  {node.title}
                </div>
                {node.subtitle && (
                  <div
                    className="mt-0.5 opacity-80"
                    style={{
                      fontSize: `${subFontPx}px`,
                      color:
                        node.color === '#1e293b' || node.color === '#2563eb'
                          ? '#e2e8f0'
                          : '#434655',
                    }}
                  >
                    {node.subtitle}
                  </div>
                )}
              </div>

              {/* Connection Handle Pin Button (Right Edge) */}
              <button
                onClick={(e) => handleStartConnection(e, node.id)}
                className="absolute -right-3 top-1/2 -translate-y-1/2 w-6 h-6 bg-[#004ac6] hover:bg-[#2563eb] text-white rounded-full flex items-center justify-center shadow-md hover:scale-125 transition-transform z-30"
                title="Click to draw connecting line"
              >
                <span className="material-symbols-outlined text-xs">add</span>
              </button>
            </div>
          );
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
        className="fixed left-6 top-1/2 -translate-y-1/2 z-40 flex flex-col items-center py-3 px-1.5 gap-2.5 bg-white/95 backdrop-blur-xl border border-white/80 shadow-2xl rounded-3xl w-16 glass-panel select-none transition-shadow"
      >
        {/* Drag Handle to move toolbar */}
        <div
          onMouseDown={handleToolbarDragStart}
          onDoubleClick={() => setToolbarPos(null)}
          className="w-full flex items-center justify-center py-1 cursor-grab active:cursor-grabbing text-[#737686] hover:text-[#004ac6] border-b border-[#c3c6d7]/30 group"
          title="Click & Drag to move tool anywhere on canvas (Double-click to reset)"
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
                  { type: 'normal-shape', label: 'Normal Shape', icon: 'crop_5_4' },
                  { type: 'text', label: 'Text Shape', icon: 'title' },
                  { type: 'rectangle', label: 'Process Box', icon: 'check_box_outline_blank' },
                  { type: 'circle', label: 'Circle State', icon: 'radio_button_unchecked' },
                  { type: 'diamond', label: 'Decision Gate', icon: 'square' },
                  { type: 'triangle', label: 'Triangle', icon: 'change_history' },
                  { type: 'star', label: 'Milestone Star', icon: 'star_outline' },
                  { type: 'database', label: 'Database', icon: 'database' },
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

        <div className="w-8 h-px bg-[#c3c6d7]/50 my-0.5"></div>

        {/* AI Generator Button */}
        <button
          onClick={onOpenAiModal}
          className="w-10 h-10 rounded-full flex items-center justify-center text-[#943700] bg-[#ffdbcd]/60 hover:bg-[#ffdbcd] transition-all border border-[#ffb596]/60 shadow-sm"
          title="AI Generate Diagram"
        >
          <span
            className="material-symbols-outlined"
            style={{ fontVariationSettings: "'FILL' 1" }}
          >
            auto_awesome
          </span>
        </button>
      </nav>

      {/* Connector Line Style Panel */}
      {selectedConnectorId && primarySelectedConnector && (
        <div
          onMouseDown={(e) => e.stopPropagation()}
          onMouseUp={(e) => e.stopPropagation()}
          onClick={(e) => e.stopPropagation()}
          className="fixed top-20 right-10 z-40 bg-white/95 backdrop-blur-xl border border-white/80 rounded-2xl shadow-2xl p-4 flex flex-col gap-3 w-64 glass-panel animate-in fade-in zoom-in-95"
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
          className="fixed top-20 right-10 z-40 bg-white/95 backdrop-blur-xl border border-white/80 rounded-2xl shadow-2xl p-4 flex flex-col gap-3.5 w-72 glass-panel animate-in fade-in zoom-in-95"
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
    </div>
  );
};
