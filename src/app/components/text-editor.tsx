import { useState } from 'react';
import { Bold, Italic, Underline, List, ListOrdered, AlignLeft, AlignCenter, AlignRight, Link, Image, Code, Quote } from 'lucide-react';

export function TextEditor() {
  const [content, setContent] = useState('');

  const tools = [
    { icon: Bold, label: 'Bold', action: 'bold' },
    { icon: Italic, label: 'Italic', action: 'italic' },
    { icon: Underline, label: 'Underline', action: 'underline' },
    { type: 'separator' },
    { icon: AlignLeft, label: 'Align Left', action: 'justifyLeft' },
    { icon: AlignCenter, label: 'Align Center', action: 'justifyCenter' },
    { icon: AlignRight, label: 'Align Right', action: 'justifyRight' },
    { type: 'separator' },
    { icon: List, label: 'Bullet List', action: 'insertUnorderedList' },
    { icon: ListOrdered, label: 'Numbered List', action: 'insertOrderedList' },
    { type: 'separator' },
    { icon: Link, label: 'Insert Link', action: 'createLink' },
    { icon: Image, label: 'Insert Image', action: 'insertImage' },
    { type: 'separator' },
    { icon: Code, label: 'Code', action: 'formatBlock' },
    { icon: Quote, label: 'Quote', action: 'formatBlock' },
  ];

  const executeCommand = (command: string) => {
    document.execCommand(command, false);
  };

  return (
    <div className="bg-white rounded-xl border border-border shadow-sm overflow-hidden">
      {/* Toolbar */}
      <div className="flex items-center gap-1 p-2 border-b border-border bg-accent/30">
        {tools.map((tool, idx) => {
          if (tool.type === 'separator') {
            return <div key={idx} className="w-px h-6 bg-border mx-1" />;
          }
          
          const Icon = tool.icon!;
          return (
            <button
              key={idx}
              onClick={() => executeCommand(tool.action!)}
              className="p-2 hover:bg-accent rounded-lg transition-colors"
              title={tool.label}
            >
              <Icon className="w-4 h-4 text-muted-foreground" />
            </button>
          );
        })}
      </div>

      {/* Editor Area */}
      <div
        contentEditable
        className="min-h-[300px] p-4 outline-none prose prose-sm max-w-none"
        onInput={(e) => setContent(e.currentTarget.innerHTML)}
        suppressContentEditableWarning
      >
        <p className="text-muted-foreground">Start typing your content here...</p>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between p-3 border-t border-border bg-accent/20">
        <div className="text-xs text-muted-foreground">
          {content.replace(/<[^>]*>/g, '').length} characters
        </div>
        <div className="flex gap-2">
          <button className="px-3 py-1.5 text-xs border border-border rounded-lg hover:bg-accent transition-colors">
            Clear
          </button>
          <button className="px-3 py-1.5 text-xs bg-black text-white rounded-lg hover:bg-gray-800 transition-colors">
            Save
          </button>
        </div>
      </div>
    </div>
  );
}
