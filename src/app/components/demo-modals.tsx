import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { AlertCircle, CheckCircle2, Info, XCircle, MessageSquare, Image as ImageIcon, FileText } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from './ui/alert';
import { toast } from 'sonner';

export function DemoModals() {
  const [isGenerateOpen, setIsGenerateOpen] = useState(false);

  const showSuccessToast = () => {
    toast.success('Success!', {
      description: 'Your action completed successfully.',
      icon: <CheckCircle2 className="w-5 h-5" />,
    });
  };

  const showErrorToast = () => {
    toast.error('Error occurred!', {
      description: 'Something went wrong. Please try again.',
      icon: <XCircle className="w-5 h-5" />,
    });
  };

  const showInfoToast = () => {
    toast.info('Information', {
      description: 'Here is some helpful information for you.',
      icon: <Info className="w-5 h-5" />,
    });
  };

  const showWarningToast = () => {
    toast.warning('Warning!', {
      description: 'Please review before continuing.',
      icon: <AlertCircle className="w-5 h-5" />,
    });
  };

  return (
    <div className="fixed bottom-6 right-6 z-50">
      <div className="bg-white rounded-2xl border border-gray-200 shadow-lg p-4 max-w-xs">
        <h3 className="text-sm mb-3 text-gray-900">Demo Components</h3>
        
        <div className="space-y-2">
          {/* Modal Trigger */}
          <Dialog open={isGenerateOpen} onOpenChange={setIsGenerateOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" className="w-full justify-start gap-2 text-sm">
                <MessageSquare className="w-4 h-4" />
                Open Modal
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px] rounded-2xl">
              <DialogHeader>
                <DialogTitle>Generate New Visual</DialogTitle>
                <DialogDescription>
                  Create stunning visuals from your text descriptions. Describe what you want to see.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="prompt">Prompt</Label>
                  <Textarea
                    id="prompt"
                    placeholder="Describe your vision in detail..."
                    className="min-h-[120px] rounded-lg"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="style">Style</Label>
                    <Input id="style" placeholder="e.g., Realistic" className="rounded-lg" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="ratio">Aspect Ratio</Label>
                    <Input id="ratio" placeholder="e.g., 16:9" className="rounded-lg" />
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsGenerateOpen(false)} className="rounded-lg">
                  Cancel
                </Button>
                <Button 
                  onClick={() => {
                    setIsGenerateOpen(false);
                    showSuccessToast();
                  }}
                  className="bg-black text-white hover:bg-gray-800 rounded-lg"
                >
                  Generate
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Toast Demos */}
          <Button 
            variant="outline" 
            className="w-full justify-start gap-2 text-sm"
            onClick={showSuccessToast}
          >
            <CheckCircle2 className="w-4 h-4 text-green-600" />
            Success Toast
          </Button>
          
          <Button 
            variant="outline" 
            className="w-full justify-start gap-2 text-sm"
            onClick={showErrorToast}
          >
            <XCircle className="w-4 h-4 text-red-600" />
            Error Toast
          </Button>
          
          <Button 
            variant="outline" 
            className="w-full justify-start gap-2 text-sm"
            onClick={showInfoToast}
          >
            <Info className="w-4 h-4 text-blue-600" />
            Info Toast
          </Button>
          
          <Button 
            variant="outline" 
            className="w-full justify-start gap-2 text-sm"
            onClick={showWarningToast}
          >
            <AlertCircle className="w-4 h-4 text-amber-600" />
            Warning Toast
          </Button>
        </div>

        {/* Sample Alerts */}
        <div className="mt-4 space-y-2">
          <Alert className="rounded-lg border-green-200 bg-green-50">
            <CheckCircle2 className="h-4 w-4 text-green-600" />
            <AlertTitle className="text-green-900">Success</AlertTitle>
            <AlertDescription className="text-green-700 text-xs">
              Action completed successfully!
            </AlertDescription>
          </Alert>
          
          <Alert className="rounded-lg border-blue-200 bg-blue-50">
            <Info className="h-4 w-4 text-blue-600" />
            <AlertTitle className="text-blue-900">Info</AlertTitle>
            <AlertDescription className="text-blue-700 text-xs">
              Here's some helpful information.
            </AlertDescription>
          </Alert>
        </div>
      </div>
    </div>
  );
}
