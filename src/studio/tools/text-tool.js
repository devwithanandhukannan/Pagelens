/**
 * Pagelens — Text Tool & Stamp Tool
 * Drag-to-create inline text entry box & scalable bug report step stamps.
 */

import { ToolInterface } from './tool-interface.js';
import { history } from '../core/history.js';
import { AddShapeCommand } from '../core/commands/add-shape-command.js';
import { eventBus } from '../core/event-bus.js';

export class TextTool extends ToolInterface {
  constructor() {
    super('text', 'crosshair');
    this.startPoint = null;
    this.currentBox = null;
    this.isDrawing = false;
    this.activeEditor = null;

    eventBus.on('edit-text-annotation', (annotation) => {
      this.openInlineEditor(annotation, annotation.store || null, annotation.docModel || null, annotation);
    });
  }

  onPointerDown(e, point, store, docModel) {
    if (this.activeEditor) {
      this.commitInlineEditor();
      return;
    }

    this.startPoint = { ...point };
    this.isDrawing = true;

    // Show temporary live preview box on canvas
    this.currentBox = {
      id: 'text_draft_preview',
      type: 'text_draft',
      x: point.x,
      y: point.y,
      width: 0,
      height: 0,
    };
    docModel.addAnnotation(this.currentBox);
  }

  onPointerMove(e, point, store, docModel) {
    if (!this.isDrawing || !this.startPoint || !this.currentBox) return;

    const x = Math.min(this.startPoint.x, point.x);
    const y = Math.min(this.startPoint.y, point.y);
    const width = Math.abs(point.x - this.startPoint.x);
    const height = Math.abs(point.y - this.startPoint.y);

    docModel.updateAnnotation(this.currentBox.id, { x, y, width, height });
  }

  onPointerUp(e, point, store, docModel) {
    if (!this.isDrawing || !this.startPoint) return;
    this.isDrawing = false;

    let x = Math.min(this.startPoint.x, point.x);
    let y = Math.min(this.startPoint.y, point.y);
    let width = Math.abs(point.x - this.startPoint.x);
    let height = Math.abs(point.y - this.startPoint.y);

    // Remove draft preview annotation from model
    if (this.currentBox) {
      docModel.removeAnnotation(this.currentBox.id);
      this.currentBox = null;
    }

    // Default comfortable dimensions if user clicked without dragging much
    if (width < 30 || height < 20) {
      width = Math.max(width, 180);
      height = Math.max(height, 52);
    }

    this.openInlineEditor({ x, y, width, height }, store, docModel);
    this.startPoint = null;
  }

  openInlineEditor(rect, store, docModel, existingAnnotation = null) {
    this.closeInlineEditor();

    const transformWrapper = document.getElementById('canvas-transform-wrapper');
    if (!transformWrapper) return;

    const currentStore = store || window.__pagelensStore;
    const currentDoc = docModel || window.__pagelensDocModel;
    const toolOptions = currentStore?.getState()?.toolOptions || {};

    const color = (existingAnnotation && existingAnnotation.color) || toolOptions.color || '#F8FAFC';
    const initialText = existingAnnotation ? existingAnnotation.text : '';

    // Calculate proportional font size based on rect height, clamped between 15 and 48
    const defaultFontSize = Math.max(16, Math.min(48, Math.round(rect.height * 0.42)));
    const fontSize = (existingAnnotation && existingAnnotation.fontSize) || toolOptions.fontSize || defaultFontSize;

    const editorContainer = document.createElement('div');
    editorContainer.className = 'studio-inline-text-editor';
    editorContainer.id = 'studio-inline-text-editor';
    editorContainer.style.position = 'absolute';
    editorContainer.style.left = `${rect.x}px`;
    editorContainer.style.top = `${rect.y}px`;
    editorContainer.style.width = `${Math.max(140, rect.width)}px`;
    editorContainer.style.minHeight = `${Math.max(44, rect.height)}px`;
    editorContainer.style.zIndex = '100';

    const textarea = document.createElement('textarea');
    textarea.className = 'studio-inline-text-input';
    textarea.placeholder = 'Type text here...';
    textarea.value = initialText;
    textarea.style.color = color;
    textarea.style.fontSize = `${fontSize}px`;
    textarea.spellcheck = false;

    editorContainer.appendChild(textarea);
    transformWrapper.appendChild(editorContainer);

    this.activeEditor = {
      container: editorContainer,
      textarea,
      rect,
      color,
      fontSize,
      existingAnnotation,
      store: currentStore,
      docModel: currentDoc,
    };

    // Auto-focus and select
    setTimeout(() => {
      textarea.focus();
      if (initialText) textarea.select();
    }, 25);

    // Auto expand height as text grows
    const autoResize = () => {
      textarea.style.height = 'auto';
      textarea.style.height = `${Math.max(rect.height, textarea.scrollHeight)}px`;
      editorContainer.style.height = textarea.style.height;
    };
    textarea.addEventListener('input', autoResize);
    setTimeout(autoResize, 35);

    // Stop canvas pointerdown/pan capture while clicking inside textarea
    textarea.addEventListener('pointerdown', (e) => e.stopPropagation());
    textarea.addEventListener('mousedown', (e) => e.stopPropagation());
    textarea.addEventListener('click', (e) => e.stopPropagation());

    // Enter commits (Shift+Enter for newline), Escape cancels
    textarea.addEventListener('keydown', (e) => {
      e.stopPropagation();
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        this.commitInlineEditor();
      } else if (e.key === 'Escape') {
        e.preventDefault();
        this.closeInlineEditor();
      }
    });

    // Commit on blur when clicking elsewhere on the canvas
    textarea.addEventListener('blur', () => {
      setTimeout(() => {
        if (this.activeEditor) {
          this.commitInlineEditor();
        }
      }, 120);
    });
  }

  commitInlineEditor() {
    if (!this.activeEditor) return;
    const { textarea, rect, color, fontSize, existingAnnotation, store, docModel } = this.activeEditor;
    const text = textarea.value.trim();

    if (text) {
      const finalW = Math.max(rect.width, textarea.offsetWidth, Math.round(text.length * fontSize * 0.65) + 28);
      const finalH = Math.max(rect.height, textarea.offsetHeight, Math.round(fontSize * 1.5) + 20);

      if (existingAnnotation && docModel) {
        docModel.updateAnnotation(existingAnnotation.id, {
          text,
          width: finalW,
          height: finalH,
          color,
          fontSize,
        });
        eventBus.emit('document-changed');
      } else if (docModel) {
        const annotation = {
          id: `text_${Date.now()}`,
          type: 'text',
          x: rect.x,
          y: rect.y,
          width: finalW,
          height: finalH,
          text,
          color,
          fontSize,
          align: 'center',
          showBackground: true,
          backgroundColor: 'rgba(18, 19, 23, 0.90)',
        };
        history.execute(new AddShapeCommand(annotation));
        if (store) {
          store.setActiveTool('select');
          store.setSelectedObject(annotation.id);
        }
      }
    }

    this.closeInlineEditor();
  }

  closeInlineEditor() {
    if (this.activeEditor) {
      if (this.activeEditor.container && this.activeEditor.container.parentNode) {
        this.activeEditor.container.parentNode.removeChild(this.activeEditor.container);
      }
      this.activeEditor = null;
    }
  }
}

export class StampTool extends ToolInterface {
  constructor() {
    super('stamp', 'crosshair');
  }

  onPointerDown(e, point, store, docModel) {
    const { toolOptions } = store.getState();
    const currentNumber = toolOptions.stampCounter || 1;

    // Adapt default stamp size to document resolution so it is never microscopic on large/retina images
    const defaultSize = Math.max(32, Math.min(96, Math.round(docModel.width * 0.025)));
    const size = toolOptions.stampSize || defaultSize;

    const annotation = {
      id: `stamp_${Date.now()}`,
      type: 'stamp',
      x: point.x,
      y: point.y,
      number: currentNumber,
      color: toolOptions.color || '#EF4444',
      size: size,
      width: size,
      height: size,
    };

    history.execute(new AddShapeCommand(annotation));

    // Auto-increment bug report step stamp and store size
    store.setToolOption('stampCounter', currentNumber + 1);
    store.setToolOption('stampSize', size);
  }
}
