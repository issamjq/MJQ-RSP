import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from './ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from './ui/alert-dialog';
import { Alert, AlertDescription, AlertTitle } from './ui/alert';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { Switch } from './ui/switch';
import { Checkbox } from './ui/checkbox';
import { RadioGroup, RadioGroupItem } from './ui/radio-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Badge } from './ui/badge';
import { Progress } from './ui/progress';
import { Separator } from './ui/separator';
import { toast } from 'sonner';
import { Info, AlertTriangle, CheckCircle2, XCircle, Sparkles, Home, ArrowLeft } from 'lucide-react';
import { Link } from 'react-router';
import { TextEditor } from './text-editor';
import { LoadingExamples } from './loading-examples';

export function ComponentsDemo() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [alertDialogOpen, setAlertDialogOpen] = useState(false);
  const [progress, setProgress] = useState(45);

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#CBAE64]/20 via-[#d4b86f]/20 to-[#ddc37a]/20">
      {/* Header */}
      <div className="bg-white border-b border-border/60 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link to="/" className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors">
              <ArrowLeft className="w-4 h-4" />
              <span className="text-sm">Back to App</span>
            </Link>
            <Separator orientation="vertical" className="h-6" />
            <h1 className="text-xl font-semibold">UI Components Showcase</h1>
          </div>
          <Badge variant="outline" className="text-xs">2026 Design System</Badge>
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-6 space-y-8">
        {/* Alerts Section */}
        <section>
          <h2 className="text-2xl font-semibold mb-4">Alerts</h2>
          <div className="grid gap-4">
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
                You are approaching your monthly generation limit. Consider upgrading.
              </AlertDescription>
            </Alert>
          </div>
        </section>

        {/* Toasts Section */}
        <section>
          <h2 className="text-2xl font-semibold mb-4">Toast Notifications</h2>
          <div className="flex flex-wrap gap-3">
            <Button
              onClick={() => toast.success('Success!', { description: 'Your action completed successfully.' })}
              className="bg-green-500 hover:bg-green-600"
            >
              Success Toast
            </Button>

            <Button
              onClick={() => toast.error('Error!', { description: 'Something went wrong.' })}
              variant="destructive"
            >
              Error Toast
            </Button>

            <Button
              onClick={() => toast.info('Info', { description: 'Here is some helpful information.' })}
              className="bg-blue-500 hover:bg-blue-600"
            >
              Info Toast
            </Button>

            <Button
              onClick={() => toast.warning('Warning', { description: 'Please proceed with caution.' })}
              className="bg-yellow-500 hover:bg-yellow-600"
            >
              Warning Toast
            </Button>

            <Button
              onClick={() => toast.loading('Processing...', { description: 'Please wait.' })}
              variant="outline"
            >
              Loading Toast
            </Button>

            <Button
              onClick={() => {
                toast('Custom Toast', {
                  description: 'With action button',
                  action: {
                    label: 'Undo',
                    onClick: () => toast.info('Action undone!'),
                  },
                });
              }}
              className="bg-purple-500 hover:bg-purple-600"
            >
              Toast with Action
            </Button>
          </div>
        </section>

        {/* Modals Section */}
        <section>
          <h2 className="text-2xl font-semibold mb-4">Modals & Dialogs</h2>
          <div className="flex gap-3">
            <Button onClick={() => setDialogOpen(true)}>
              <Sparkles className="w-4 h-4 mr-2" />
              Open Dialog
            </Button>
            <Button onClick={() => setAlertDialogOpen(true)} variant="destructive">
              <AlertTriangle className="w-4 h-4 mr-2" />
              Open Alert Dialog
            </Button>
          </div>
        </section>

        {/* Cards Section */}
        <section>
          <h2 className="text-2xl font-semibold mb-4">Cards</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Visual Generation</CardTitle>
                <CardDescription>Create stunning AI-powered images</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Transform your text prompts into beautiful visual content using advanced AI models.
                </p>
              </CardContent>
              <CardFooter>
                <Button className="w-full">Get Started</Button>
              </CardFooter>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Style Transfer</CardTitle>
                <CardDescription>Apply artistic styles to images</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Give your images a unique look by applying various artistic styles and filters.
                </p>
              </CardContent>
              <CardFooter>
                <Button variant="outline" className="w-full">Learn More</Button>
              </CardFooter>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Team Collaboration</CardTitle>
                <CardDescription>Work together seamlessly</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Share projects, collaborate in real-time, and build amazing things together.
                </p>
              </CardContent>
              <CardFooter>
                <Button variant="secondary" className="w-full">Invite Team</Button>
              </CardFooter>
            </Card>
          </div>
        </section>

        {/* Form Elements */}
        <section>
          <h2 className="text-2xl font-semibold mb-4">Form Elements</h2>
          <Card>
            <CardHeader>
              <CardTitle>User Settings</CardTitle>
              <CardDescription>Configure your preferences</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="name">Name</Label>
                <Input id="name" placeholder="Enter your name" />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" placeholder="your.email@example.com" />
              </div>

              <div className="space-y-2">
                <Label htmlFor="bio">Bio</Label>
                <Textarea id="bio" placeholder="Tell us about yourself" />
              </div>

              <div className="space-y-2">
                <Label htmlFor="role">Role</Label>
                <Select>
                  <SelectTrigger id="role">
                    <SelectValue placeholder="Select your role" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="designer">Designer</SelectItem>
                    <SelectItem value="developer">Developer</SelectItem>
                    <SelectItem value="manager">Manager</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label htmlFor="notifications">Email notifications</Label>
                  <Switch id="notifications" />
                </div>

                <div className="flex items-center justify-between">
                  <Label htmlFor="marketing">Marketing emails</Label>
                  <Switch id="marketing" />
                </div>
              </div>

              <div className="space-y-3">
                <Label>Preferences</Label>
                <div className="flex items-center space-x-2">
                  <Checkbox id="newsletter" />
                  <label htmlFor="newsletter" className="text-sm">Subscribe to newsletter</label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox id="updates" />
                  <label htmlFor="updates" className="text-sm">Receive product updates</label>
                </div>
              </div>

              <div className="space-y-3">
                <Label>Notification method</Label>
                <RadioGroup defaultValue="email">
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="email" id="r1" />
                    <Label htmlFor="r1">Email</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="sms" id="r2" />
                    <Label htmlFor="r2">SMS</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="push" id="r3" />
                    <Label htmlFor="r3">Push notification</Label>
                  </div>
                </RadioGroup>
              </div>
            </CardContent>
            <CardFooter className="flex justify-between">
              <Button variant="outline">Cancel</Button>
              <Button>Save Changes</Button>
            </CardFooter>
          </Card>
        </section>

        {/* Tabs */}
        <section>
          <h2 className="text-2xl font-semibold mb-4">Tabs</h2>
          <Tabs defaultValue="overview" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="analytics">Analytics</TabsTrigger>
              <TabsTrigger value="settings">Settings</TabsTrigger>
            </TabsList>
            <TabsContent value="overview" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Project Overview</CardTitle>
                  <CardDescription>Your project statistics and recent activity</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div>
                      <div className="flex justify-between mb-2">
                        <span className="text-sm">Storage Used</span>
                        <span className="text-sm font-medium">45%</span>
                      </div>
                      <Progress value={45} />
                    </div>
                    <div className="grid grid-cols-3 gap-4 mt-4">
                      <div className="text-center p-4 bg-accent/50 rounded-lg">
                        <div className="text-2xl font-semibold">24</div>
                        <div className="text-xs text-muted-foreground">Projects</div>
                      </div>
                      <div className="text-center p-4 bg-accent/50 rounded-lg">
                        <div className="text-2xl font-semibold">156</div>
                        <div className="text-xs text-muted-foreground">Images</div>
                      </div>
                      <div className="text-center p-4 bg-accent/50 rounded-lg">
                        <div className="text-2xl font-semibold">8</div>
                        <div className="text-xs text-muted-foreground">Team Members</div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
            <TabsContent value="analytics">
              <Card>
                <CardHeader>
                  <CardTitle>Analytics</CardTitle>
                  <CardDescription>Detailed insights into your usage</CardDescription>
                </CardHeader>
                <CardContent className="space-y-2">
                  <p className="text-sm text-muted-foreground">
                    Analytics data would be displayed here, including charts and detailed metrics.
                  </p>
                </CardContent>
              </Card>
            </TabsContent>
            <TabsContent value="settings">
              <Card>
                <CardHeader>
                  <CardTitle>Settings</CardTitle>
                  <CardDescription>Manage your preferences</CardDescription>
                </CardHeader>
                <CardContent className="space-y-2">
                  <p className="text-sm text-muted-foreground">
                    Settings and configuration options would be displayed here.
                  </p>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </section>

        {/* Badges & Progress */}
        <section>
          <h2 className="text-2xl font-semibold mb-4">Badges & Progress</h2>
          <Card>
            <CardHeader>
              <CardTitle>Status Indicators</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-wrap gap-2">
                <Badge>Default</Badge>
                <Badge variant="secondary">Secondary</Badge>
                <Badge variant="outline">Outline</Badge>
                <Badge variant="destructive">Destructive</Badge>
                <Badge className="bg-green-500">Success</Badge>
                <Badge className="bg-yellow-500">Warning</Badge>
                <Badge className="bg-blue-500">Info</Badge>
              </div>

              <Separator />

              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Upload Progress</span>
                  <span>{progress}%</span>
                </div>
                <Progress value={progress} />
                <div className="flex gap-2 mt-2">
                  <Button size="sm" onClick={() => setProgress(Math.min(100, progress + 10))}>
                    +10%
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => setProgress(Math.max(0, progress - 10))}>
                    -10%
                  </Button>
                  <Button size="sm" variant="secondary" onClick={() => setProgress(0)}>
                    Reset
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </section>

        {/* Buttons */}
        <section>
          <h2 className="text-2xl font-semibold mb-4">Buttons</h2>
          <Card>
            <CardHeader>
              <CardTitle>Button Variants</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-wrap gap-2">
                <Button>Default</Button>
                <Button variant="secondary">Secondary</Button>
                <Button variant="outline">Outline</Button>
                <Button variant="ghost">Ghost</Button>
                <Button variant="link">Link</Button>
                <Button variant="destructive">Destructive</Button>
              </div>

              <Separator />

              <div className="flex flex-wrap gap-2 items-center">
                <Button size="sm">Small</Button>
                <Button size="default">Default</Button>
                <Button size="lg">Large</Button>
                <Button size="icon">
                  <Sparkles className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        </section>

        {/* Text Editor */}
        <section>
          <h2 className="text-2xl font-semibold mb-4">Rich Text Editor</h2>
          <TextEditor />
        </section>

        {/* Loading States */}
        <section>
          <h2 className="text-2xl font-semibold mb-4">Loading States</h2>
          <LoadingExamples />
        </section>
      </div>

      {/* Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Generate Visual Content</DialogTitle>
            <DialogDescription>
              Configure your AI-powered image generation settings.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="prompt">Prompt</Label>
              <Textarea 
                id="prompt"
                placeholder="Describe the image you want to generate..."
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="style">Style</Label>
                <Select>
                  <SelectTrigger id="style">
                    <SelectValue placeholder="Select style" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="realistic">Realistic</SelectItem>
                    <SelectItem value="artistic">Artistic</SelectItem>
                    <SelectItem value="abstract">Abstract</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="quality">Quality</Label>
                <Select>
                  <SelectTrigger id="quality">
                    <SelectValue placeholder="Select quality" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="standard">Standard</SelectItem>
                    <SelectItem value="hd">HD</SelectItem>
                    <SelectItem value="4k">4K</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={() => {
              setDialogOpen(false);
              toast.success('Image generation started!', {
                description: 'Your visual content is being created.',
              });
            }}>
              <Sparkles className="w-4 h-4 mr-2" />
              Generate
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Alert Dialog */}
      <AlertDialog open={alertDialogOpen} onOpenChange={setAlertDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Chat History?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete your chat history.
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
    </div>
  );
}