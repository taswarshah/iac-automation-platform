import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { PenTool, Mail, Lock, ArrowRight, Sparkles } from 'lucide-react'
import { useAppStore } from '@/stores'

export default function Login() {
  const navigate = useNavigate()
  const { login, isAuthenticated } = useAppStore()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [rememberMe, setRememberMe] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [_error, setError] = useState('')

  useEffect(() => {
    const token = localStorage.getItem('token')
    if (isAuthenticated || token) {
      navigate('/dashboard')
    }
  }, [isAuthenticated, navigate])

  useEffect(() => {
    const savedEmail = localStorage.getItem('remember_email')
    const savedPassword = localStorage.getItem('remember_password')
    if (savedEmail && savedPassword) {
      setEmail(savedEmail)
      setPassword(savedPassword)
      setRememberMe(true)
    }
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError('')
    
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      })
      
      const data = await response.json()
      
      if (!response.ok) {
        setError(data.error || 'Login failed')
        setIsLoading(false)
        return
      }

      if (rememberMe) {
        localStorage.setItem('remember_email', email)
        localStorage.setItem('remember_password', password)
      } else {
        localStorage.removeItem('remember_email')
        localStorage.removeItem('remember_password')
      }
      
      login({
        id: data.user.id,
        email: data.user.email,
        name: data.user.name,
        organizationId: data.user.organizationId,
        organizationName: data.user.organizationName,
        role: data.user.role
      })
      
      localStorage.setItem('token', data.token)
      localStorage.setItem('user', JSON.stringify(data.user))
      
      navigate('/dashboard')
    } catch (err) {
      setError('Failed to connect to server')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex">
      {/* Left Side - Animated Background */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-accent-purple/20" />
        
        {/* Animated shapes */}
        <div className="absolute top-20 left-20 w-72 h-72 bg-primary/30 rounded-full blur-3xl animate-float" />
        <div className="absolute bottom-20 right-20 w-96 h-96 bg-accent-purple/20 rounded-full blur-3xl animate-float" style={{ animationDelay: '2s' }} />
        <div className="absolute top-1/2 left-1/2 w-64 h-64 bg-accent-cyan/20 rounded-full blur-3xl animate-float" style={{ animationDelay: '4s' }} />
        
        {/* Grid pattern */}
        <div className="absolute inset-0" style={{ 
          backgroundImage: `linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px),
                           linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px)`,
          backgroundSize: '50px 50px'
        }} />
        
        <div className="relative z-10 p-12 flex flex-col justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-gradient-to-br from-primary to-accent-purple rounded-xl flex items-center justify-center shadow-glow">
              <PenTool className="w-7 h-7 text-white" />
            </div>
            <span className="text-2xl font-bold text-white">IaC Platform</span>
          </div>
          
          <div>
            <h1 className="text-5xl font-bold text-white mb-6 leading-tight">
              Visual Infrastructure
              <span className="block text-transparent bg-clip-text bg-gradient-to-r from-primary to-accent-purple">
                Automation
              </span>
            </h1>
            <p className="text-slate-300 text-lg max-w-md">
              Design, generate, and deploy your cloud infrastructure with our visual editor.
              No coding required.
            </p>
            
            <div className="mt-8 flex items-center gap-4">
              <div className="flex -space-x-3">
                {[1,2,3,4,5].map((i) => (
                  <div key={i} className={`w-10 h-10 rounded-full border-2 border-slate-900 bg-gradient-to-br from-slate-${200+i*100} to-slate-${300+i*100} flex items-center justify-center text-white text-sm font-medium`}>
                    {String.fromCharCode(64 + i)}
                  </div>
                ))}
              </div>
              <span className="text-slate-400">Trusted by 500+ companies</span>
            </div>
          </div>
          
          <div className="flex items-center gap-6 text-slate-400 text-sm">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-accent-emerald" />
              <span>Free Tier</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 bg-accent-emerald rounded-full" />
              <span>No credit card</span>
            </div>
          </div>
        </div>
      </div>

      {/* Right Side - Login Form */}
      <div className="flex-1 flex items-center justify-center p-8 bg-white/5 backdrop-blur-sm">
        <div className="w-full max-w-md">
          <div className="lg:hidden flex items-center gap-3 mb-8">
            <div className="w-10 h-10 bg-gradient-to-br from-primary to-accent-purple rounded-xl flex items-center justify-center">
              <PenTool className="w-6 h-6 text-white" />
            </div>
            <span className="text-xl font-bold text-white">IaC Platform</span>
          </div>

          <div className="glass-dark rounded-3xl p-8 border border-white/10">
            <h2 className="text-3xl font-bold text-white mb-2">Welcome back</h2>
            <p className="text-slate-400 mb-8">Sign in to continue to your account</p>

            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    className="w-full pl-12 pr-4 py-3.5 bg-slate-800/50 border border-slate-600 rounded-xl text-white placeholder:text-slate-500 focus:ring-2 focus:ring-primary/50 focus:border-primary outline-none transition-all"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-12 pr-4 py-3.5 bg-slate-800/50 border border-slate-600 rounded-xl text-white placeholder:text-slate-500 focus:ring-2 focus:ring-primary/50 focus:border-primary outline-none transition-all"
                    required
                  />
                </div>
              </div>

              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="w-4 h-4 rounded border-slate-600 bg-slate-800 text-primary focus:ring-primary/50"
                  />
                  <span className="text-sm text-slate-400">Remember me</span>
                </label>
                <a href="#" className="text-sm text-primary hover:text-primary/80 transition-colors">
                  Forgot password?
                </a>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full flex items-center justify-center gap-2 py-3.5 bg-gradient-to-r from-primary to-accent-purple text-white rounded-xl font-medium hover:shadow-glow hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 disabled:opacity-50"
              >
                {isLoading ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    Sign In
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>

            <p className="mt-8 text-center text-sm text-slate-400">
              Don't have an account?{' '}
              <Link to="/register" className="text-primary font-medium hover:text-primary/80 transition-colors">
                Sign up for free
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
