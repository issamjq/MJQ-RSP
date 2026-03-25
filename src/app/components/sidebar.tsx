import { Home, Layers, Users, FolderOpen, Library, Bell, Settings, ChevronDown, Sparkles, Wand2 } from 'lucide-react';
import { Badge } from './ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { Button } from './ui/button';
import { useState } from 'react';

export function Sidebar() {
  const [isAIToolsOpen, setIsAIToolsOpen] = useState(true);

  const mainNavItems = [
    { icon: Home, label: 'Home', active: true },
    { icon: Layers, label: 'Studio' },
    { icon: Users, label: 'Community' },
    { icon: FolderOpen, label: 'Collections' },
    { icon: Library, label: 'Library' },
    { icon: Bell, label: 'Notifications', badge: 6 },
    { icon: Settings, label: 'Settings' },
  ];

  const aiTools = [
    { icon: Sparkles, label: 'Style builder' },
    { icon: Wand2, label: 'Prompt assist' },
  ];

  return (
    <div className="w-[220px] h-screen bg-white border-r border-gray-200 flex flex-col">
      {/* Logo */}
      <div className="p-6 flex items-center gap-2">
        <div className="w-6 h-6 bg-black rounded-md flex items-center justify-center">
          <div className="w-4 h-4 bg-white rounded-full" style={{ 
            WebkitMaskImage: 'radial-gradient(circle at 30% 30%, transparent 35%, black 35%)', 
            maskImage: 'radial-gradient(circle at 30% 30%, transparent 35%, black 35%)' 
          }}></div>
        </div>
        <span className="text-base tracking-wide">SETO</span>
      </div>

      {/* Main Navigation */}
      <nav className="flex-1 px-3">
        <ul className="space-y-1">
          {mainNavItems.map((item) => (
            <li key={item.label}>
              <button
                className={`
                  w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors
                  ${item.active 
                    ? 'bg-gray-100 text-gray-900' 
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                  }
                `}
              >
                <item.icon className="w-4 h-4" />
                <span className="flex-1 text-left">{item.label}</span>
                {item.badge && (
                  <Badge className="bg-black text-white h-5 min-w-[20px] flex items-center justify-center rounded-full px-1.5">
                    {item.badge}
                  </Badge>
                )}
              </button>
            </li>
          ))}
        </ul>

        {/* AI Tools Section */}
        <div className="mt-6">
          <button
            onClick={() => setIsAIToolsOpen(!isAIToolsOpen)}
            className="w-full flex items-center justify-between px-3 py-2 text-sm text-gray-900 hover:bg-gray-50 rounded-lg transition-colors"
          >
            <span>AI tools</span>
            <ChevronDown 
              className={`w-4 h-4 transition-transform ${isAIToolsOpen ? 'rotate-180' : ''}`} 
            />
          </button>
          
          {isAIToolsOpen && (
            <ul className="mt-1 space-y-1">
              {aiTools.map((tool) => (
                <li key={tool.label}>
                  <button className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-gray-600 hover:bg-gray-50 hover:text-gray-900 transition-colors">
                    <tool.icon className="w-4 h-4" />
                    <span>{tool.label}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </nav>

      {/* User Profile */}
      <div className="p-4 border-t border-gray-200 bg-gradient-to-br from-gray-100 to-gray-200 rounded-t-2xl">
        <div className="flex items-center gap-3 mb-3">
          <Avatar className="w-10 h-10">
            <AvatarImage src="https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&h=100&fit=crop" />
            <AvatarFallback>AL</AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <div className="text-sm text-gray-900 truncate">Allison Lipshutz</div>
            <div className="text-xs text-gray-600 truncate">@allison_4_1</div>
          </div>
        </div>
        <Button className="w-full bg-black text-white hover:bg-gray-800 rounded-lg flex items-center justify-center gap-2">
          <Sparkles className="w-4 h-4" />
          <span>Upgrade Now</span>
        </Button>
      </div>
    </div>
  );
}
