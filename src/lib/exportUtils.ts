import { Project, CanvasNode, Connector } from '../types';

/**
 * Helper to trigger a browser file download for a Blob
 */
export function downloadFile(content: string, filename: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Export project metadata and diagram as JSON backup
 */
export function exportProjectToJson(project: Project) {
  const dataStr = JSON.stringify(project, null, 2);
  const safeTitle = project.title.toLowerCase().replace(/[^a-z0-9]/g, '_');
  downloadFile(dataStr, `${safeTitle}_flowboard.json`, 'application/json');
}

/**
 * Export canvas elements as an SVG vector image
 */
export function exportProjectToSvg(project: Project) {
  if (!project.nodes.length) {
    alert('Canvas is empty. Add elements before exporting.');
    return;
  }

  // Calculate bounding box of all nodes
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  project.nodes.forEach((n) => {
    const w = n.width || 180;
    const h = n.height || 80;
    if (n.x < minX) minX = n.x;
    if (n.y < minY) minY = n.y;
    if (n.x + w > maxX) maxX = n.x + w;
    if (n.y + h > maxY) maxY = n.y + h;
  });

  const padding = 60;
  const viewX = minX - padding;
  const viewY = minY - padding;
  const width = Math.max(400, maxX - minX + padding * 2);
  const height = Math.max(300, maxY - minY + padding * 2);

  let svgContent = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${viewX} ${viewY} ${width} ${height}" width="${width}" height="${height}" style="background-color: #f7f9fb; font-family: system-ui, -apple-system, sans-serif;">\n`;

  // Defs for marker arrows
  svgContent += `  <defs>
    <marker id="arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
      <path d="M 0 0 L 10 5 L 0 10 z" fill="#004ac6" />
    </marker>
  </defs>\n`;

  // Draw Connectors
  project.connectors.forEach((conn) => {
    const fromNode = project.nodes.find((n) => n.id === conn.fromId);
    const toNode = project.nodes.find((n) => n.id === conn.toId);
    if (!fromNode || !toNode) return;

    const fromX = fromNode.x + (fromNode.width || 180) / 2;
    const fromY = fromNode.y + (fromNode.height || 80) / 2;
    const toX = toNode.x + (toNode.width || 180) / 2;
    const toY = toNode.y + (toNode.height || 80) / 2;

    const dx = (toX - fromX) / 2;
    const pathD = `M ${fromX} ${fromY} C ${fromX + dx} ${fromY}, ${toX - dx} ${toY}, ${toX} ${toY}`;

    svgContent += `  <path d="${pathD}" fill="none" stroke="${conn.color || '#004ac6'}" stroke-width="2.5" marker-end="url(#arrow)" ${
      conn.style === 'dashed' ? 'stroke-dasharray="5 5"' : ''
    } />\n`;

    if (conn.label) {
      const midX = (fromX + toX) / 2;
      const midY = (fromY + toY) / 2 - 8;
      svgContent += `  <text x="${midX}" y="${midY}" fill="#434655" font-size="12" font-weight="600" text-anchor="middle">${escapeXml(
        conn.label
      )}</text>\n`;
    }
  });

  // Draw Nodes
  project.nodes.forEach((node) => {
    const w = node.width || 180;
    const h = node.height || 80;
    const bg = node.color || '#ffffff';
    const border = node.borderColor || '#004ac6';
    const strokeW = node.strokeWidth || 2;

    if (node.type === 'path' && node.points && node.points.length > 1) {
      const isRelative = node.points.some(
        (p) => p.x <= (node.width || 1000) + 20 && p.y <= (node.height || 1000) + 20
      );
      const absPoints = isRelative
        ? node.points.map((p) => ({ x: p.x + node.x, y: p.y + node.y }))
        : node.points;
      const pathData = `M ${absPoints.map((p) => `${p.x} ${p.y}`).join(' L ')}`;
      svgContent += `  <path d="${pathData}" fill="none" stroke="${node.strokeColor || '#004ac6'}" stroke-width="${
        node.strokeWidth || 4
      }" stroke-linecap="round" stroke-linejoin="round" />\n`;
      return;
    }

    if (node.type === 'circle' || node.type === 'oval') {
      const rx = w / 2;
      const ry = h / 2;
      const cx = node.x + rx;
      const cy = node.y + ry;
      svgContent += `  <ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="${bg}" stroke="${border}" stroke-width="${strokeW}" />\n`;
    } else if (node.type === 'diamond') {
      const cx = node.x + w / 2;
      const cy = node.y + h / 2;
      const pts = `${cx},${node.y} ${node.x + w},${cy} ${cx},${node.y + h} ${node.x},${cy}`;
      svgContent += `  <polygon points="${pts}" fill="${bg}" stroke="${border}" stroke-width="${strokeW}" />\n`;
    } else if (node.type === 'triangle') {
      const cx = node.x + w / 2;
      const pts = `${cx},${node.y} ${node.x + w},${node.y + h} ${node.x},${node.y + h}`;
      svgContent += `  <polygon points="${pts}" fill="${bg}" stroke="${border}" stroke-width="${strokeW}" />\n`;
    } else {
      svgContent += `  <rect x="${node.x}" y="${node.y}" width="${w}" height="${h}" rx="12" fill="${bg}" stroke="${border}" stroke-width="${strokeW}" />\n`;
    }

    // Node Title Text
    const textX = node.x + w / 2;
    const textY = node.y + h / 2 + 4;
    const textColor = bg === '#1e293b' || bg === '#2563eb' ? '#ffffff' : '#191c1e';

    svgContent += `  <text x="${textX}" y="${textY}" fill="${textColor}" font-size="13" font-weight="bold" text-anchor="middle">${escapeXml(
      node.title
    )}</text>\n`;
  });

  svgContent += `</svg>`;

  const safeTitle = project.title.toLowerCase().replace(/[^a-z0-9]/g, '_');
  downloadFile(svgContent, `${safeTitle}_diagram.svg`, 'image/svg+xml');
}

/**
 * Render canvas onto an HTML5 Canvas element and export as high resolution PNG
 */
export async function exportProjectToPng(project: Project) {
  if (!project.nodes.length) {
    alert('Canvas is empty. Add elements before exporting.');
    return;
  }

  // Generate SVG string first
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  project.nodes.forEach((n) => {
    const w = n.width || 180;
    const h = n.height || 80;
    if (n.x < minX) minX = n.x;
    if (n.y < minY) minY = n.y;
    if (n.x + w > maxX) maxX = n.x + w;
    if (n.y + h > maxY) maxY = n.y + h;
  });

  const padding = 60;
  const viewX = minX - padding;
  const viewY = minY - padding;
  const width = Math.max(600, maxX - minX + padding * 2);
  const height = Math.max(450, maxY - minY + padding * 2);

  let svgContent = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${viewX} ${viewY} ${width} ${height}" width="${width}" height="${height}" style="background-color: #f7f9fb; font-family: system-ui, -apple-system, sans-serif;">\n`;

  svgContent += `  <defs>
    <marker id="arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
      <path d="M 0 0 L 10 5 L 0 10 z" fill="#004ac6" />
    </marker>
  </defs>\n`;

  project.connectors.forEach((conn) => {
    const fromNode = project.nodes.find((n) => n.id === conn.fromId);
    const toNode = project.nodes.find((n) => n.id === conn.toId);
    if (!fromNode || !toNode) return;

    const fromX = fromNode.x + (fromNode.width || 180) / 2;
    const fromY = fromNode.y + (fromNode.height || 80) / 2;
    const toX = toNode.x + (toNode.width || 180) / 2;
    const toY = toNode.y + (toNode.height || 80) / 2;

    const dx = (toX - fromX) / 2;
    const pathD = `M ${fromX} ${fromY} C ${fromX + dx} ${fromY}, ${toX - dx} ${toY}, ${toX} ${toY}`;

    svgContent += `  <path d="${pathD}" fill="none" stroke="${conn.color || '#004ac6'}" stroke-width="3" marker-end="url(#arrow)" ${
      conn.style === 'dashed' ? 'stroke-dasharray="5 5"' : ''
    } />\n`;

    if (conn.label) {
      const midX = (fromX + toX) / 2;
      const midY = (fromY + toY) / 2 - 8;
      svgContent += `  <text x="${midX}" y="${midY}" fill="#434655" font-size="12" font-weight="600" text-anchor="middle">${escapeXml(
        conn.label
      )}</text>\n`;
    }
  });

  project.nodes.forEach((node) => {
    const w = node.width || 180;
    const h = node.height || 80;
    const bg = node.color || '#ffffff';
    const border = node.borderColor || '#004ac6';
    const strokeW = node.strokeWidth || 2;

    if (node.type === 'path' && node.points && node.points.length > 1) {
      const isRelative = node.points.some(
        (p) => p.x <= (node.width || 1000) + 20 && p.y <= (node.height || 1000) + 20
      );
      const absPoints = isRelative
        ? node.points.map((p) => ({ x: p.x + node.x, y: p.y + node.y }))
        : node.points;
      const pathData = `M ${absPoints.map((p) => `${p.x} ${p.y}`).join(' L ')}`;
      svgContent += `  <path d="${pathData}" fill="none" stroke="${node.strokeColor || '#004ac6'}" stroke-width="${
        node.strokeWidth || 4
      }" stroke-linecap="round" stroke-linejoin="round" />\n`;
      return;
    }

    if (node.type === 'circle' || node.type === 'oval') {
      const rx = w / 2;
      const ry = h / 2;
      const cx = node.x + rx;
      const cy = node.y + ry;
      svgContent += `  <ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="${bg}" stroke="${border}" stroke-width="${strokeW}" />\n`;
    } else if (node.type === 'diamond') {
      const cx = node.x + w / 2;
      const cy = node.y + h / 2;
      const pts = `${cx},${node.y} ${node.x + w},${cy} ${cx},${node.y + h} ${node.x},${cy}`;
      svgContent += `  <polygon points="${pts}" fill="${bg}" stroke="${border}" stroke-width="${strokeW}" />\n`;
    } else if (node.type === 'triangle') {
      const cx = node.x + w / 2;
      const pts = `${cx},${node.y} ${node.x + w},${node.y + h} ${node.x},${node.y + h}`;
      svgContent += `  <polygon points="${pts}" fill="${bg}" stroke="${border}" stroke-width="${strokeW}" />\n`;
    } else {
      svgContent += `  <rect x="${node.x}" y="${node.y}" width="${w}" height="${h}" rx="12" fill="${bg}" stroke="${border}" stroke-width="${strokeW}" />\n`;
    }

    const textX = node.x + w / 2;
    const textY = node.y + h / 2 + 4;
    const textColor = bg === '#1e293b' || bg === '#2563eb' ? '#ffffff' : '#191c1e';

    svgContent += `  <text x="${textX}" y="${textY}" fill="${textColor}" font-size="13" font-weight="bold" text-anchor="middle">${escapeXml(
      node.title
    )}</text>\n`;
  });

  svgContent += `</svg>`;

  // Render SVG onto Canvas image
  const img = new Image();
  const svgBlob = new Blob([svgContent], { type: 'image/svg+xml;charset=utf-8' });
  const url = URL.createObjectURL(svgBlob);

  img.onload = () => {
    const canvas = document.createElement('canvas');
    canvas.width = width * 2; // High DPI
    canvas.height = height * 2;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.scale(2, 2);
      ctx.fillStyle = '#f7f9fb';
      ctx.fillRect(0, 0, width, height);
      ctx.drawImage(img, 0, 0);
      const pngUrl = canvas.toDataURL('image/png');
      const safeTitle = project.title.toLowerCase().replace(/[^a-z0-9]/g, '_');
      const a = document.createElement('a');
      a.href = pngUrl;
      a.download = `${safeTitle}_diagram.png`;
      a.click();
    }
    URL.revokeObjectURL(url);
  };

  img.src = url;
}

function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}
