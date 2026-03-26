import { Toaster as Sonner, ToasterProps } from "sonner";

const Toaster = ({ ...props }: ToasterProps) => {
  return (
    <Sonner
      theme="light"
      className="toaster group"
      position="top-right"
      toastOptions={{
        classNames: {
          toast: "font-sans text-sm rounded-xl shadow-lg border",
          title: "font-semibold",
          description: "text-xs opacity-80 mt-0.5",
          success: "bg-green-500 text-white border-green-600 [&_[data-icon]]:text-white [&_[data-close-button]]:text-white/70",
          error: "bg-red-500 text-white border-red-600 [&_[data-icon]]:text-white [&_[data-close-button]]:text-white/70",
          warning: "bg-yellow-500 text-white border-yellow-600 [&_[data-icon]]:text-white [&_[data-close-button]]:text-white/70",
          info: "bg-blue-500 text-white border-blue-600 [&_[data-icon]]:text-white [&_[data-close-button]]:text-white/70",
          loading: "bg-white text-foreground border-border",
        },
      }}
      {...props}
    />
  );
};

export { Toaster };
