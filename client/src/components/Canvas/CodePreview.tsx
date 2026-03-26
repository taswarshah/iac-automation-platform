import { useState } from 'react'
import { X, Copy, CheckCircle, AlertTriangle, XCircle, Download, FileCode, Zap } from 'lucide-react'
import type { IaCType } from '@/types'

interface CodePreviewProps {
  code: string
  errors: string[]
  warnings: string[]
  onClose: () => void
  iaType: IaCType
}

export default function CodePreview({ code, errors, warnings, onClose, iaType }: CodePreviewProps) {
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    await navigator.clipboard.writeText(code)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleDownload = () => {
    const extension = iaType === 'terraform' ? 'tf' : 'yaml'
    const blob = new Blob([code], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `main.${extension}`
    a.click()
    URL.revokeObjectURL(url)
  }

  const lineCount = code.split('\n').length
  const hasIssues = errors.length > 0 || warnings.length > 0

  return (
    <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="glass-dark rounded-2xl w-full max-w-5xl max-h-[90vh] flex flex-col border border-white/10 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 bg-gradient-to-br from-primary to-accent-purple rounded-xl flex items-center justify-center shadow-glow">
              <FileCode className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="font-semibold text-white text-lg">Generated Code</h3>
              <p className="text-sm text-slate-400">{lineCount} lines</p>
            </div>
            <span className="px-3 py-1.5 bg-gradient-to-r from-primary to-accent-purple text-white text-xs font-medium rounded-lg">
              {iaType.toUpperCase()}
            </span>
          </div>
          <button
            onClick={onClose}
            className="p-2.5 text-slate-400 hover:text-white hover:bg-white/10 rounded-xl transition-all"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Validation Results */}
        {hasIssues && (
          <div className="px-6 py-4 border-b border-white/10 space-y-2">
            {errors.map((error, i) => (
              <div key={i} className="flex items-center gap-3 text-sm text-red-400 bg-red-500/10 px-4 py-2.5 rounded-xl">
                <XCircle className="w-4 h-4 flex-shrink-0" />
                {error}
              </div>
            ))}
            {warnings.map((warning, i) => (
              <div key={i} className="flex items-center gap-3 text-sm text-amber-400 bg-amber-500/10 px-4 py-2.5 rounded-xl">
                <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                {warning}
              </div>
            ))}
            {errors.length === 0 && warnings.length === 0 && (
              <div className="flex items-center gap-3 text-sm text-emerald-400 bg-emerald-500/10 px-4 py-2.5 rounded-xl">
                <CheckCircle className="w-4 h-4" />
                Validation passed
              </div>
            )}
          </div>
        )}

        {/* Code */}
        <div className="flex-1 overflow-auto bg-slate-950/50 p-4">
          <pre className="code-preview text-slate-200 whitespace-pre-wrap leading-relaxed">{code}</pre>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-white/10">
          <div className="flex items-center gap-2 text-sm text-slate-400">
            <Zap className="w-4 h-4 text-accent-amber" />
            Ready to deploy
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={handleCopy}
              className="flex items-center gap-2 px-5 py-2.5 text-sm font-medium text-slate-300 hover:text-white hover:bg-white/10 rounded-xl transition-all"
            >
              {copied ? (
                <>
                  <CheckCircle className="w-4 h-4 text-emerald-400" />
                  <span className="text-emerald-400">Copied!</span>
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4" />
                  Copy Code
                </>
              )}
            </button>
            <button
              onClick={handleDownload}
              className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-primary to-accent-purple text-white text-sm font-medium rounded-xl hover:shadow-glow transition-all"
            >
              <Download className="w-4 h-4" />
              Download
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
