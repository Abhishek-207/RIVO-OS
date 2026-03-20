/**
 * SetPasswordPage - Allows invited users to set their password via a secure token link.
 *
 * Route: /set-password?token=XYZ
 */

import { useState } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { Eye, EyeOff, Check, AlertCircle, Loader2 } from 'lucide-react'
import { api, extractApiError } from '@/lib/api'

export function SetPasswordPage() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const token = searchParams.get('token') || ''

  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [success, setSuccess] = useState(false)

  const passwordValid = password.length >= 8
  const passwordsMatch = password === confirmPassword && confirmPassword.length > 0

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!token) {
      setError('Invalid link. No token found. Please check your email for the correct link.')
      return
    }

    if (password.length < 8) {
      setError('Password must be at least 8 characters')
      return
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match')
      return
    }

    setIsLoading(true)

    try {
      await api.post('/auth/set-password', {
        token,
        password,
        confirm_password: confirmPassword,
      })
      setSuccess(true)
      setTimeout(() => navigate('/login'), 2000)
    } catch (err) {
      setError(extractApiError(err, 'Failed to set password. The link may have expired.'))
    } finally {
      setIsLoading(false)
    }
  }

  if (!token) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <div className="w-full max-w-md bg-white rounded-xl shadow-sm border border-gray-100 p-8 text-center">
          <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="h-6 w-6 text-red-600" />
          </div>
          <h1 className="text-lg font-semibold text-gray-900 mb-2">Invalid Link</h1>
          <p className="text-sm text-gray-500 mb-6">
            This link is missing the required token. Please check your email for the correct invitation link,
            or contact your admin to resend the invite.
          </p>
          <button
            onClick={() => navigate('/login')}
            className="px-4 py-2 text-sm bg-[#1e3a5f] text-white rounded-lg hover:bg-[#0f2744] transition-colors"
          >
            Go to Login
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex">
      {/* Left Panel - Form */}
      <div className="flex-1 flex items-center justify-center p-8 bg-white">
        <div className="w-full max-w-md space-y-6">
          {/* Logo */}
          <div className="flex items-center mb-8">
            <img src="/rivo-logo.png" alt="Rivo" className="h-10" />
          </div>

          {success ? (
            /* Success State */
            <div className="text-center space-y-4">
              <div className="w-14 h-14 rounded-full bg-green-100 flex items-center justify-center mx-auto">
                <Check className="h-7 w-7 text-green-600" />
              </div>
              <div>
                <h1 className="text-xl font-semibold text-gray-900">Password Set Successfully</h1>
                <p className="text-sm text-gray-500 mt-1">
                  Redirecting to login...
                </p>
              </div>
            </div>
          ) : (
            /* Form State */
            <>
              <div className="space-y-1">
                <h1 className="text-xl font-semibold text-gray-900">Set Your Password</h1>
                <p className="text-sm text-gray-500">
                  Create a secure password for your Rivo OS account
                </p>
              </div>

              {error && (
                <div className="p-4 bg-red-50 border border-red-100 rounded-lg text-red-600 text-sm flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 flex-shrink-0" />
                  <p>{error}</p>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-5">
                {/* New Password */}
                <div>
                  <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1.5">
                    New Password
                  </label>
                  <div className="relative">
                    <input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Minimum 8 characters"
                      className="w-full h-11 px-4 pr-12 bg-gray-50 border border-gray-200 rounded-lg text-gray-900
                               placeholder:text-gray-400 focus:outline-none focus:bg-white transition-all"
                      required
                      minLength={8}
                      autoComplete="new-password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                    >
                      {showPassword ? <Eye className="h-5 w-5" /> : <EyeOff className="h-5 w-5" />}
                    </button>
                  </div>
                  {/* Password strength indicator */}
                  {password && (
                    <div className="mt-2 space-y-1">
                      <div className={`flex items-center gap-1.5 text-xs ${passwordValid ? 'text-green-600' : 'text-gray-400'}`}>
                        {passwordValid ? <Check className="h-3 w-3" /> : <span className="h-3 w-3 rounded-full border border-gray-300 inline-block" />}
                        At least 8 characters
                      </div>
                    </div>
                  )}
                </div>

                {/* Confirm Password */}
                <div>
                  <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-1.5">
                    Confirm Password
                  </label>
                  <div className="relative">
                    <input
                      id="confirmPassword"
                      type={showConfirmPassword ? 'text' : 'password'}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Repeat your password"
                      className="w-full h-11 px-4 pr-12 bg-gray-50 border border-gray-200 rounded-lg text-gray-900
                               placeholder:text-gray-400 focus:outline-none focus:bg-white transition-all"
                      required
                      minLength={8}
                      autoComplete="new-password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                    >
                      {showConfirmPassword ? <Eye className="h-5 w-5" /> : <EyeOff className="h-5 w-5" />}
                    </button>
                  </div>
                  {confirmPassword && (
                    <div className={`flex items-center gap-1.5 text-xs mt-2 ${passwordsMatch ? 'text-green-600' : 'text-red-500'}`}>
                      {passwordsMatch ? <Check className="h-3 w-3" /> : <AlertCircle className="h-3 w-3" />}
                      {passwordsMatch ? 'Passwords match' : 'Passwords do not match'}
                    </div>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={isLoading || !passwordValid || !passwordsMatch}
                  className="w-full h-11 bg-[#1e3a5f] hover:bg-[#0f2744] text-white font-medium rounded-lg
                           transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isLoading ? (
                    <span className="flex items-center justify-center gap-2">
                      <Loader2 className="h-5 w-5 animate-spin" />
                      Setting password...
                    </span>
                  ) : (
                    'Set Password'
                  )}
                </button>
              </form>
            </>
          )}
        </div>
      </div>

      {/* Right Panel - Navy Blue Branded */}
      <div className="hidden lg:flex flex-1 bg-[#1e3a5f] items-center justify-center relative overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute inset-0" style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.4'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
          }} />
        </div>
        <div className="absolute inset-0 bg-gradient-to-br from-[#2d4a6f]/30 to-[#0f2744]/50" />
      </div>
    </div>
  )
}
