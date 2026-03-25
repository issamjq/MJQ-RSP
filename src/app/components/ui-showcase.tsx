import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from './ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from './ui/alert-dialog';
import { Alert, AlertDescription, AlertTitle } from './ui/alert';
import { toast } from 'sonner';
import { Info, AlertTriangle, CheckCircle2, XCircle, Sparkles, Loader2 } from 'lucide-react';

export function UIShowcase() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [alertDialogOpen, setAlertDialogOpen] = useState(false);

  return (
    <>
      {/* Demo Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Generate Visual Content</DialogTitle>
            <DialogDescription>
              Configure your AI-powered image generation settings to create stunning visuals.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Prompt</label>
              <textarea 
                className="w-full min-h-[100px] px-3 py-2 rounded-lg border border-border bg-white resize-none focus:outline-none focus:ring-2 focus:ring-ring"
                placeholder="Describe the image you want to generate..."
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Style</label>
                <select className="w-full px-3 py-2 rounded-lg border border-border bg-white focus:outline-none focus:ring-2 focus:ring-ring">
                  <option>Realistic</option>
                  <option>Artistic</option>
                  <option>Abstract</option>
                  <option>Minimalist</option>
                </select>
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-medium">Quality</label>
                <select className="w-full px-3 py-2 rounded-lg border border-border bg-white focus:outline-none focus:ring-2 focus:ring-ring">
                  <option>Standard</option>
                  <option>HD</option>
                  <option>4K</option>
                </select>
              </div>
            </div>
          </div>

          <DialogFooter>
            <button
              onClick={() => setDialogOpen(false)}
              className="px-4 py-2 rounded-lg border border-border hover:bg-accent transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={() => {
                setDialogOpen(false);
                toast.success('Image generation started!', {
                  description: 'Your visual content is being created.',
                });
              }}
              className="px-4 py-2 bg-black text-white rounded-lg hover:bg-gray-800 transition-colors flex items-center gap-2"
            >
              <Sparkles className="w-4 h-4" />
              Generate
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Demo Alert Dialog */}
      <AlertDialog open={alertDialogOpen} onOpenChange={setAlertDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Chat History?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete your chat history and remove all associated data.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                toast.error('Chat history deleted', {
                  description: 'Your conversation has been removed.',
                });
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

export function DemoAlerts() {
  return (
    <div className="space-y-4 p-6">
      <Alert>
        <Info className="h-4 w-4" />
        <AlertTitle>Information</AlertTitle>
        <AlertDescription>
          Your session will expire in 10 minutes. Please save your work.
        </AlertDescription>
      </Alert>

      <Alert variant="destructive">
        <AlertTriangle className="h-4 w-4" />
        <AlertTitle>Error</AlertTitle>
        <AlertDescription>
          Failed to generate image. Please try again or contact support.
        </AlertDescription>
      </Alert>

      <Alert className="border-green-200 bg-green-50 text-green-900">
        <CheckCircle2 className="h-4 w-4 text-green-600" />
        <AlertTitle>Success</AlertTitle>
        <AlertDescription>
          Your image has been generated successfully and saved to your library.
        </AlertDescription>
      </Alert>

      <Alert className="border-yellow-200 bg-yellow-50 text-yellow-900">
        <AlertTriangle className="h-4 w-4 text-yellow-600" />
        <AlertTitle>Warning</AlertTitle>
        <AlertDescription>
          You are approaching your monthly generation limit. Consider upgrading your plan.
        </AlertDescription>
      </Alert>
    </div>
  );
}

export function DemoToasts() {
  return (
    <div className="flex flex-wrap gap-3 p-6">
      <button
        onClick={() => toast.success('Success!', { description: 'Your action completed successfully.' })}
        className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors"
      >
        Success Toast
      </button>

      <button
        onClick={() => toast.error('Error!', { description: 'Something went wrong. Please try again.' })}
        className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
      >
        Error Toast
      </button>

      <button
        onClick={() => toast.info('Info', { description: 'Here is some helpful information.' })}
        className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
      >
        Info Toast
      </button>

      <button
        onClick={() => toast.warning('Warning', { description: 'Please proceed with caution.' })}
        className="px-4 py-2 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 transition-colors"
      >
        Warning Toast
      </button>

      <button
        onClick={() => toast.loading('Processing...', { description: 'Please wait while we complete your request.' })}
        className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors"
      >
        Loading Toast
      </button>

      <button
        onClick={() => {
          const promise = new Promise((resolve) => setTimeout(resolve, 2000));
          toast.promise(promise, {
            loading: 'Generating image...',
            success: 'Image generated successfully!',
            error: 'Failed to generate image',
          });
        }}
        className="px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors"
      >
        Promise Toast
      </button>

      <button
        onClick={() => {
          toast('Custom Toast', {
            description: 'This is a custom styled toast notification.',
            action: {
              label: 'Undo',
              onClick: () => toast.info('Action undone!'),
            },
          });
        }}
        className="px-4 py-2 bg-indigo-500 text-white rounded-lg hover:bg-indigo-600 transition-colors"
      >
        Toast with Action
      </button>
    </div>
  );
}
