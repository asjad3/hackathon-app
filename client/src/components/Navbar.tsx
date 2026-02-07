import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Link, useLocation } from "wouter";
import { LogOut, Terminal } from "lucide-react";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

export function Navbar() {
    const { user, isLoading, logout } = useAuth();
    const [location] = useLocation();

    // Show loading skeleton while auth status is being determined
    if (isLoading) {
        return (
            <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/80 backdrop-blur">
                <div className="container flex h-16 max-w-screen-2xl items-center justify-between px-4">
                    <div className="h-8 w-48 bg-muted animate-pulse rounded" />
                </div>
            </header>
        );
    }

    // Only hide navbar if user is explicitly null (not authenticated)
    if (!user) return null;

    return (
        <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60">
            <div className="container flex h-16 max-w-screen-2xl items-center justify-between px-4">
                <div className="flex items-center gap-6">
                    <Link
                        href="/"
                        className="flex items-center gap-2 font-bold text-lg tracking-tight hover:opacity-80 transition-opacity"
                    >
                        <div className="p-1.5 bg-primary/10 rounded-lg border border-primary/20">
                            <Terminal className="h-5 w-5 text-primary" />
                        </div>
                        <span className="hidden md:inline-block">
                            CAMPUS_TRUTH_PROTOCOL
                        </span>
                        <span className="md:hidden">CTP</span>
                    </Link>

                    <nav className="flex items-center gap-1">
                        <Link
                            href="/"
                            className={`text-sm font-medium transition-colors hover:text-primary ${location === "/" ? "text-foreground" : "text-muted-foreground"}`}
                        >
                            Feed
                        </Link>
                    </nav>
                </div>

                <div className="flex items-center gap-4">
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button
                                variant="ghost"
                                className="relative h-9 w-9 rounded-full ring-1 ring-border hover:ring-primary/50 transition-all"
                            >
                                <Avatar className="h-9 w-9">
                                    <AvatarImage
                                        src={user?.profileImageUrl || undefined}
                                        alt={user?.firstName || "User"}
                                    />
                                    <AvatarFallback className="bg-primary/10 text-primary text-xs font-mono font-bold">
                                        {user?.firstName?.[0] ||
                                            user?.id?.[0]?.toUpperCase() ||
                                            "U"}
                                        {user?.lastName?.[0] ||
                                            user?.id?.[1]?.toUpperCase() ||
                                            ""}
                                    </AvatarFallback>
                                </Avatar>
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent
                            align="end"
                            className="w-56 font-mono text-xs"
                        >
                            <DropdownMenuLabel>
                                <div className="flex flex-col space-y-1">
                                    <p className="font-medium leading-none font-sans text-sm">
                                        {user?.firstName && user?.lastName
                                            ? `${user.firstName} ${user.lastName}`
                                            : `User: ${user?.id || "Unknown"}`}
                                    </p>
                                    <p className="text-xs leading-none text-muted-foreground">
                                        {user?.email || "Anonymous Session"}
                                    </p>
                                </div>
                            </DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                                onClick={() => logout()}
                                className="text-destructive focus:text-destructive cursor-pointer"
                            >
                                <LogOut className="mr-2 h-4 w-4" />
                                Disconnect Session
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>

                    {/* Mobile logout button */}
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => logout()}
                        className="md:hidden text-muted-foreground hover:text-destructive"
                        title="Logout"
                    >
                        <LogOut className="h-5 w-5" />
                    </Button>
                </div>
            </div>
        </header>
    );
}
