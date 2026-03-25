import { Settings, Globe, Moon, Sun, LogOut, Menu } from "lucide-react";
import { useState } from "react";
import { Button } from "./ui/button";
import { Avatar, AvatarFallback } from "./ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";
import { Language, t } from "../lib/i18n";
import { ProfileModal } from "./ProfileModal";
import { useAuth } from "../lib/AuthContext";
import { logout } from "../lib/firebase";

interface ModernTopbarProps {
  theme: "light" | "dark";
  language: Language;
  onThemeChange: (theme: "light" | "dark") => void;
  onLanguageChange: (language: Language) => void;
  onNavigateToSettings?: () => void;
  onNavigateToSubscription?: () => void;
  sidebarCollapsed: boolean;
  onMobileMenuToggle: () => void;
}

export function ModernTopbar({
  theme,
  language,
  onThemeChange,
  onLanguageChange,
  onNavigateToSettings,
  onNavigateToSubscription,
  sidebarCollapsed,
  onMobileMenuToggle,
}: ModernTopbarProps) {
  const [showProfileModal, setShowProfileModal] = useState(false);
  const { user } = useAuth();

  return (
    <>
      <div
        className={`fixed top-0 right-0 h-16 z-30 transition-all duration-300 border-b border-border backdrop-blur-xl left-0 md:${
          sidebarCollapsed ? "left-[72px]" : "left-[240px]"
        } dark:bg-gradient-to-r dark:from-[#12121C]/95 dark:to-[#0E0E18]/90 bg-gradient-to-r from-white/95 to-[#fafafa]/90`}
        style={{
          boxShadow: "0 1px 3px rgba(0, 0, 0, 0.05)"
        }}
      >
        <div className="h-full px-4 md:px-6 flex items-center justify-between gap-6">
          {/* Left: Hamburger (mobile) + Logo */}
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              className="md:hidden h-9 w-9 rounded-xl"
              onClick={onMobileMenuToggle}
            >
              <Menu className="h-5 w-5" />
            </Button>
            <svg width="38" height="38" viewBox="0 0 38 38" xmlns="http://www.w3.org/2000/svg">
              <rect x="0" y="0" width="38" height="38" rx="12" fill="#ffffff"/>
              <rect x="9" y="9" width="20" height="20" rx="8" fill="#ffffff" style={{filter: "drop-shadow(0px 4px 14px rgba(0,0,0,0.12))"}}/>
              <rect x="12" y="12" width="14" height="3.6" rx="2" fill="#6E76FF"/>
              <rect x="12" y="17" width="14" height="3.6" rx="2" fill="#A78BFA"/>
              <rect x="12" y="22" width="14" height="3.6" rx="2" fill="#111827"/>
            </svg>
          </div>

          {/* Right: Actions */}
          <div className="flex items-center gap-2">
            {/* Language Toggle */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-10 w-10 rounded-xl dark:hover:bg-surface-hover hover:bg-muted/50"
                >
                  <Globe className="h-5 w-5 dark:text-muted-foreground text-muted-foreground" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent 
                align="end" 
                className="w-48 dark:bg-popover bg-popover dark:border-border border-border rounded-xl"
              >
                <DropdownMenuLabel className="dark:text-foreground text-foreground">
                  {t(language, "topbar.language")}
                </DropdownMenuLabel>
                <DropdownMenuSeparator className="dark:bg-border bg-border" />
                <DropdownMenuItem 
                  onClick={() => onLanguageChange("en")}
                  className={`rounded-lg ${language === "en" ? "dark:bg-primary/15 bg-primary/10 dark:text-primary text-primary" : ""}`}
                >
                  English (GB)
                </DropdownMenuItem>
                <DropdownMenuItem 
                  onClick={() => onLanguageChange("fr")}
                  className={`rounded-lg ${language === "fr" ? "dark:bg-primary/15 bg-primary/10 dark:text-primary text-primary" : ""}`}
                >
                  Français (FR)
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Theme Toggle */}
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={() => onThemeChange(theme === "dark" ? "light" : "dark")}
              className="h-10 w-10 rounded-xl dark:hover:bg-surface-hover hover:bg-muted/50"
            >
              {theme === "dark" ? (
                <Sun className="h-5 w-5 dark:text-muted-foreground text-muted-foreground" />
              ) : (
                <Moon className="h-5 w-5 dark:text-muted-foreground text-muted-foreground" />
              )}
            </Button>

            {/* Settings Quick Access */}
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={onNavigateToSettings}
              className="h-10 w-10 rounded-xl dark:hover:bg-surface-hover hover:bg-muted/50"
            >
              <Settings className="h-5 w-5 dark:text-muted-foreground text-muted-foreground" />
            </Button>

            {/* Account Button - shows Google photo + name */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  className="h-10 pl-2 pr-3 rounded-xl dark:hover:bg-surface-hover hover:bg-muted/50 gap-2"
                >
                  <Avatar className="h-7 w-7">
                    {user?.photoURL
                      ? <img src={user.photoURL} alt="" className="h-7 w-7 rounded-full object-cover" referrerPolicy="no-referrer" />
                      : <AvatarFallback className="dark:bg-primary bg-primary dark:text-white text-white text-xs font-semibold">
                          {user?.displayName?.[0]?.toUpperCase() ?? "U"}
                        </AvatarFallback>
                    }
                  </Avatar>
                  <span className="text-sm font-medium dark:text-foreground text-foreground hidden md:inline max-w-[120px] truncate">
                    {user?.displayName ?? t(language, "topbar.account")}
                  </span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-52 rounded-xl dark:bg-popover bg-popover dark:border-border border-border">
                <DropdownMenuLabel className="text-xs dark:text-muted-foreground text-muted-foreground font-normal truncate">
                  {user?.email}
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={logout} className="rounded-lg text-red-500 dark:text-red-400 focus:text-red-500 gap-2">
                  <LogOut className="h-4 w-4" />
                  Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>

      {/* Profile Modal */}
      <ProfileModal
        open={showProfileModal}
        onOpenChange={setShowProfileModal}
        language={language}
        onLanguageChange={onLanguageChange}
        onNavigateToSubscription={onNavigateToSubscription}
      />
    </>
  );
}