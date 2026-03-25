import { Search, MessageSquare, Plus } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarGroup, AvatarImage } from './ui/avatar';
import { Button } from './ui/button';
import { Input } from './ui/input';
import exampleImage from 'figma:asset/23b50094b8ae22d455272390cc4909116f75fe89.png';

interface ChatHistoryItem {
  id: string;
  title: string;
  description: string;
  timestamp: string;
  thumbnail?: string;
  avatars: string[];
  isMultiUser?: boolean;
}

const chatHistory: ChatHistoryItem[] = [
  {
    id: '1',
    title: 'Visual exploration',
    description: 'Exploring visual styles, moods, a...',
    timestamp: '2h ago',
    avatars: [
      'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&h=100&fit=crop',
      'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop'
    ],
    isMultiUser: true
  },
  {
    id: '2',
    title: 'Image generation',
    description: 'Creating a futuristic portrait usin...',
    timestamp: '3h ago',
    thumbnail: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=400&h=300&fit=crop',
    avatars: [
      'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&h=100&fit=crop'
    ]
  },
  {
    id: '3',
    title: 'Team session',
    description: 'Collaborative prompt editing and...',
    timestamp: '3h ago',
    avatars: [
      'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&h=100&fit=crop',
      'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop',
      'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100&h=100&fit=crop'
    ],
    isMultiUser: true
  },
  {
    id: '4',
    title: 'Visualisation',
    description: 'Creating images from text prom...',
    timestamp: '5h ago',
    avatars: [
      'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&h=100&fit=crop'
    ]
  }
];

export function ChatHistory() {
  return (
    <div className="w-[340px] h-screen bg-white border-l border-gray-200 flex flex-col">
      {/* Header */}
      <div className="p-6 border-b border-gray-200 flex items-center justify-between">
        <h2 className="text-base">Chat history</h2>
        <button className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors">
          <MessageSquare className="w-4 h-4 text-gray-500" />
        </button>
      </div>

      {/* Search */}
      <div className="px-6 py-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input 
            placeholder="Search..." 
            className="pl-9 bg-gray-50 border-gray-200 rounded-lg"
          />
        </div>
      </div>

      {/* Chat List */}
      <div className="flex-1 overflow-y-auto px-4">
        <div className="space-y-2">
          {chatHistory.map((chat) => (
            <button
              key={chat.id}
              className="w-full p-3 rounded-xl hover:bg-gray-50 transition-colors text-left group"
            >
              <div className="flex items-start gap-3">
                <input 
                  type="checkbox" 
                  className="mt-1 rounded border-gray-300 text-black focus:ring-black"
                  onClick={(e) => e.stopPropagation()}
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <h3 className="text-sm text-gray-900">{chat.title}</h3>
                    <span className="text-xs text-gray-500 whitespace-nowrap">{chat.timestamp}</span>
                  </div>
                  <p className="text-xs text-gray-500 mb-2 truncate">{chat.description}</p>
                  
                  {/* Thumbnail */}
                  {chat.thumbnail && (
                    <div className="mb-2 rounded-lg overflow-hidden bg-gradient-to-br from-pink-200 via-purple-200 to-orange-200 h-32">
                      <img 
                        src={chat.thumbnail} 
                        alt={chat.title}
                        className="w-full h-full object-cover opacity-80"
                      />
                    </div>
                  )}
                  
                  {/* Avatars */}
                  <div className="flex -space-x-2">
                    {chat.avatars.map((avatar, index) => (
                      <Avatar key={index} className="w-6 h-6 border-2 border-white">
                        <AvatarImage src={avatar} />
                        <AvatarFallback>U</AvatarFallback>
                      </Avatar>
                    ))}
                  </div>
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Create New Chat Button */}
      <div className="p-4 border-t border-gray-200">
        <Button className="w-full bg-black text-white hover:bg-gray-800 rounded-xl flex items-center justify-center gap-2">
          <Plus className="w-4 h-4" />
          <span>Create new chat</span>
        </Button>
      </div>
    </div>
  );
}
