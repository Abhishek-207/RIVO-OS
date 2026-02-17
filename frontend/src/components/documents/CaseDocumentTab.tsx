/**
 * CaseDocumentTab - Document tab for Case side panel.
 * Clean, minimal design with inline uploads for bank forms.
 */

import { useState, useCallback } from 'react'
import { Loader2, AlertCircle } from 'lucide-react'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { DocumentChecklist } from './DocumentChecklist'
import { DocumentPreviewPanel } from './DocumentPreviewPanel'
import {
  useCaseDocuments,
  useUploadCaseDocument,
  useDeleteCaseDocument,
  useCreateDocumentType,
  useDeleteDocumentType,
  useUploadFile,
} from '@/hooks/useDocuments'
import { useAuth } from '@/contexts/AuthContext'
import type {
  ClientDocument,
  CaseDocument,
} from '@/types/documents'

interface CaseDocumentTabProps {
  caseId: string
}

export function CaseDocumentTab({ caseId }: CaseDocumentTabProps) {
  const { can } = useAuth()
  const isReadOnly = !can('update', 'cases')
  const { data: checklist, isLoading, error, refetch } = useCaseDocuments(caseId)
  const uploadFileMutation = useUploadFile()
  const uploadMutation = useUploadCaseDocument()
  const deleteMutation = useDeleteCaseDocument()
  const deleteTypeMutation = useDeleteDocumentType()
  const createTypeMutation = useCreateDocumentType()

  const [previewDoc, setPreviewDoc] = useState<ClientDocument | CaseDocument | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null)

  const clearError = useCallback(() => setActionError(null), [])

  const showError = useCallback((message: string) => {
    setActionError(message)
    setTimeout(clearError, 5000)
  }, [clearError])

  const handleUpload = useCallback(async (documentTypeId: string, file: File) => {
    try {
      const uploadResult = await uploadFileMutation.mutateAsync({
        file,
        folder: `cases/${caseId}`,
      })

      await uploadMutation.mutateAsync({
        caseId,
        data: {
          document_type_id: documentTypeId,
          file_url: uploadResult.url,
          file_name: uploadResult.file_name,
          file_size: uploadResult.file_size,
          file_format: uploadResult.file_format,
          applicant_role: 'primary',
          uploaded_via: 'web',
        },
      })
      await refetch()
    } catch (err) {
      showError(err instanceof Error ? err.message : 'Upload failed')
    }
  }, [caseId, uploadFileMutation, uploadMutation, refetch, showError])

  const handleAddCustomDocument = useCallback(async (name: string, file: File) => {
    try {
      const newType = await createTypeMutation.mutateAsync({
        name,
        level: 'case',
        required: false,
      })
      await handleUpload(newType.id, file)
    } catch (err) {
      showError(err instanceof Error ? err.message : 'Failed to add document')
    }
  }, [createTypeMutation, handleUpload, showError])

  const handleDelete = useCallback((documentId: string) => {
    setPendingDeleteId(documentId)
  }, [])

  const confirmDelete = useCallback(async () => {
    if (!pendingDeleteId) return
    try {
      const allItems = [...(checklist?.primary || []), ...(checklist?.co_applicant || [])]
      const item = allItems.find(i => i.documents.some(d => d.id === pendingDeleteId))
      const documentTypeId = item?.document_type.id
      const isCustomType = item?.document_type && !item.document_type.is_system

      await deleteMutation.mutateAsync({ caseId, documentId: pendingDeleteId })

      if (isCustomType && documentTypeId) {
        await deleteTypeMutation.mutateAsync(documentTypeId)
      }

      await refetch()
    } catch (err) {
      showError(err instanceof Error ? err.message : 'Failed to delete')
    } finally {
      setPendingDeleteId(null)
    }
  }, [pendingDeleteId, caseId, checklist, deleteMutation, deleteTypeMutation, refetch, showError])

  const handleView = useCallback((document: ClientDocument | CaseDocument) => {
    setPreviewDoc(prev => prev?.id === document.id ? null : document)
  }, [])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-32">
        <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-32 gap-2">
        <AlertCircle className="h-6 w-6 text-red-400" />
        <p className="text-sm text-gray-500">Failed to load documents</p>
        <button onClick={() => refetch()} className="text-xs text-[#1e3a5f] hover:underline">
          Retry
        </button>
      </div>
    )
  }

  return (
    <div>
      {actionError && (
        <div className="mb-3 p-2 bg-red-50 border border-red-100 rounded text-red-600 text-xs flex items-center gap-2">
          <AlertCircle className="h-3.5 w-3.5 flex-shrink-0" />
          {actionError}
        </div>
      )}

      <DocumentChecklist
        items={checklist?.primary || []}
        onUpload={handleUpload}
        onView={handleView}
        onDelete={handleDelete}
        onAddCustomDocument={handleAddCustomDocument}
        title="Bank Forms"
        addButtonLabel="Add Bank Form"
        readOnly={isReadOnly}
      />

      {previewDoc && (
        <DocumentPreviewPanel
          document={previewDoc}
          isOpen={true}
          onClose={() => setPreviewDoc(null)}
        />
      )}

      <ConfirmDialog
        open={!!pendingDeleteId}
        title="Delete Document"
        message="Are you sure you want to delete this document?"
        loading={deleteMutation.isPending}
        onConfirm={confirmDelete}
        onCancel={() => setPendingDeleteId(null)}
      />
    </div>
  )
}
