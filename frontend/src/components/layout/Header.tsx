import { Menu } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { useLayout } from '@/contexts/LayoutContext'

export function Header() {
  const { user, logout } = useAuth()
  const { toggleSidebar, isMobile } = useLayout()

  const userInitials = user?.name
    ? user.name.slice(0, 2).toUpperCase()
    : 'U'

  return (
    <header className="h-14 bg-white flex items-center justify-between px-4">
      {/* Left side - Mobile hamburger */}
      <div className="flex items-center">
        {isMobile && (
          <button
            onClick={toggleSidebar}
            className="p-2 -ml-2 rounded-lg hover:bg-gray-50 transition-colors"
            aria-label="Toggle navigation menu"
          >
            <Menu className="h-5 w-5 text-gray-500" />
          </button>
        )}
      </div>

      {/* Right side - User */}
      <div className="flex items-center">
        {/* User dropdown */}
        <div className="relative group">
          <button className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-gray-50 transition-colors">
            <div className="flex items-center justify-center w-8 h-8 rounded-full bg-[#1e3a5f] text-white text-sm font-medium">
              {userInitials}
            </div>
            {user && (
              <span className="text-sm font-medium text-gray-700 hidden sm:block">
                {user.name}
              </span>
            )}
            <svg className="h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          {/* Dropdown menu */}
          <div className="absolute right-0 top-full mt-1 w-48 bg-white rounded-lg shadow-lg border border-gray-100 py-1 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50">
            {user && (
              <div className="px-4 py-3 border-b border-gray-100">
                <p className="text-sm font-medium text-gray-900">{user.name}</p>
                <p className="text-xs text-gray-400 capitalize mt-0.5">{user.role.replace('_', ' ')}</p>
              </div>
            )}
            <button
              onClick={logout}
              className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
            >
              Logout
            </button>
          </div>
        </div>
      </div>
    </header>
  )
}
