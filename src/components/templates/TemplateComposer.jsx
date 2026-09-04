import { useLayoutEffect, useRef } from 'react';
import { TEMPLATE_VARIABLES, parseTemplateContent, templateVariableLabel } from '@/lib/templateVariables';

function tokenNode(value) {
  const node = document.createElement('span');
  node.dataset.templateVariable = value;
  node.contentEditable = 'false';
  node.className = 'mx-0.5 inline-flex min-h-8 select-all items-center rounded-lg bg-[#EAF0FF] px-2 align-middle text-[15px] font-semibold text-[#004AFE]';
  node.textContent = templateVariableLabel(value);
  return node;
}

function renderValue(editor, value) {
  const fragment = document.createDocumentFragment();
  for (const segment of parseTemplateContent(value)) {
    fragment.append(segment.type === 'variable' ? tokenNode(segment.value) : document.createTextNode(segment.value));
  }
  editor.replaceChildren(fragment);
}

function serializeNode(node) {
  if (node.nodeType === Node.TEXT_NODE) return node.textContent || '';
  if (node instanceof HTMLElement && node.dataset.templateVariable) return node.dataset.templateVariable;
  if (node instanceof HTMLBRElement) return '\n';
  const content = [...node.childNodes].map(serializeNode).join('');
  return node instanceof HTMLDivElement ? `${content}\n` : content;
}

function readValue(editor) {
  return [...editor.childNodes].map(serializeNode).join('').replace(/\n$/, '');
}

function insertNodeAtCaret(editor, node) {
  editor.focus();
  const selection = window.getSelection();
  if (!selection?.rangeCount || !editor.contains(selection.anchorNode)) {
    editor.append(node);
    editor.append(document.createTextNode(' '));
    const range = document.createRange();
    range.selectNodeContents(editor);
    range.collapse(false);
    selection?.removeAllRanges();
    selection?.addRange(range);
    return;
  }
  const range = selection.getRangeAt(0);
  range.deleteContents();
  range.insertNode(node);
  const spacer = document.createTextNode(' ');
  node.after(spacer);
  range.setStartAfter(spacer);
  range.collapse(true);
  selection.removeAllRanges();
  selection.addRange(range);
}

export default function TemplateComposer({ id, value, onChange, describedBy }) {
  const editorRef = useRef(null);

  useLayoutEffect(() => {
    const editor = editorRef.current;
    if (editor && readValue(editor) !== value) renderValue(editor, value);
  }, [value]);

  const emitChange = () => onChange(readValue(editorRef.current));

  const insertVariable = variable => {
    insertNodeAtCaret(editorRef.current, tokenNode(variable));
    emitChange();
  };

  const pastePlainText = event => {
    event.preventDefault();
    insertNodeAtCaret(editorRef.current, document.createTextNode(event.clipboardData.getData('text/plain')));
    emitChange();
  };

  return (
    <div>
      <div
        id={id}
        ref={editorRef}
        contentEditable
        role="textbox"
        aria-multiline="true"
        aria-describedby={describedBy}
        data-placeholder="Escribe el mensaje aquí…"
        onInput={emitChange}
        onBlur={emitChange}
        onPaste={pastePlainText}
        suppressContentEditableWarning
        className="min-h-44 whitespace-pre-wrap rounded-2xl border border-input bg-white px-4 py-3 text-[17px] leading-7 shadow-sm outline-none empty:before:pointer-events-none empty:before:text-muted-foreground empty:before:content-[attr(data-placeholder)] focus:border-[#004AFE] focus:ring-2 focus:ring-[#004AFE]/20"
      />
      <p id={describedBy} className="mt-3 text-[15px] leading-6 text-[#64748B]">
        Las variables se cambian automáticamente por los datos de cada contacto.
      </p>
      <div className="mt-3 flex flex-wrap gap-2" aria-label="Agregar variable">
        {TEMPLATE_VARIABLES.map(variable => (
          <button
            key={variable.value}
            type="button"
            onMouseDown={event => event.preventDefault()}
            onClick={() => insertVariable(variable.value)}
            className="min-h-12 rounded-xl border border-[#BFD0FF] bg-[#F5F8FF] px-4 text-[15px] font-semibold text-[#004AFE] active:scale-[0.98]"
          >
            + {variable.label}
          </button>
        ))}
      </div>
    </div>
  );
}
