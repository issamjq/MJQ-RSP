import { useState } from 'react';
import { 
  Bold, 
  Italic, 
  Underline, 
  List, 
  ListOrdered, 
  Link, 
  Image, 
  Code, 
  Quote,
  Heading1,
  Heading2,
  AlignLeft,
  AlignCenter,
  AlignRight,
  X
} from 'lucide-react';
import { Button } from './ui/button';
import { Separator } from './ui/separator';
import { toast } from 'sonner';

interface EditorModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function EditorModal({ isOpen, onClose }: EditorModalProps) {
  const [content, setContent] = useState('');

  if (!isOpen) return null;

  const toolbarButtons = [
    { icon: Bold, label: 'Bold', action: () => toast.info('Bold formatting applied') },
    { icon: Italic, label: 'Italic', action: () => toast.info('Italic formatting applied') },
    { icon: Underline, label: 'Underline', action: () => toast.info('Underline formatting applied') },
    { separator: true },
    { icon: Heading1, label: 'Heading 1', action: () => toast.info('Heading 1 applied') },
    { icon: Heading2, label: 'Heading 2', action: () => toast.info('Heading 2 applied') },
    { separator: true },
    { icon: AlignLeft, label: 'Align Left', action: () => toast.info('Left alignment applied') },
    { icon: AlignCenter, label: 'Align Center', action: () => toast.info('Center alignment applied') },
    { icon: AlignRight, label: 'Align Right', action: () => toast.info('Right alignment applied') },
    { separator: true },
    { icon: List, label: 'Bullet List', action: () => toast.info('Bullet list created') },
    { icon: ListOrdered, label: 'Numbered List', action: () => toast.info('Numbered list created') },
    { separator: true },
    { icon: Link, label: 'Insert Link', action: () => toast.info('Link dialog opened') },
    { icon: Image, label: 'Insert Image', action: () => toast.info('Image upload opened') },
    { icon: Code, label: 'Code Block', action: () => toast.info('Code block inserted') },
    { icon: Quote, label: 'Quote', action: () => toast.info('Quote inserted') },
  ];

  return (
    <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-3xl shadow-2xl max-w-5xl w-full max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <div>
            <h2 className="text-lg text-gray-900">Description Editor</h2>
            <p className="text-xs text-gray-500">Create and format your content</p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="rounded-full hover:bg-gray-100"
          >
            <X className="w-5 h-5" />
          </Button>
        </div>

        {/* Toolbar */}
        <div className="px-4 py-3 border-b border-gray-200 bg-gray-50">
          <div className="flex items-center gap-1 flex-wrap">
            {toolbarButtons.map((button, index) => 
              button.separator ? (
                <Separator key={index} orientation="vertical" className="h-6 mx-1" />
              ) : (
                <Button
                  key={index}
                  variant="ghost"
                  size="sm"
                  onClick={button.action}
                  className="hover:bg-white rounded-lg p-2 h-8 w-8"
                  title={button.label}
                >
                  <button.icon className="w-4 h-4 text-gray-700" />
                </Button>
              )
            )}
          </div>
        </div>

        {/* Editor Area */}
        <div className="flex-1 p-6 overflow-y-auto">
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Start writing your content here..."
            className="w-full h-full min-h-[400px] border-0 outline-none resize-none text-gray-900 placeholder:text-gray-400"
            style={{ fontFamily: 'inherit' }}
          />
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 rounded-b-3xl flex items-center justify-between">
          <div className="text-xs text-gray-500">
            {content.length} characters • {content.split(/\s+/).filter(Boolean).length} words
          </div>
          <div className="flex gap-3">
            <Button variant="outline" onClick={onClose} className="rounded-xl">
              Cancel
            </Button>
            <Button 
              onClick={() => {
                toast.success('Content saved successfully!');
                onClose();
              }}
              className="bg-black text-white hover:bg-gray-800 rounded-xl"
            >
              Save Content
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
