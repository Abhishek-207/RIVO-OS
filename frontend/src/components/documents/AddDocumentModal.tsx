/**
 * AddDocumentModal - Modal for selecting document type to add.
 * Allows selecting from existing types or entering a custom name.
 */

import { useState } from 'react'
import { X, Plus, FileText } from 'lucide-react'
import type { DocumentType, DocumentLevel } from '@/types/documents'

interface AddDocumentModalProps {
  isOpen: boolean
  onClose: () => void
  documentTypes: DocumentType[]
  onSelect: (documentTypeId: string) => void
  onCreateCustom: (name: string) => void
  level: DocumentLevel
  title?: string
}

export function AddDocumentModal({
  isOpen,
  onClose,
  documentTypes,
  onSelect,
  onCreateCustom,
  level,
  title = 'Add Document',
}: AddDocumentModalProps) {
  const [showCustomInput, setShowCustomInput] = useState(false)
  const [customName, setCustomName] = useState('')
  const [error, setError] = useState<string | null>(null)

  if (!isOpen) return null

  const handleSelectType = (docType: DocumentType) => {
    onSelect(docType.id)
    handleClose()
  }

  const handleCreateCustom = () => {
    if (!customName.trim()) {
      setError('Document name is required')
      return
    }

    // Check for duplicate names
    const exists = documentTypes.some(
      (dt) => dt.name.toLowerCase() === customName.trim().toLowerCase()
    )
    if (exists) {
      setError('A document type with this name already exists')
      return
    }

    onCreateCustom(customName.trim())
    handleClose()
  }

  const handleClose = () => {
    setShowCustomInput(false)
    setCustomName('')
    setError(null)
    onClose()
  }

  // Filter to show only document types that haven't been uploaded yet
  // (This is handled by the parent, we just show all available types)
  const availableTypes = documentTypes.filter((dt) => dt.level === level)

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/50 z-50" onClick={handleClose} />

      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div
          className="bg-white rounded-xl shadow-xl w-full max-w-md max-h-[80vh] flex flex-col"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
            <button
              onClick={handleClose}
              className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-4">
            {showCustomInput ? (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Document Name
                  </label>
                  <input
                    type="text"
                    value={customName}
                    onChange={(e) => {
                      setCustomName(e.target.value)
                      setError(null)
                    }}
                    placeholder="Enter document name..."
                    autoFocus
                    className="w-full h-10 px-3 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-[#1e3a5f]"
                  />
                  {error && (
                    <p className="mt-1 text-xs text-red-600">{error}</p>
                  )}
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => setShowCustomInput(false)}
                    className="flex-1 py-2 text-sm font-medium text-gray-700 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    Back
                  </button>
                  <button
                    onClick={handleCreateCustom}
                    className="flex-1 py-2 text-sm font-medium text-white bg-[#1e3a5f] rounded-lg hover:bg-[#2d4a6f] transition-colors"
                  >
                    Create & Upload
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                {availableTypes.map((docType) => (
                  <button
                    key={docType.id}
                    onClick={() => handleSelectType(docType)}
                    className="w-full flex items-center gap-3 p-3 text-left rounded-lg border border-gray-200 hover:bg-gray-50 hover:border-gray-300 transition-all"
                  >
                    <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center flex-shrink-0">
                      <FileText className="h-4 w-4 text-gray-500" />
                    </div>
                    <div className="min-w-0">
                      <span className="text-sm font-medium text-gray-900 truncate block">
                        {docType.name}
                      </span>
                      {docType.description && (
                        <span className="text-xs text-gray-500 truncate block">
                          {docType.description}
                        </span>
                      )}
                    </div>
                    {docType.required && (
                      <span className="ml-auto px-1.5 py-0.5 text-[10px] font-semibold uppercase bg-red-100 text-red-700 rounded flex-shrink-0">
                        Required
                      </span>
                    )}
                  </button>
                ))}

                {/* Custom document option */}
                <button
                  onClick={() => setShowCustomInput(true)}
                  className="w-full flex items-center gap-3 p-3 text-left rounded-lg border border-dashed border-[#1e3a5f] hover:bg-[#1e3a5f]/5 transition-all"
                >
                  <div className="w-8 h-8 rounded-lg bg-[#1e3a5f]/10 flex items-center justify-center flex-shrink-0">
                    <Plus className="h-4 w-4 text-[#1e3a5f]" />
                  </div>
                  <span className="text-sm font-medium text-[#1e3a5f]">
                    Add Custom Document
                  </span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  )
}
