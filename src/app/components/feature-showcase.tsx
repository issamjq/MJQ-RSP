import { useState } from 'react';
import { X, Zap, Shield, Globe, Sparkles, TrendingUp, Users } from 'lucide-react';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Card } from './ui/card';

interface Feature {
  icon: any;
  title: string;
  description: string;
  color: string;
  bgColor: string;
}

const features: Feature[] = [
  {
    icon: Zap,
    title: 'Lightning Fast',
    description: 'Process requests in milliseconds with our optimized AI engine',
    color: 'text-amber-600',
    bgColor: 'bg-amber-50'
  },
  {
    icon: Shield,
    title: 'Secure & Private',
    description: 'Enterprise-grade security with end-to-end encryption',
    color: 'text-blue-600',
    bgColor: 'bg-blue-50'
  },
  {
    icon: Globe,
    title: 'Global Access',
    description: 'Available worldwide with 99.9% uptime guarantee',
    color: 'text-green-600',
    bgColor: 'bg-green-50'
  },
  {
    icon: Sparkles,
    title: 'AI Powered',
    description: 'Advanced machine learning for intelligent results',
    color: 'text-purple-600',
    bgColor: 'bg-purple-50'
  },
  {
    icon: TrendingUp,
    title: 'Analytics',
    description: 'Deep insights into your usage and performance metrics',
    color: 'text-pink-600',
    bgColor: 'bg-pink-50'
  },
  {
    icon: Users,
    title: 'Collaboration',
    description: 'Work together seamlessly with your team in real-time',
    color: 'text-indigo-600',
    bgColor: 'bg-indigo-50'
  }
];

export function FeatureShowcase() {
  const [isVisible, setIsVisible] = useState(true);

  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 bg-black/20 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-3xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 px-8 py-6 rounded-t-3xl flex items-center justify-between z-10">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <h2 className="text-2xl text-gray-900">Platform Features</h2>
              <Badge className="bg-gradient-to-r from-purple-500 to-pink-500 text-white border-0">
                New
              </Badge>
            </div>
            <p className="text-sm text-gray-500">Discover what makes our platform powerful</p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsVisible(false)}
            className="rounded-full hover:bg-gray-100"
          >
            <X className="w-5 h-5" />
          </Button>
        </div>

        {/* Content */}
        <div className="p-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {features.map((feature, index) => (
              <Card
                key={index}
                className="p-6 border-2 border-gray-100 hover:border-gray-200 rounded-2xl transition-all duration-200 hover:shadow-lg group cursor-pointer"
              >
                <div className={`w-12 h-12 ${feature.bgColor} rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
                  <feature.icon className={`w-6 h-6 ${feature.color}`} />
                </div>
                <h3 className="text-base mb-2 text-gray-900">{feature.title}</h3>
                <p className="text-sm text-gray-500 leading-relaxed">{feature.description}</p>
              </Card>
            ))}
          </div>

          {/* CTA Section */}
          <div className="mt-8 bg-gradient-to-br from-gray-900 to-gray-800 rounded-2xl p-8 text-center text-white">
            <Sparkles className="w-12 h-12 mx-auto mb-4 text-amber-400" />
            <h3 className="text-xl mb-2">Ready to get started?</h3>
            <p className="text-gray-300 text-sm mb-6">
              Join thousands of users who are already creating amazing content
            </p>
            <div className="flex gap-3 justify-center">
              <Button className="bg-white text-gray-900 hover:bg-gray-100 rounded-xl">
                Start Free Trial
              </Button>
              <Button variant="outline" className="border-white text-white hover:bg-white/10 rounded-xl">
                Learn More
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
