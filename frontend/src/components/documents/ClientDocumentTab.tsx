/**
 * ClientDocumentTab - Document tab for Client side panel.
 * Clean, minimal design with inline uploads.
 */

import { useState, useCallback } from 'react'
import { Loader2, AlertCircle } from 'lucide-react'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { DocumentChecklist } from './DocumentChecklist'
import { JointApplicationChecklist } from './JointApplicationChecklist'
import { DocumentPreviewPanel } from './DocumentPreviewPanel'
import {
  useClientDocuments,
  useUploadClientDocument,
  useDeleteClientDocument,
  useCreateDocumentType,
  useUploadFile,
} from '@/hooks/useDocuments'
import { useAuth } from '@/contexts/AuthContext'
import type {
  ClientDocument,
  CaseDocument,
  ApplicantRole,
} from '@/types/documents'

interface ClientDocumentTabProps {
  clientId: string
}

export function ClientDocumentTab({ clientId }: ClientDocumentTabProps) {
  const { can } = useAuth()
  const isReadOnly = !can('update', 'clients')
  const { data: checklist, isLoading, error, refetch } = useClientDocuments(clientId)
  const uploadFileMutation = useUploadFile()
  const uploadMutation = useUploadClientDocument()
  const deleteMutation = useDeleteClientDocument()
  const createTypeMutation = useCreateDocumentType()

  const [currentApplicantRole, setCurrentApplicantRole] = useState<ApplicantRole>('primary')
  const [previewDoc, setPreviewDoc] = useState<ClientDocument | CaseDocument | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null)

  const clearError = useCallback(() => setActionError(null), [])

  const showError = useCallback((message: string) => {
    setActionError(message)
    setTimeout(clearError, 5000)
  }, [clearError])

  const handleUpload = useCallback(async (documentTypeId: string, file: File, applicantRole?: ApplicantRole) => {
    const role = applicantRole || currentApplicantRole
    try {
      const uploadResult = await uploadFileMutation.mutateAsync({
        file,
        folder: `clients/${clientId}`,
      })

      await uploadMutation.mutateAsync({
        clientId,
        data: {
          document_type_id: documentTypeId,
          file_url: uploadResult.url,
          file_name: uploadResult.file_name,
          file_size: uploadResult.file_size,
          file_format: uploadResult.file_format,
          applicant_role: role,
          uploaded_via: 'web',
        },
      })
      await refetch()
    } catch (err) {
      showError(err instanceof Error ? err.message : 'Upload failed')
    }
  }, [clientId, currentApplicantRole, uploadFileMutation, uploadMutation, refetch, showError])

  const handleAddCustomDocument = useCallback(async (name: string, file: File, applicantRole?: ApplicantRole) => {
    const role = applicantRole || currentApplicantRole
    try {
      // Create client-specific custom document type (linked to this client)
      const newType = await createTypeMutation.mutateAsync({
        name,
        level: 'client',
        required: false,
        applicant_type: role === 'co_applicant' ? 'co_applicant' : 'primary',
        client_id: clientId,  // Link to this specific client
      })
      await handleUpload(newType.id, file, role)
    } catch (err) {
      showError(err instanceof Error ? err.message : 'Failed to add document')
    }
  }, [clientId, currentApplicantRole, createTypeMutation, handleUpload, showError])

  const handleDelete = useCallback((documentId: string) => {
    setPendingDeleteId(documentId)
  }, [])

  const confirmDelete = useCallback(async () => {
    if (!pendingDeleteId) return
    try {
      await deleteMutation.mutateAsync({ clientId, documentId: pendingDeleteId })
      await refetch()
    } catch (err) {
      showError(err instanceof Error ? err.message : 'Failed to delete')
    } finally {
      setPendingDeleteId(null)
    }
  }, [pendingDeleteId, clientId, deleteMutation, refetch, showError])

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

      {checklist?.is_joint_application ? (
        <JointApplicationChecklist
          primaryItems={[...(checklist.primary || []), ...(checklist.conditional || []), ...(checklist.custom || [])]}
          coApplicantItems={checklist.co_applicant || []}
          onUpload={(docTypeId, file, role) => handleUpload(docTypeId, file, role)}
          onView={handleView}
          onDelete={handleDelete}
          onAddCustomDocument={(name, file, role) => {
            setCurrentApplicantRole(role)
            handleAddCustomDocument(name, file, role)
          }}
          addButtonLabel="Add Document"
          readOnly={isReadOnly}
        />
      ) : (
        <DocumentChecklist
          items={[...(checklist?.primary || []), ...(checklist?.conditional || []), ...(checklist?.custom || [])]}
          onUpload={handleUpload}
          onView={handleView}
          onDelete={handleDelete}
          onAddCustomDocument={handleAddCustomDocument}
          title="Documents"
          addButtonLabel="Add Document"
          readOnly={isReadOnly}
        />
      )}

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
