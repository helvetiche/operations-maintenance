import { User } from "@/types";
import { Button } from "../ui/Button";

interface HeaderProps {
  user: User;
  onSignOut: () => void;
  isLoading?: boolean;
}

export const Header = ({ user, onSignOut, isLoading = false }: HeaderProps) => {
  return (
    <header className="border-b border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
        <div>
          <h1 className="text-xl font-regular text-black dark:text-zinc-50">
            NIA Reminder Console
          </h1>
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            Operation and Maintenance Management
          </p>
        </div>
        <div className="flex items-center gap-4">
          {user.photoURL && (
            <img
              src={user.photoURL}
              alt={user.displayName || "Profile"}
              className="h-10 w-10 rounded-full"
            />
          )}
          <div className="text-right">
            <div className="text-sm font-medium text-black dark:text-zinc-50">
              {user.displayName || user.email}
            </div>
            <div className="text-xs text-zinc-600 dark:text-zinc-400">
              {user.email}
            </div>
          </div>
          <Button variant="danger" onClick={onSignOut} disabled={isLoading}>
            Sign Out
          </Button>
        </div>
      </div>
    </header>
  );
};
